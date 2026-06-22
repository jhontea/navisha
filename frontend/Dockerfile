# syntax=docker/dockerfile:1.7

# ---- Dependencies stage ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_ vars must be baked in at build time (embedded into JS bundle)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/root/.npm \
    npm run build

# ---- Runner stage: minimal production image ----
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create public dir (project may not have one, COPY would fail if missing)
RUN mkdir -p ./public

# Standalone output from Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
