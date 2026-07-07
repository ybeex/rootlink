import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    include:     ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include:  ['src/**/*.ts'],
      exclude:  ['src/**/*.test.ts', 'src/server.ts'],
    },
    // Ensure tests run serially to avoid DB conflicts
    pool:       'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 15000,
  },
});
