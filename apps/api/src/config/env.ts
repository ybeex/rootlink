import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),
  DB_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(100).default(20),

  // Redis
  REDIS_URL: z.string().default('redis://127.0.0.1:6380'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Storage (S3-compatible)
  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET: z.string(),
  STORAGE_ACCESS_KEY_ID: z.string(),
  STORAGE_SECRET_ACCESS_KEY: z.string(),
  STORAGE_PUBLIC_URL: z.string().url().optional(),

  // Email (SMTP or transactional API)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().default('noreply@rootlink.app'),

  // App
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),
  CORS_ORIGINS: z
    .string()
    .transform((s) => s.split(',').map((u) => u.trim()))
    .default('http://localhost:3000'),

  // Refresh-token cookie. Leave unset for single-host/local dev (cookie is
  // scoped to the API's own host). In production, set to the shared parent
  // domain (e.g. ".rootlink.app") so the cookie set by api.rootlink.app is
  // also sent by the browser to requests targeting the API from the web app
  // at rootlink.app.
  COOKIE_DOMAIN: z.string().optional(),

  // Feature flags
  ENABLE_AI_FEATURES: z.coerce.boolean().default(false),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Billing (Stripe). All optional — there is no live Stripe account
  // configured in this environment. The billing service checks for these
  // at the point of use and throws a clear, specific error rather than the
  // app failing to boot at all without them, so the rest of the product
  // works fully whether or not billing is wired up yet.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PLUS: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),

  // FamilySearch integration (external record matching). Same
  // optional-with-clear-error-at-point-of-use pattern as Stripe above —
  // there is no registered FamilySearch developer app in this environment,
  // and per-user OAuth (Authorization Code grant) is the only self-serve
  // grant type FamilySearch offers; client-credentials requires FamilySearch
  // to manually grant special permission (devsupport@familysearch.org), so
  // this cannot be a single server-held credential the way Stripe's secret
  // key is. See docs/RootLink_Record_Matching_Design.md.
  FAMILYSEARCH_CLIENT_ID: z.string().optional(),
  FAMILYSEARCH_CLIENT_SECRET: z.string().optional(),
  FAMILYSEARCH_REDIRECT_URI: z.string().url().optional(),
  FAMILYSEARCH_ENV: z.enum(['sandbox', 'beta', 'production']).default('sandbox'),

  // Symmetric key (32 raw bytes, base64-encoded) used to encrypt third-party
  // OAuth tokens at rest (e.g. a connected FamilySearch account's access/
  // refresh tokens) — these must be reversible to actually use them, unlike
  // the argon2-hashed secrets this codebase generates itself (refresh
  // tokens, API keys), which only ever need to be verified, never read
  // back. Optional for the same reason as the FamilySearch vars above: the
  // feature that needs it degrades to a clear error, not a boot failure.
  TOKEN_ENCRYPTION_KEY: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_TRUST_PROXY: z.coerce.boolean().default(false),

  // Monitoring
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  SENTRY_DSN: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().url().optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}

export const env = loadEnv();
