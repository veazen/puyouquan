# Veazen verify pages + tenant console (PROJECT_PLAN §8 Phase 4).
# Build context: the monorepo root (veazen/):
#   docker build -f apps/web/Dockerfile .
# Railway: Root Directory = veazen, Dockerfile Path = apps/web/Dockerfile.
# NEXT_PUBLIC_API_URL is baked at build time (browser bundle); override the
# build arg if the API lives somewhere other than api.veazen.app.

FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://api.veazen.app/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/crypto/package.json packages/crypto/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --no-audit --no-fund
COPY packages packages
COPY apps/web apps/web
RUN npm run build -w @veazen/crypto -w @veazen/shared \
 && cd apps/web && npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static apps/web/.next/static
COPY --from=build /app/apps/web/public apps/web/public

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
