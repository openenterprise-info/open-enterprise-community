# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
COPY frontend/package.json   ./frontend/
COPY server/package.json     ./server/
COPY processor/package.json  ./processor/
RUN yarn workspace @open-enterprise/frontend install --frozen-lockfile

COPY frontend/ ./frontend/
RUN yarn workspace @open-enterprise/frontend build

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

RUN npm install -g pm2 && apk add --no-cache openssl

# Install server + processor dependencies
COPY package.json yarn.lock ./
COPY server/package.json    ./server/
COPY processor/package.json ./processor/
RUN yarn workspace @open-enterprise/server    install --frozen-lockfile
RUN yarn workspace @open-enterprise/processor install --frozen-lockfile

# Copy source code (server/storage is excluded via .dockerignore — no dev data)
COPY server/    ./server/
COPY processor/ ./processor/
COPY ecosystem.config.js ./
COPY entrypoint.sh ./

# Copy built frontend from Stage 1
COPY --from=builder /app/frontend/dist ./public

# Generate Prisma client using the hoisted local binary (respects pinned version)
RUN cd server && /app/node_modules/.bin/prisma generate

# Pre-create storage dirs; volume mount will overlay server/storage at runtime
RUN mkdir -p /app/server/storage/uploads /app/server/storage/lancedb

RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
ENV SERVER_PORT=3001
ENV PROCESSOR_PORT=3002

EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]
