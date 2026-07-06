# CodeTrek — static SPA (accounts/profile storage live in the codetrek-api
# sidecar; this image just serves the built frontend + reverse-proxies
# /api/ to it, see deploy/nginx.conf).
# Multi-stage build: compile with Node, serve the static bundle with nginx.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# nginx-unprivileged runs as a non-root user out of the box (listens on 8080,
# not 80, since binding <1024 needs root) — avoids running the public-facing
# container as root for no real benefit.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
