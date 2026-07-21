# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY app ./app
COPY site-public ./site-public
COPY worker ./worker
COPY next.config.ts tsconfig.json vite.config.ts ./

RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /app/dist/standalone ./

USER node
EXPOSE 3000
CMD ["node", "server.js"]
