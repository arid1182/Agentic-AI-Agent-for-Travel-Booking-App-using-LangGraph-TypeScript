# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================

FROM dhi.io/node:24-alpine3.22-dev AS dependencies
WORKDIR /app
COPY package.json components.json tsconfig.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
        npm ci --cache /root/.npm --no-audit --no-fund;
    else
        echo "Expected package-lock.json missing." && exit 1; \
    fi

# ============================================
# Stage 2: Build Next.js application in standalone mode
# ============================================

FROM dhi.io/node:24-alpine3.22-dev AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG APP_VERSION
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ============================================
# Stage 3: Run Next.js application
# ============================================

FROM dhi.io/node:24-alpine3.22 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir .next && chown node:node .next

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
