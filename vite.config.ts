import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Local dev only: forwards same-origin /api/* calls to codetrek-api
      // running separately (`cd server && npm run dev`, defaults to :4000).
      // Production reaches the backend the same same-origin way, via
      // nginx (deploy/nginx.conf) — the frontend never hardcodes a host.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // server/ is its own workspace with its own package.json, vitest config,
    // and CI job (server-build-test) — without this exclude, the root
    // `vitest run` picks up server/src/*.test.ts too and fails to resolve
    // its dependencies (e.g. supertest) unless server/node_modules happens
    // to already exist on disk, which is exactly what masked this locally.
    exclude: ['**/node_modules/**', 'server/**'],
  },
})
