// ============================================================================
// BuildOptionsCases — Contrats de paramètres du build statique portable
// ----------------------------------------------------------------------------
// Ces tests vérifient la priorité CLI/environnement sans lancer Astro ni écrire dist.
// ============================================================================
import assert from 'node:assert/strict';
import { parseBuildOptions } from '../../scripts/build-options.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios d'options de build auprès du runner actif.
// ----------------------------------------------------------------------------
export function registerBuildOptionsTests(register: RegisterCase): void {
  register('utilise preview par défaut sans origine supposée', defaultCase);
  register('donne priorité aux flags sur l environnement', precedenceCase);
  register('accepte fixture explicitement', fixtureCase);
  register('refuse option inconnue ou valeur manquante', invalidCase);
}

// ----------------------------------------------------------------------------
// Vérifie le mode local sûr utilisé par npm run build sans argument.
// ----------------------------------------------------------------------------
function defaultCase(): void {
  assert.deepEqual(parseBuildOptions([], {}), { mode: 'preview', base: '/', fixture: false });
}

// ----------------------------------------------------------------------------
// Vérifie que l'appel explicite détermine la cible sans dépendre de variables héritées.
// ----------------------------------------------------------------------------
function precedenceCase(): void {
  assert.deepEqual(parseBuildOptions(
    ['--mode', 'production', '--origin', 'https://site.example', '--base', '/shelf/'],
    { SITE_MODE: 'preview', SITE_ORIGIN: 'https://old.example', SITE_BASE: '/old/' },
  ), { mode: 'production', origin: 'https://site.example', base: '/shelf/', fixture: false });
}

// ----------------------------------------------------------------------------
// Vérifie le chargement exclusif des données synthétiques demandé par les tests.
// ----------------------------------------------------------------------------
function fixtureCase(): void {
  assert.deepEqual(parseBuildOptions(['--fixture'], {}), { mode: 'preview', base: '/', fixture: true });
}

// ----------------------------------------------------------------------------
// Vérifie les erreurs de syntaxe avant toute suppression ou création de fichier.
// ----------------------------------------------------------------------------
function invalidCase(): void {
  assert.throws(() => parseBuildOptions(['--unknown'], {}), /inconnue/i);
  assert.throws(() => parseBuildOptions(['--origin'], {}), /valeur/i);
  assert.throws(() => parseBuildOptions(['--mode', 'release'], {}), /mode/i);
}
