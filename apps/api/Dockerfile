FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Prisma generation only needs a syntactically valid URL; it does not connect.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @sma/api... build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@11.17.0 --activate
ENV NODE_ENV=production
WORKDIR /app
# Keep workspace links and Prisma's migration CLI intact. Secrets are excluded by .dockerignore.
COPY --from=build /app /app
USER 1000:1000
EXPOSE 3001
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
