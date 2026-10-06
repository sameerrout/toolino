# =============================================================================
# Toolino — alternative server deployment
# =============================================================================
#
# You do NOT need this file for the normal deployment. The site is a static
# export served from S3 + CloudFront or Vercel, which is cheaper, faster and has no runtime
# to patch. See `deploy/cloudfront/README.md`.
#
# This image exists for the case where you later want server-side rendering:
# AWS App Runner or ECS Fargate. To use it you must change two things:
#
#   1. In `next.config.mjs`, replace `output: 'export'` with
#      `output: 'standalone'` and remove `trailingSlash` if you rely on
#      server-side redirects instead of the static stubs.
#   2. Replace the S3 sync in CI with an ECR push plus an App Runner or ECS
#      deploy.
#
# Build and run locally:
#   docker build -t toolino .
#   docker run --rm -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 toolino
#
# =============================================================================

# ------------------------------------------------------------------ deps stage
FROM node:22-alpine AS deps

WORKDIR /app

# Install only what the build needs. `libc6-compat` keeps the native SWC binary
# working on musl-based Alpine.
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ----------------------------------------------------------------- build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public configuration. These are inlined into the bundle, so they are
# never secrets - and must NOT be swapped for real secrets here, because anything
# passed as NEXT_PUBLIC_* ends up readable in the browser.
ARG NEXT_PUBLIC_SITE_URL=https://toolino-one.vercel.app
ARG NEXT_PUBLIC_ADSENSE_CLIENT=
ARG NEXT_PUBLIC_GA_ID=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------------------------------------------------------------- runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

# Never run as root. UID 1001 is the conventional unprivileged id.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `public/` and `.next/static` are served directly; the standalone bundle carries
# the server entry and only the node_modules it actually resolved.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# App Runner and ECS both use this to decide whether a task is healthy. Point it
# at a real page rather than a health endpoint, because the static site has none.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
