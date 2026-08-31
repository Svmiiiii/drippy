import { defineConfig } from 'vitest/config';

// Integration tests that hit a running dev server's API routes over HTTP
// (see tests/README.md) — no DOM/Next.js runtime needed, so the plain
// 'node' environment is enough and keeps runs fast.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
