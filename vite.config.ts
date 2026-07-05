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
  },
})
