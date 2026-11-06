import { defineConfig } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  // Each test takes a few seconds alone, but many browsers at once on a laptop can slow them past 30.
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
  },
  webServer: {
    // Starts from an empty database every run, so nothing a test saved can affect the next run.
    command: `node -e "require('fs').rmSync('data/e2e',{recursive:true,force:true})" && npm run build && npm start`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    // A separate, throwaway database so tests never touch real study data.
    env: { PORT: String(PORT), DATA_DIR: './data/e2e' },
  },
})
