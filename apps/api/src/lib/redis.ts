import Redis from 'ioredis';
import { env } from '../config/env.js';

let _redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!_redisInstance) {
    _redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 100, 3000);
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      },
      lazyConnect: false,
      enableOfflineQueue: true,
    });

    _redisInstance.on('connect', () => {
      // intentionally silent in production
    });

    _redisInstance.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
  }
  return _redisInstance;
}

let _workerRedisInstance: Redis | null = null;

/** Redis connection for BullMQ consumers, which must retry indefinitely. */
export function getWorkerRedis(): Redis {
  if (!_workerRedisInstance) {
    _workerRedisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      reconnectOnError: (err) => err.message.includes('READONLY'),
      lazyConnect: false,
      enableOfflineQueue: true,
    });

    _workerRedisInstance.on('error', (err) => {
      console.error('BullMQ worker Redis connection error:', err.message);
    });
  }
  return _workerRedisInstance;
}

export async function closeWorkerRedis(): Promise<void> {
  if (_workerRedisInstance) {
    await _workerRedisInstance.quit();
    _workerRedisInstance = null;
  }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Cache failures are non-fatal; log in production monitoring
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  try {
    await redis.del(key);
  } catch {
    // Non-fatal
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const redis = getRedis();
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-fatal
  }
}

// ─── Fixed-window rate limiting (for API keys) ─────────────────────────────────
//
// Deliberately separate from @fastify/rate-limit's global plugin (see
// plugins/index.ts) rather than threaded through it: that plugin hooks into
// Fastify's `onRequest` phase, which runs before any route's `preHandler`
// chain — including authenticateApiKey() — so a key-scoped limiter can't be
// expressed as a `keyGenerator` there without the key having already been
// authenticated, which hasn't happened yet at that point in the lifecycle.
// A self-contained INCR+EXPIRE fixed-window counter, checked explicitly as
// its own preHandler *after* authenticateApiKey, sidesteps that ordering
// problem entirely and is easy to reason about without relying on plugin
// internals.
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // unix seconds
}

export async function checkFixedWindowRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const redisKey = `${key}:${bucket}`;
  const resetAt = (bucket + 1) * windowSeconds;

  const count = await redis.incr(redisKey);
  if (count === 1) {
    // Only the request that created the bucket sets its expiry — avoids
    // resetting the TTL on every request in the window.
    await redis.expire(redisKey, windowSeconds);
  }

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

// ─── Distributed lock (for idempotent ops) ────────────────────────────────────

export async function acquireLock(
  lockKey: string,
  ttlMs: number,
  token: string,
): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');
  return result === 'OK';
}

export async function releaseLock(lockKey: string, token: string): Promise<void> {
  const redis = getRedis();
  // Lua script for atomic check-and-delete
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, 1, lockKey, token);
}
