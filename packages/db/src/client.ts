import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

// ─── Connection Config ────────────────────────────────────────────────────────

interface DbConfig {
  url: string;
  maxConnections?: number;
  idleTimeout?: number;
  connectTimeout?: number;
  ssl?: boolean;
}

// ─── Client Factory ───────────────────────────────────────────────────────────

export function createDb(config: DbConfig) {
  const sql = postgres(config.url, {
    max: config.maxConnections ?? 20,
    idle_timeout: config.idleTimeout ?? 30,
    connect_timeout: config.connectTimeout ?? 10,
    ...(config.ssl ? { ssl: 'require' as const } : {}),
    // Connection lifecycle logging
    onnotice: () => undefined,
    // Transform column names from snake_case to camelCase at driver level
    transform: postgres.camel,
  });

  const db = drizzle(sql, {
    schema,
    logger: process.env['NODE_ENV'] === 'development',
  });

  return { db, sql };
}

// ─── Singleton for application use ───────────────────────────────────────────

let _dbInstance: ReturnType<typeof createDb> | null = null;

export function getDb(): ReturnType<typeof createDb> {
  if (!_dbInstance) {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL environment variable is required');

    _dbInstance = createDb({
      url,
      maxConnections: parseInt(process.env['DB_MAX_CONNECTIONS'] ?? '20', 10),
      ssl: process.env['NODE_ENV'] === 'production',
    });
  }
  return _dbInstance;
}

export type Db = ReturnType<typeof createDb>['db'];

// Re-export schema for convenience
export * from './schema.js';
