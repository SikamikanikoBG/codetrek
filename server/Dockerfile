# codetrek-api — small Express + SQLite backend for optional cross-device
# profile sync (github.com/SikamikanikoBG/codetrek issue #1). No accounts,
# no passwords — link-code + per-device-token model only.
#
# better-sqlite3 is a native addon and needs glibc. This image is Debian-based
# (node:20-slim), deliberately NOT alpine (musl) — mixing musl with a native
# binding built/fetched for glibc is the classic "works locally, crashes in
# the container" surprise this project wants to avoid.

FROM node:20-slim AS build
WORKDIR /app

# Safety net: better-sqlite3 ships prebuilt binaries for common platforms via
# prebuild-install and normally won't need these, but if no prebuild matches
# this exact Node/OS combo it falls back to compiling from source.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DB_PATH=/data/codetrek.sqlite
ENV PORT=4000

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Run as the image's built-in non-root `node` user (uid 1000) rather than
# root. /data is pre-created and chowned here so a BRAND NEW named volume
# (Docker copies an image directory's content/ownership into a volume the
# first time it's populated) just works; an already-existing volume from a
# previous root-run deployment needs its ownership fixed once, out of band,
# before this image is deployed onto it.
RUN mkdir -p /data && chown node:node /data
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

EXPOSE 4000
CMD ["node", "dist/index.js"]
