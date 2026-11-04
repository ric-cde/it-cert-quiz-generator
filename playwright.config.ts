import { defineConfig } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
  },
  webServer: {
    command: 'npm run build && npm start',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    // A separate, throwaway database so tests never touch real study data.
    env: { PORT: String(PORT), DATA_DIR: './data/e2e' },
  },
})
