FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json           ./apps/web/
COPY packages/shared/package.json    ./packages/shared/
RUN npm ci --ignore-scripts

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=packages/shared
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/web

FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 rootlink && \
    adduser  --system --uid 1001 --ingroup rootlink rootlink

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone   ./
COPY --from=builder /app/apps/web/.next/static        ./apps/web/.next/static
COPY --from=builder /app/apps/web/public              ./apps/web/public

USER rootlink
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "apps/web/server.js"]
