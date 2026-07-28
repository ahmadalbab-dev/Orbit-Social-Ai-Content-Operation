FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sma/web build
EXPOSE 3000
CMD ["pnpm","--filter","@sma/web","start"]
