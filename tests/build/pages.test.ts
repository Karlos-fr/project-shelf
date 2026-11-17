// ============================================================================
// GeneratedPagesTests — Contrats du HTML pré-généré bilingue
// ----------------------------------------------------------------------------
// Ces tests lisent dist produit par le build fixture. Ils vérifient le contenu
// réellement exporté, pas la structure source des composants.
// ============================================================================
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { describe, expect, it } from 'vitest';

// ----------------------------------------------------------------------------
// Charge une page de dist et retourne Cheerio pour des assertions structurelles.
// ----------------------------------------------------------------------------
async function page(path: string) {
  return load(await readFile(path, 'utf8'));
}

describe('pages localisées pré-générées', () => {
  it('exporte la fiche française et son adresse de référence', async () => {
    const $ = await page('dist/fr/projects/example-audio/index.html');
    expect($('html').attr('lang')).toBe('fr');
    expect($('article[data-project-id="example-audio"]').text()).toContain('Exemple audio');
    expect($('link[rel="canonical"]').attr('href')).toBe('https://example.test/fr/projects/example-audio/');
    expect($('article[data-project-id="example-audio"]').closest('[hidden]').length).toBe(0);
  });

  it('rend tous les liens de projet dans la galerie SSR', async () => {
    const $ = await page('dist/en/index.html');
    const ids = $('[data-project-link]').map((_index, element) => $(element).attr('data-project-link')).get();
    expect(new Set(ids)).toEqual(new Set(['example-audio', 'example-port', 'example-web', 'example-hardware']));
    expect($.html()).not.toContain('hidden-canary');
    expect($.html()).not.toContain('HIDDEN_SENTINEL');
  });

  it('canonicalise la racine vers l accueil anglais', async () => {
    const $ = await page('dist/index.html');
    expect($('html').attr('lang')).toBe('en');
    expect($('link[rel="canonical"]').attr('href')).toBe('https://example.test/en/');
    expect($('link[hreflang="fr"]').attr('href')).toBe('https://example.test/fr/');
  });
});
