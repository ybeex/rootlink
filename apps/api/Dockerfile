# ── Stage 1: deps ─────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install only production dependencies first for layer caching
COPY package.json package-lock.json* ./
COPY apps/api/package.json          ./apps/api/
COPY packages/shared/package.json   ./packages/shared/
COPY packages/db/package.json       ./packages/db/

RUN npm ci --ignore-scripts

# ── Stage 2: builder ──────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared packages first (dependency order)
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/db
RUN npm run build --workspace=apps/api

# ── Stage 3: runner ───────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup --system --gid 1001 rootlink && \
    adduser  --system --uid 1001 --ingroup rootlink rootlink

# Only copy what runtime needs
COPY --from=deps    /app/node_modules         ./node_modules
COPY --from=builder /app/apps/api/dist        ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/db/dist     ./packages/db/dist
COPY apps/api/package.json .

USER rootlink

EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health/live', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "apps/api/dist/server.js"]
