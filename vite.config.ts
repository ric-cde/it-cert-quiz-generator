import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { DEV_API_PORT } from './src/shared/ports'

export default defineConfig({
  root: 'src/client',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src/client', import.meta.url)) },
  },
  server: {
    proxy: { '/api': `http://localhost:${DEV_API_PORT}` },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
})
