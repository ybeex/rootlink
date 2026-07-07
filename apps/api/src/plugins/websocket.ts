import type { FastifyInstance } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { verify } from 'jsonwebtoken';
import { getTreePermission } from '../middleware/auth.js';
import { getRedis } from '../lib/redis.js';
import { env } from '../config/env.js';
import { WS_EVENTS } from '@rootlink/shared';
import pino from 'pino';

const logger = pino({ name: 'websocket' });

interface JwtPayload {
  sub: string;
  email: string;
  tier: string;
  iss: string;
}

function verifyToken(token: string): JwtPayload {
  return verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
}

// ── Connected client registry ─────────────────────────────────────────────

interface ClientMeta {
  ws:     WebSocket;
  userId: string;
  treeId: string;
}

const treeClients = new Map<string, Set<ClientMeta>>();

function addClient(meta: ClientMeta) {
  let clients = treeClients.get(meta.treeId);
  if (!clients) { clients = new Set(); treeClients.set(meta.treeId, clients); }
  clients.add(meta);
}

function removeClient(meta: ClientMeta) {
  const clients = treeClients.get(meta.treeId);
  if (clients) {
    clients.delete(meta);
    if (clients.size === 0) treeClients.delete(meta.treeId);
  }
}

function broadcast(treeId: string, event: string, data: unknown, excludeUserId?: string) {
  const clients = treeClients.get(treeId);
  if (!clients) return;
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.userId === excludeUserId) continue;
    if (client.ws.readyState === 1 /* OPEN */) client.ws.send(payload);
  }
}

// ── Redis pub/sub for multi-instance broadcasting ────────────────────────

const CHANNEL = 'rootlink:ws-events';

export async function setupRedisPubSub() {
  const subscriber = getRedis().duplicate();
  await subscriber.subscribe(CHANNEL);
  subscriber.on('message', (_channel, message) => {
    try {
      const { treeId, event, data, excludeUserId } = JSON.parse(message) as {
        treeId: string; event: string; data: unknown; excludeUserId?: string;
      };
      broadcast(treeId, event, data, excludeUserId);
    } catch (err) {
      logger.warn({ err }, 'Failed to parse Redis pub/sub message');
    }
  });
  return subscriber;
}

export async function publishTreeEvent(
  treeId: string,
  event: string,
  data: unknown,
  excludeUserId?: string,
) {
  await getRedis().publish(CHANNEL, JSON.stringify({ treeId, event, data, excludeUserId }));
}

// ── Message handler ───────────────────────────────────────────────────────

function makeMessageHandler() {
  let clientMeta: ClientMeta | null = null;

  return {
    async handleMessage(socket: WebSocket, rawMsg: Buffer) {
      let msg: { event: string; data: Record<string, unknown> };
      try {
        msg = JSON.parse(rawMsg.toString()) as typeof msg;
      } catch {
        socket.send(JSON.stringify({ event: 'error', data: { message: 'Invalid JSON' } }));
        return;
      }

      const { event, data } = msg;

      switch (event) {
        case WS_EVENTS.JOIN_TREE: {
          const token = data['token'];
          if (typeof token !== 'string') {
            socket.send(JSON.stringify({ event: 'error', data: { message: 'token required' } }));
            return;
          }
          let payload: JwtPayload;
          try {
            payload = verifyToken(token);
          } catch {
            socket.send(JSON.stringify({ event: 'error', data: { message: 'Invalid token' } }));
            socket.close();
            return;
          }

          const treeId = String(data['treeId'] ?? '');
          if (!treeId) {
            socket.send(JSON.stringify({ event: 'error', data: { message: 'treeId required' } }));
            return;
          }

          // Authorization, not just authentication: a valid JWT only proves
          // the connection belongs to *some* RootLink account — it says
          // nothing about whether that account has any relationship to
          // THIS tree. Every REST route reaches getTreePermission() via
          // requireTreeRole()/requireTreeViewAccess() before touching
          // tree-scoped data; this socket handshake is the one place that
          // check was missing (see RootLink_MultiDisciplinary_Audit.md,
          // Finding S1). Deliberately scoped to authenticated members only
          // — anonymous share-link viewers are read-only browsers, not
          // collaborators, so they are not admitted to the live room.
          const permission = await getTreePermission(payload.sub, treeId);
          if (!permission) {
            socket.send(JSON.stringify({
              event: 'error',
              data: { message: 'You do not have access to this tree' },
            }));
            logger.warn({ userId: payload.sub, treeId }, 'Rejected unauthorized JOIN_TREE attempt');
            return;
          }

          clientMeta = { ws: socket, userId: payload.sub, treeId };
          addClient(clientMeta);
          logger.info({ userId: payload.sub, treeId }, 'Client joined tree');

          await publishTreeEvent(treeId, WS_EVENTS.COLLABORATOR_JOINED, { userId: payload.sub }, payload.sub);
          socket.send(JSON.stringify({ event: 'joined', data: { treeId, message: 'Connected to tree' } }));
          break;
        }

        case WS_EVENTS.LEAVE_TREE: {
          if (clientMeta) {
            await publishTreeEvent(clientMeta.treeId, WS_EVENTS.COLLABORATOR_LEFT, { userId: clientMeta.userId }, clientMeta.userId);
            removeClient(clientMeta);
            clientMeta = null;
          }
          break;
        }

        case WS_EVENTS.PRESENCE_UPDATE: {
          if (!clientMeta) return;
          await publishTreeEvent(
            clientMeta.treeId,
            WS_EVENTS.PRESENCE_UPDATE,
            { userId: clientMeta.userId, ...data },
            clientMeta.userId,
          );
          break;
        }

        default:
          socket.send(JSON.stringify({ event: 'error', data: { message: `Unknown event: ${event}` } }));
      }
    },

    async handleClose() {
      if (clientMeta) {
        logger.info({ userId: clientMeta.userId, treeId: clientMeta.treeId }, 'Client disconnected');
        await publishTreeEvent(clientMeta.treeId, WS_EVENTS.COLLABORATOR_LEFT, { userId: clientMeta.userId }, clientMeta.userId);
        removeClient(clientMeta);
        clientMeta = null;
      }
    },

    handleError(err: Error) {
      logger.warn({ err }, 'WebSocket error');
      if (clientMeta) { removeClient(clientMeta); clientMeta = null; }
    },
  };
}

// ── Plugin registration ───────────────────────────────────────────────────
// The /ws route MUST be registered inside the websocketPlugin scope.
// Registering it on the outer app instance causes a runtime error because
// @fastify/websocket only decorates routes within its own scope.

export async function registerWebSocket(app: FastifyInstance) {
  await setupRedisPubSub();

  await app.register(async function wsScope(scoped) {
    await scoped.register(websocketPlugin, {
      options: { maxPayload: 64 * 1024 },
    });

    scoped.get('/ws', { websocket: true }, (socket) => {
      const handler = makeMessageHandler();

      socket.on('message', (rawMsg: Buffer) => {
        void handler.handleMessage(socket, rawMsg);
      });

      socket.on('close', () => {
        void handler.handleClose();
      });

      socket.on('error', (err: Error) => {
        handler.handleError(err);
      });
    });
  });
}
