// ============================================================================
// AstroConfig — Composition du générateur de pages statiques
// ----------------------------------------------------------------------------
// Ce fichier relie la configuration publique à Astro et à l'intégration React.
// Il ne charge aucun catalogue privé et n'installe aucun adaptateur serveur.
// ============================================================================
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { loadSiteConfig } from './src/config/site.ts';

// Configuration validée au démarrage du build, sans détection de navigateur.
const config = loadSiteConfig(process.env);

export default defineConfig({
  output: 'static',
  publicDir: '.generated/public',
  site: config.origin,
  base: config.base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [react()],
  vite: { build: { sourcemap: false } },
});
