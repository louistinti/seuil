import { defineConfig } from 'vitest/config';

// Vitest : moteur de décision et préparation du contenu. Les tests Playwright (tests/e2e) tournent à part.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
