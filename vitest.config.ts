import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/server/**/*.test.ts', 'src/shared/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: { '@': fileURLToPath(new URL('./src/client', import.meta.url)) },
        },
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/client/**/*.test.{ts,tsx}'],
          setupFiles: ['src/client/test-setup.ts'],
        },
      },
    ],
  },
})
