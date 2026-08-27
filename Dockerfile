# syntax=docker/dockerfile:1

# Node version is pinned and must match .nvmrc.
ARG NODE_VERSION=22

# --- deps: install production+build deps against a clean lockfile -------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
# libc compatibility for some native deps on alpine.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: produce the standalone build -----------------------------------
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The browser-visible values in .env are inlined at build time, so the build
# needs the real file. It is mounted as a BuildKit secret rather than COPYd so
# it never becomes part of any image layer:
#
#   docker build --secret id=dotenv,src=.env .
RUN --mount=type=secret,id=dotenv,target=/app/.env,required=true npm run build

# --- runner: minimal production image ----------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The port the standalone server binds. docker-compose overrides it with
# WEB_PORT from the root .env; the ARG only keeps a plain `docker run` working.
ARG WEB_PORT=3000
ENV PORT=${WEB_PORT}
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# The standalone output bundles a minimal node_modules subset + server.js.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE ${WEB_PORT}
CMD ["node", "server.js"]
