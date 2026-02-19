## ── Stage 1: builder ────────────────────────────────────────────────
FROM node:22-bookworm AS builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV WOODLS_PREFER_PNPM=1
RUN pnpm ui:build

## ── Stage 2: runtime ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

RUN corepack enable

WORKDIR /app

ARG WOODLS_DOCKER_APT_PACKAGES=""
RUN if [ -n "$WOODLS_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $WOODLS_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

# Copy built artefacts and production node_modules from builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ui/dist ./ui/dist
COPY --from=builder /app/woodls.mjs ./woodls.mjs

# Copy ui package.json for workspace resolution
COPY --from=builder /app/ui/package.json ./ui/package.json
COPY --from=builder /app/ui/node_modules ./ui/node_modules

# Optionally install Chromium and Xvfb for browser automation.
# Build with: docker build --build-arg WOODLS_INSTALL_BROWSER=1 ...
# Adds ~300MB but eliminates the 60-90s Playwright install on every container start.
ARG WOODLS_INSTALL_BROWSER=""
RUN if [ -n "$WOODLS_INSTALL_BROWSER" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends xvfb && \
      node /app/node_modules/playwright-core/cli.js install --with-deps chromium && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

ENV NODE_ENV=production
ENV WOODLS_PREFER_PNPM=1

# Allow non-root user to write temp files during runtime/tests.
RUN chown -R node:node /app

# Security hardening: Run as non-root user
USER node

EXPOSE 3000

# Start gateway server with default config.
# Binds to loopback (127.0.0.1) by default for security.
#
# For container platforms requiring external health checks:
#   1. Set WOODLS_GATEWAY_TOKEN or WOODLS_GATEWAY_PASSWORD env var
#   2. Override CMD: ["node","woodls.mjs","gateway","--allow-unconfigured","--bind","lan"]
CMD ["node", "woodls.mjs", "gateway", "--allow-unconfigured"]
