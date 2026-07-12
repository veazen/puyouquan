# Veazen cloud API (PROJECT_PLAN §8 Phase 4).
# Build context: the monorepo root (veazen/), e.g.
#   docker build -f apps/api/Dockerfile .
# Railway: set Root Directory = veazen, Dockerfile Path = apps/api/Dockerfile.

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/crypto/package.json packages/crypto/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --no-audit --no-fund
COPY packages packages
COPY apps/api apps/api
RUN npm run build -w @veazen/crypto -w @veazen/shared \
 && cd apps/api && npx prisma generate && npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/packages/crypto/dist packages/crypto/dist
COPY --from=build /app/packages/crypto/package.json packages/crypto/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
# npm nests version-conflicting workspace deps under apps/api/node_modules
# (e.g. nodemailer) — the root node_modules copy above doesn't include them
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/scripts/deploy-boot.mjs apps/api/scripts/deploy-boot.mjs

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "scripts/deploy-boot.mjs"]
