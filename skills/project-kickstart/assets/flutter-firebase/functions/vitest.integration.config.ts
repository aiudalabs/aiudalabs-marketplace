// Integration tests against the emulators (Firestore, Functions, Auth):
//   pnpm emulators:test   (from the repo root)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
  },
});
