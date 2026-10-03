# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG PAYLOAD_SECRET=build-time-placeholder-secret-change-me-32chars
ARG NEXT_PUBLIC_SITE_URL=https://fabulaone.ru
ARG NEXT_PUBLIC_YM_ID=
# Build must not reach live Postgres/SMTP (host postgres exists only at runtime).
ENV DATABASE_URI=postgresql://build:build@127.0.0.1:5432/build \
    PAYLOAD_SECRET=$PAYLOAD_SECRET \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_YM_ID=$NEXT_PUBLIC_YM_ID \
    SMTP_HOST= \
    SMTP_USER= \
    SMTP_PASS=
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

# Local media uploads (covers/files) until YOS is configured
RUN mkdir -p /app/media && chown -R nextjs:nodejs /app/media

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["npm", "run", "start"]
