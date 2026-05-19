# Build configuration for iamlukethedev/Claw3D
# Source: https://github.com/iamlukethedev/Claw3D
# Credit: Luke (iamlukethedev) — 3D agent visualization engine
#
# Why this exists: upstream Dockerfile uses node:20-slim, but camera-controls@3.1.2
# requires Node >=22, and Next.js cannot load next.config.ts at runtime on Node 20.
# next.config.ts requires TypeScript at runtime (not just build time), so we keep
# full node_modules. This is a build configuration, not a fork — all source is from upstream.

FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/iamlukethedev/Claw3D.git .
# Patch next.config.ts to add basePath so the app is served under /claw3d.
# This lets personal-dashboard proxy all /claw3d/* requests (including static assets)
# to claw3d:3000 with the auth cookie injected — no manual browser cookie setup needed.
RUN node -e "\
  const fs = require('fs'); \
  const c = fs.readFileSync('next.config.ts', 'utf8'); \
  if (!c.includes('basePath')) { \
    const i = c.indexOf('{', c.indexOf('const nextConfig')); \
    fs.writeFileSync('next.config.ts', c.slice(0, i + 1) + '\n  basePath: \"/claw3d\",' + c.slice(i + 1)); \
    console.log('next.config.ts: basePath added'); \
  } else { \
    console.log('next.config.ts: basePath already present'); \
  } \
"
RUN npm ci --ignore-scripts
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_GATEWAY_URL=ws://127.0.0.1:18789
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["node", "server/index.js"]
