// Security rules tests, run inside the Firestore emulator:
//   firebase emulators:exec --only firestore "pnpm --dir functions run test:rules"
// Tests use @firebase/rules-unit-testing against firestore.rules at the repo root.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/rules/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
  },
});
