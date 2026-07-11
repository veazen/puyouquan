/**
 * Unit tests only (no external services) — runs in `turbo run test`.
 * The Phase 1 acceptance e2e suite (real postgres + redis) lives behind
 * `npm run test:e2e` with jest-e2e.config.cjs.
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
