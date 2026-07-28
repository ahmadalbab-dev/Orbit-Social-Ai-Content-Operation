FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sma/api build
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3001
CMD ["pnpm","--filter","@sma/api","start"]
