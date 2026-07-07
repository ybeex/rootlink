import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import requestContext from '@fastify/request-context';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from '../config/env.js';
import { getRedis } from '../lib/redis.js';

export async function registerPlugins(app: FastifyInstance) {
  // ─── Security ───────────────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(cookie);

  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  });

  // ─── Rate Limiting (backed by Redis) ────────────────────────────────────────
  const redis = getRedis();
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request) => {
      // Authenticated users get per-user limits; anonymous gets per-IP
      const userId = (request as { user?: { id?: string } }).user?.id;
      return userId ? `rl:user:${userId}` : `rl:ip:${request.ip}`;
    },
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: 'RATE_001',
        message: 'Too many requests. Please try again later.',
      },
      timestamp: new Date().toISOString(),
    }),
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  // ─── JWT ────────────────────────────────────────────────────────────────────
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN, algorithm: 'HS256' },
    verify: { allowedIss: 'rootlink-api', algorithms: ['HS256'] },
  });

  // ─── File uploads ────────────────────────────────────────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: 200 * 1024 * 1024, // 200 MB absolute max; per-subscription checked in handler
      files: 10,
      fields: 20,
      fieldSize: 100 * 1024, // 100 KB for form fields
    },
    attachFieldsToBody: false,
  });

  // ─── Utilities ──────────────────────────────────────────────────────────────
  await app.register(sensible);

  await app.register(requestContext, {
    defaultStoreValues: {
      requestId: '',
      userId: null as string | null,
      treeId: null as string | null,
    },
  });

  // ─── OpenAPI / Swagger ──────────────────────────────────────────────────────
  if (env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        openapi: '3.1.0',
        info: {
          title: 'RootLink API',
          description: 'Family Tree & Heritage Platform API',
          version: '1.0.0',
        },
        servers: [{ url: env.API_URL }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
        security: [{ bearerAuth: [] }],
        tags: [
          { name: 'auth', description: 'Authentication & Account' },
          { name: 'trees', description: 'Family Trees' },
          { name: 'persons', description: 'Persons in a Tree' },
          { name: 'relationships', description: 'Relationships between Persons' },
          { name: 'media', description: 'Media Assets' },
          { name: 'sources', description: 'Source Citations' },
          { name: 'hints', description: 'Research Hints' },
          { name: 'notifications', description: 'Notifications' },
          { name: 'users', description: 'User Profile' },
        ],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: true },
    });
  }

  // ─── Request context propagation ────────────────────────────────────────────
  app.addHook('onRequest', async (request) => {
    requestContext.set('requestId', request.id);
  });

  // ─── Response headers ────────────────────────────────────────────────────────
  app.addHook('onSend', async (request, reply) => {
    void reply.header('X-Request-ID', request.id);
    void reply.header('X-Powered-By', 'RootLink');
  });
}