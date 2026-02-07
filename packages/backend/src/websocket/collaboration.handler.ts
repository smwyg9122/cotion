import { IncomingMessage } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

export function initializeWebSocketServer(server: any) {
  const wss = new WebSocketServer({
    noServer: true,
  });

  // Handle WebSocket upgrade
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    // Check if this is a collaboration WebSocket request
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname === '/collaboration') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (conn, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const docName = url.searchParams.get('doc') || 'default';
    const userId = url.searchParams.get('userId') || 'anonymous';
    const userName = decodeURIComponent(url.searchParams.get('userName') || 'Anonymous');

    console.log(`📡 User "${userName}" (${userId}) connected to document: ${docName}`);

    // Setup WebSocket connection with y-websocket
    // This handles all the CRDT synchronization automatically
    setupWSConnection(conn, req, { docName, gc: true });

    conn.on('close', () => {
      console.log(`👋 User "${userName}" (${userId}) disconnected from document: ${docName}`);
    });
  });

  console.log(`🔄 Yjs WebSocket collaboration server initialized`);
  return wss;
}
