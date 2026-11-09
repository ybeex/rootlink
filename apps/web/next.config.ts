import type { NextConfig } from 'next';

// ── Content-Security-Policy ─────────────────────────────────────────────────
//
// Builds a CSP from the same env vars the app already uses for API/WS
// connections, so it stays correct as those origins change per-environment
// without a second place to update.
//
// Notable tradeoffs (documented rather than silently accepted):
//   - `style-src` includes 'unsafe-inline': the UI uses extensive inline
//     `style={{ ... }}` props for theme-variable-driven styling (see
//     src/styles/globals.css). Removing this requires migrating that styling
//     to class-based CSS, which is a larger refactor tracked separately.
//   - `script-src` includes 'unsafe-inline' for Next.js's hydration bootstrap
//     script. Next.js supports nonce-based CSP via middleware for a stricter
//     policy; that is a follow-up once the App Router middleware story is
//     finalized. 'unsafe-eval' is included ONLY in development (needed by
//     React Fast Refresh / webpack-hmr) and is dropped from the production
//     policy entirely.
//   - This is a defense-in-depth layer, not the only protection: React's
//     default JSX escaping (no dangerouslySetInnerHTML/eval/innerHTML
//     anywhere in this codebase) remains the primary XSS defense. CSP is
//     here to contain any FUTURE regression.

function buildCsp(): string {
  const isProd = process.env.NODE_ENV === 'production';

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const wsUrl  = process.env.NEXT_PUBLIC_WS_URL  ?? 'ws://localhost:3001';

  const scriptSrc = isProd
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.amazonaws.com',
      'https://*.r2.cloudflarestorage.com',
      'http://localhost:*',
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'ws:', 'wss:', apiUrl, wsUrl],
    'worker-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  if (isProd) {
    directives['upgrade-insecure-requests'] = [];
  }

  return Object.entries(directives)
    .map(([key, values]) => (values.length > 0 ? `${key} ${values.join(' ')}` : key))
    .join('; ');
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: buildCsp() },
        ],
      },
    ];
  },
  // Redirect old routes
  async redirects() {
    return [
      { source: '/home', destination: '/dashboard', permanent: true },
    ];
  },
};

export default nextConfig;
