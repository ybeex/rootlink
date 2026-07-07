'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_EVENTS } from '@rootlink/shared';
import { getAccessToken } from '../lib/api-client';

const WS_URL = process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:3001';

// WebSocket.OPEN = 1 — use literal to avoid SSR global reference
const WS_OPEN = 1;

interface CollaboratorPresence {
  userId: string;
  hoveredPersonId?: string;
}

interface UseTreeWebSocketOptions {
  treeId:  string;
  enabled?: boolean;
}

export function useTreeWebSocket({ treeId, enabled = true }: UseTreeWebSocketOptions) {
  const wsRef               = useRef<WebSocket | null>(null);
  const queryClient         = useQueryClient();
  const reconnectAttempts   = useRef(0);
  const reconnectTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected]         = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);

  const connect = useCallback(() => {
    // SSR guard: WebSocket is a browser API
    if (typeof window === 'undefined') return;
    if (!enabled || !treeId) return;

    const token = getAccessToken();
    if (!token) return;

    // Don't reconnect if already open or connecting
    if (wsRef.current && (wsRef.current.readyState === WS_OPEN || wsRef.current.readyState === 0)) {
      return;
    }

    const ws = new window.WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setConnected(true);
      ws.send(JSON.stringify({
        event: WS_EVENTS.JOIN_TREE,
        data:  { treeId, token },
      }));
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: { event: string; data: Record<string, unknown> };
      try {
        msg = JSON.parse(event.data) as typeof msg;
      } catch {
        return;
      }

      const { event: wsEvent, data } = msg;

      switch (wsEvent) {
        case WS_EVENTS.PERSON_CREATED:
        case WS_EVENTS.PERSON_UPDATED:
        case WS_EVENTS.PERSON_DELETED:
          void queryClient.invalidateQueries({ queryKey: ['persons', treeId] });
          if (data['personId']) {
            void queryClient.invalidateQueries({ queryKey: ['person', treeId, String(data['personId'])] });
          }
          break;

        case WS_EVENTS.RELATIONSHIP_CREATED:
        case WS_EVENTS.RELATIONSHIP_DELETED:
          void queryClient.invalidateQueries({ queryKey: ['relationships', treeId] });
          break;

        case WS_EVENTS.TREE_UPDATED:
          void queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
          break;

        case WS_EVENTS.COLLABORATOR_JOINED:
          setCollaborators((prev) => {
            const userId = String(data['userId']);
            if (prev.find((c) => c.userId === userId)) return prev;
            return [...prev, { userId }];
          });
          break;

        case WS_EVENTS.COLLABORATOR_LEFT:
          setCollaborators((prev) => prev.filter((c) => c.userId !== String(data['userId'])));
          break;

        case WS_EVENTS.PRESENCE_UPDATE:
          setCollaborators((prev) =>
            prev.map((c) =>
              c.userId === String(data['userId'])
                ? { ...c, hoveredPersonId: data['hoveredPersonId'] as string | undefined }
                : c,
            ),
          );
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;

      if (reconnectAttempts.current < 5) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [treeId, enabled, queryClient]);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        if (wsRef.current.readyState === WS_OPEN) {
          wsRef.current.send(JSON.stringify({ event: WS_EVENTS.LEAVE_TREE, data: {} }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendPresence = useCallback((hoveredPersonId: string | null) => {
    if (typeof window === 'undefined') return;
    if (wsRef.current?.readyState === WS_OPEN) {
      wsRef.current.send(JSON.stringify({
        event: WS_EVENTS.PRESENCE_UPDATE,
        data:  { hoveredPersonId },
      }));
    }
  }, []);

  return { connected, collaborators, sendPresence };
}
