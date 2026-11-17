// ============================================================================
// SiteBootstrapTests — Contrat de configuration sans dépendance npm
// ----------------------------------------------------------------------------
// Ces tests natifs vérifient la configuration avant l'installation de Vitest.
// Ils n'émulent ni Astro ni son build et ne remplacent pas la recette T1.
// ============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSiteConfig } from '../../src/config/site.ts';

// ----------------------------------------------------------------------------
// Vérifie les valeurs de prévisualisation sans lire l'environnement du processus.
// ----------------------------------------------------------------------------
test('privilégie une prévisualisation locale explicitement non productive', function previewDefaults() {
  // Configuration produite sans fournir d'identité ou de domaine inventé.
  const config = loadSiteConfig({});
  assert.equal(config.mode, 'preview');
  assert.equal(config.origin, 'http://localhost:4321');
  assert.equal(config.base, '/');
  assert.equal(config.name, 'ProjectShelf');
  assert.equal(config.githubUrl, 'https://github.com/Karlos-fr');
  assert.ok(config.intro.en.length > 0);
  assert.ok(config.intro.fr.length > 0);
});

// ----------------------------------------------------------------------------
// Vérifie une origine HTTPS et un préfixe explicitement fournis, sans requête.
// ----------------------------------------------------------------------------
test('normalise séparément origine et préfixe', function normalizeProduction() {
  // Domaine réservé à cette fixture ; aucun déploiement n'est effectué.
  const config = loadSiteConfig({ SITE_MODE: 'production', SITE_ORIGIN: 'https://demo.example.test/', SITE_BASE: '/project-shelf', SITE_FIXTURE: 'true' });
  assert.equal(config.origin, 'https://demo.example.test');
  assert.equal(config.base, '/project-shelf/');
});

// ----------------------------------------------------------------------------
// Vérifie que deux appels ne partagent pas un objet mutable de traduction.
// ----------------------------------------------------------------------------
test('isole les traductions de chaque configuration', function isolatedConfiguration() {
  // Première valeur dont la mutation simule un consommateur maladroit.
  const first = loadSiteConfig({});
  first.intro.en = 'changed';
  assert.notEqual(loadSiteConfig({}).intro.en, first.intro.en);
});

// Entrées invalides ciblant les erreurs de configuration, pas les composants UI.
const invalidCases = [
  ['production sans domaine', { SITE_MODE: 'production' }],
  ['mode inconnu', { SITE_MODE: 'release' }],
  ['mode vide', { SITE_MODE: '' }],
  ['HTTP en production', { SITE_MODE: 'production', SITE_ORIGIN: 'http://demo.example.test' }],
  ['origine relative', { SITE_ORIGIN: '//example.test' }],
  ['origine dangereuse', { SITE_ORIGIN: 'javascript:alert(1)' }],
  ['identifiants dans origine', { SITE_ORIGIN: 'https://user:password@example.test' }],
  ['origine avec chemin', { SITE_ORIGIN: 'https://example.test/path' }],
  ['origine avec traversée normalisée', { SITE_ORIGIN: 'https://example.test/path/../' }],
  ['origine avec traversée encodée', { SITE_ORIGIN: 'https://example.test/%2e%2e/' }],
  ['origine avec requête', { SITE_ORIGIN: 'https://example.test?q=a' }],
  ['origine avec requête vide', { SITE_ORIGIN: 'https://example.test?' }],
  ['origine avec fragment vide', { SITE_ORIGIN: 'https://example.test#' }],
  ['origine avec antislash', { SITE_ORIGIN: 'https://example.test\\evil' }],
  ['origine avec contrôle', { SITE_ORIGIN: 'https://example.test\n' }],
  ['origine réservée en production', { SITE_MODE: 'production', SITE_ORIGIN: 'https://demo.example.test' }],
  ['indicateur de fixture invalide', { SITE_FIXTURE: 'yes' }],
  ['préfixe relatif', { SITE_BASE: 'shelf' }],
  ['préfixe réseau', { SITE_BASE: '//shelf/' }],
  ['traversée de répertoire', { SITE_BASE: '/shelf/../private/' }],
  ['traversée encodée', { SITE_BASE: '/%2e%2e/' }],
  ['préfixe avec requête', { SITE_BASE: '/shelf/?q=x' }],
  ['préfixe avec fragment', { SITE_BASE: '/shelf/#x' }],
  ['préfixe avec antislash', { SITE_BASE: '/shelf\\private/' }],
  ['préfixe avec segment vide', { SITE_BASE: '/shelf//projects/' }],
];

// Chaque paire définit une entrée refusée ; les messages d'erreur restent lisibles.
for (const [name, env] of invalidCases) {
  // ----------------------------------------------------------------------------
  // Refuse la configuration courante plutôt que de la corriger silencieusement.
  // ----------------------------------------------------------------------------
  test(name, function rejectsInvalidConfiguration() {
    assert.throws(() => loadSiteConfig(env), /SITE_/);
  });
}
