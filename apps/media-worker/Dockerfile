FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @sma/media-worker... build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl ffmpeg fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
USER 1000:1000
CMD ["node", "apps/media-worker/dist/index.js"]
