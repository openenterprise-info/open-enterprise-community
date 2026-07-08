#!/bin/sh
set -e

echo "[entrypoint] Initialising database schema..."
cd /app/server && /app/node_modules/.bin/prisma db push --skip-generate --accept-data-loss

echo "[entrypoint] Starting services..."
cd /app
exec pm2-runtime /app/ecosystem.config.js
