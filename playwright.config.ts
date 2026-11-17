// ============================================================================
// PlaywrightConfig — Recette réelle du serveur de prévisualisation Astro
// ----------------------------------------------------------------------------
// Ce harnais démarre le build déjà produit et teste Chromium localement.
// Il ne lance ni installation implicite, ni publication, ni job GitHub Actions.
// ============================================================================
import { defineConfig, devices } from '@playwright/test';

// Adresse stable commune aux tests et à l'attente de disponibilité du serveur.
const BASE_URL = 'http://127.0.0.1:4321';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: true,
  retries: 0,
  use: { baseURL: BASE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview',
    // Ce marqueur empêche Astro de détacher automatiquement le serveur sous un agent IA.
    env: { ASTRO_PREVIEW_BACKGROUND: '1' },
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
