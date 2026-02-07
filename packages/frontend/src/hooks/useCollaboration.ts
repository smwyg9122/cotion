import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

interface UseCollaborationProps {
  pageId: string;
  userId: string;
  userName: string;
  enabled: boolean;
}

export function useCollaboration({ pageId, userId, userName, enabled }: UseCollaborationProps) {
  const [doc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    if (!enabled || !pageId) {
      return;
    }

    // Create WebSocket provider
    const wsProvider = new WebsocketProvider(
      WS_URL,
      `page-${pageId}`,
      doc,
      {
        params: {
          userId,
          userName: encodeURIComponent(userName),
        },
      }
    );

    wsProvider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
      console.log(`📡 Collaboration status: ${event.status}`);
    });

    // Set user awareness information
    wsProvider.awareness.setLocalStateField('user', {
      name: userName,
      color: generateUserColor(userId),
    });

    // Track active users
    const awarenessChangeHandler = () => {
      setActiveUsers(new Map(wsProvider.awareness.getStates()));
    };

    wsProvider.awareness.on('change', awarenessChangeHandler);

    setProvider(wsProvider);

    // Cleanup
    return () => {
      wsProvider.awareness.off('change', awarenessChangeHandler);
      wsProvider.disconnect();
      setProvider(null);
      setIsConnected(false);
    };
  }, [pageId, userId, userName, enabled, doc]);

  return {
    doc,
    provider,
    isConnected,
    activeUsers,
  };
}

// Generate a consistent color for each user
function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
