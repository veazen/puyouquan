import { defineConfig } from '@playwright/test';

/**
 * Phase 2 acceptance (§8): browser-level e2e against the real api + web
 * stack. Requires migrated postgres + redis (same prereqs as the api e2e).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    // pre-provisioned browser in this environment; avoids any download
    launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' },
  },
  webServer: [
    {
      command: 'node ../api/dist/main.js',
      url: 'http://localhost:4000/api/v1/health',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: '4000',
        DATABASE_URL:
          process.env.DATABASE_URL ?? 'postgres://veazen_app:veazen_app@localhost:5432/veazen',
        REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
        MASTER_KEY: process.env.MASTER_KEY ?? 'a'.repeat(64),
        JWT_SECRET: process.env.JWT_SECRET ?? 'pw-e2e-secret',
        STORAGE_DIR: '.storage-test',
      },
    },
    {
      command: 'npx next start -p 3000',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        API_URL_INTERNAL: 'http://localhost:4000/api/v1',
        NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
      },
    },
  ],
});
