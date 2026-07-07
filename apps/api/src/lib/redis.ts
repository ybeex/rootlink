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
