import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
// @ts-ignore - y-websocket doesn't have type definitions
import { setupWSConnection } from 'y-websocket/bin/utils';
import { JWTService, JWTPayload } from '../services/jwt.service';

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

export function initializeWebSocketServer(server: any) {
  const wss = new WebSocketServer({
    noServer: true,
  });

  // Handle WebSocket upgrade with auth
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname !== '/collaboration') {
      // Not our path — let other upgrade handlers (if any) process it.
      return;
    }

    // 1. Verify JWT
    const payload = verifyUpgradeToken(request);
    if (!payload) {
      rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }

    // 2. Verify the claimed userId in the URL matches the JWT subject so
    //    awareness/presence cannot be spoofed.
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const claimedUserId = url.searchParams.get('userId') || '';
    if (!claimedUserId || claimedUserId !== payload.userId) {
      rejectUpgrade(socket, 403, 'Forbidden');
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

    // y-websocket handles CRDT sync. Auth was enforced in the upgrade handler.
    setupWSConnection(conn, req, { docName, gc: true });

    conn.on('close', () => {
      console.log(`👋 User "${userName}" (${userId}) disconnected from document: ${docName}`);
    });
  });

  console.log(`🔄 Yjs WebSocket collaboration server initialized (JWT-protected)`);
  return wss;
}
