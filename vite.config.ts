import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { DEV_API_PORT } from './src/shared/ports'

export default defineConfig({
  root: 'src/client',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/client', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  server: {
    // HOST is set only on the eq14 (127.0.0.1), where Tailscale Serve publishes this dev server as
    // the preview on port 8444. Unset, nothing changes on the laptop.
    host: process.env.HOST || undefined,
    // Vite refuses requests for hostnames it doesn't know; the preview arrives as *.ts.net.
    allowedHosts: ['.ts.net'],
    proxy: { '/api': `http://${process.env.HOST || 'localhost'}:${DEV_API_PORT}` },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
})
