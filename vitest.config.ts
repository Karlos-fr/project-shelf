// ============================================================================
// VitestConfig — Isolation des tests de fonctions et des tests d'export
// ----------------------------------------------------------------------------
// Les projets nommés empêchent un test ciblé de lancer une autre famille de tests.
// Le runner ne fabrique pas de dist et ne remplace pas un build Astro préalable.
// ============================================================================
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts', 'tests/components/**/*.test.tsx'],
          environment: 'node',
          setupFiles: ['./tests/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'build',
          include: ['tests/build/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
