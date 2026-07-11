/**
 * E2E / acceptance suite (§8 Phase 1): needs migrated postgres + redis
 * (infra/docker-compose.yml or native services). Run: npm run test:e2e
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  maxWorkers: 1,
};
