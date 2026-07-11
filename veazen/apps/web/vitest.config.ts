import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Unit tests never touch CSS; an inline empty PostCSS config stops Vite
  // from loading postcss.config.cjs (which pulls in Tailwind) for test runs.
  css: {
    postcss: {},
  },
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
});
