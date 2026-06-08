import { defineConfig } from '@playwright/test';

/**
 * E2E against a real local stack. webServer boots `pnpm start:local`
 * (migrate + seed + API :3013 + web :3014) from the monorepo root.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3014',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm start:local',
    cwd: '../..',
    url: 'http://localhost:3014',
    timeout: 120_000,
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
