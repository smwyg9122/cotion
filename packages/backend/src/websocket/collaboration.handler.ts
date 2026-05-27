import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
// @ts-ignore - y-websocket doesn't have type definitions
import { setupWSConnection } from 'y-websocket/bin/utils';
import { JWTService, JWTPayload } from '../services/jwt.service';
import { db } from '../database/connection';
import { getUserAccessibleWorkspaces } from '../services/pages.service';
import { ActivityLogService } from '../services/activity-log.service';

/**
 * Verify the JWT carried as `?token=` on the WebSocket upgrade URL.
 * Browsers cannot set custom WS headers, so the token rides in the URL.
 * Returns the verified payload, or null when the token is missing/invalid.
 */
function verifyUpgradeToken(req: IncomingMessage): JWTPayload | null {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) return null;
    return JWTService.verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Reject a WebSocket upgrade with a minimal HTTP response and close the socket.
 */
function rejectUpgrade(socket: any, statusCode: number, reason: string) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${reason}\r\n` +
      'Content-Length: 0\r\n' +
      'Connection: close\r\n' +
      '\r\n'
  );
  socket.destroy();
}

/**
 * The FE sends `doc=page-<uuid>` for page collaboration sessions. Extract
 * the UUID so we can look up `pages.workspace` and verify the connecting
 * user has access to that workspace. Returns null for invalid shapes.
 */
function extractPageIdFromDocName(docName: string): string | null {
  const m = /^page-([0-9a-f-]+)$/i.exec(docName);
  return m ? m[1] : null;
}

/**
 * Resolve the page-scoped collab session's workspace and verify the user
 * is allowed in. Returns:
 *   - { ok: true }                 → session allowed
 *   - { ok: false, status, reason } → reject with that HTTP status
 */
async function authorizeDocAccess(
  userId: string,
  docName: string
): Promise<{ ok: true } | { ok: false; status: number; reason: string }> {
  const pageId = extractPageIdFromDocName(docName);
  if (!pageId) {
    // Unknown doc shape — reject rather than fail open. If a non-page doc
    // shape is ever needed, allowlist it explicitly here.
    return { ok: false, status: 403, reason: 'Forbidden' };
  }

  const page = await db('pages').where({ id: pageId }).select('workspace', 'is_deleted').first();
  if (!page) return { ok: false, status: 404, reason: 'Not Found' };
  if (page.is_deleted) return { ok: false, status: 404, reason: 'Not Found' };

  const allowed = await getUserAccessibleWorkspaces(userId);
  if (allowed === null) return { ok: true }; // superadmin
  if (!allowed.includes(page.workspace)) {
    return { ok: false, status: 403, reason: 'Forbidden' };
  }
  return { ok: true };
}

export function initializeWebSocketServer(server: any) {
  const wss = new WebSocketServer({
    noServer: true,
  });

  // Handle WebSocket upgrade with auth + page→workspace authorization
  server.on('upgrade', async (request: IncomingMessage, socket: any, head: Buffer) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname !== '/collaboration') {
      // Not our path — let other upgrade handlers (if any) process it.
      return;
    }

    // 1. Verify JWT
    const payload = verifyUpgradeToken(request);
    if (!payload) {
      ActivityLogService.security(null, 'ws_unauthorized', { reason: 'no_or_bad_token' });
      rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }

    // 2. Verify the claimed userId in the URL matches the JWT subject so
    //    awareness/presence cannot be spoofed.
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const claimedUserId = url.searchParams.get('userId') || '';
    if (!claimedUserId || claimedUserId !== payload.userId) {
      ActivityLogService.security(payload.userId, 'ws_unauthorized', {
        reason: 'userId_mismatch',
        claimed: claimedUserId,
      });
      rejectUpgrade(socket, 403, 'Forbidden');
      return;
    }

    // 3. Verify the page (`doc=page-UUID`) belongs to a workspace the user
    //    can access. Without this, an authenticated user could join the
    //    collab session for any page if they know its UUID.
    const docName = url.searchParams.get('doc') || '';
    try {
      const auth = await authorizeDocAccess(payload.userId, docName);
      if (!auth.ok) {
        ActivityLogService.security(payload.userId, 'ws_unauthorized', {
          reason: 'workspace_or_doc',
          docName,
          status: auth.status,
        });
        rejectUpgrade(socket, auth.status, auth.reason);
        return;
      }
    } catch (err) {
      console.error('WS doc authorize failed:', err);
      rejectUpgrade(socket, 500, 'Internal Server Error');
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      // Stash verified user for downstream logging/audit.
      (ws as any).user = payload;
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (conn: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const docName = url.searchParams.get('doc') || 'default';
    const userId = url.searchParams.get('userId') || 'anonymous';
    const userName = decodeURIComponent(url.searchParams.get('userName') || 'Anonymous');

    console.log(`📡 User "${userName}" (${userId}) connected to document: ${docName}`);

    // y-websocket handles CRDT sync. Auth + workspace access enforced above.
    setupWSConnection(conn, req, { docName, gc: true });

    conn.on('close', () => {
      console.log(`👋 User "${userName}" (${userId}) disconnected from document: ${docName}`);
    });
  });

  console.log(`🔄 Yjs WebSocket collaboration server initialized (JWT + workspace-protected)`);
  return wss;
}
