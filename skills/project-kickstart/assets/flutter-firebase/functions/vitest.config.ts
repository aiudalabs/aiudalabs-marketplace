// Unit tests: no emulator. Rules and integration tests have their own configs.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/unit/**/*.test.ts'],
    environment: 'node',
  },
});
