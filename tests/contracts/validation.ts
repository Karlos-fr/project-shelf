// ============================================================================
// ValidationCases — Contrats sémantiques réutilisables du catalogue
// ----------------------------------------------------------------------------
// Les cas s'exécutent avec Node ou Vitest sans simuler Zod ni son analyse d'objet.
// Ils contrôlent les dates et adresses avant leur réutilisation dans le schéma.
// ============================================================================
import assert from 'node:assert/strict';
import { isCalendarDate, isSlug, isPositiveNumber, isSafeHttpsUrl, isLocalMediaPath } from '../../src/domain/validation.ts';

export type RegisterCase = (name: string, run: () => void | Promise<void>) => unknown;

// ----------------------------------------------------------------------------
// Enregistre la même matrice auprès du runner réellement choisi.
// Paramètres : register reçoit un titre et la fonction de test correspondante.
// Effets de bord : ajoute des cas au runner, sans réseau ni écriture sur disque.
// ----------------------------------------------------------------------------
export function registerValidationTests(register: RegisterCase): void {
  // Dates réelles et pièges de normalisation automatique de Date.
  const dates: readonly [unknown, boolean][] = [
    ['2026-09-06', true], ['2024-02-29', true], ['2000-02-29', true],
    ['1900-02-29', false], ['2026-02-29', false], ['2026-02-30', false],
    ['2026-04-31', false], ['2026-13-01', false], ['2026-00-01', false],
    ['2026-01-00', false], ['2026-9-6', false], ['2026-09-06T00:00:00Z', false],
    ['0000-01-01', false], ['0001-01-01', true], ['9999-12-31', true],
    ['', false], [' 2026-09-06', false], [null, false], [20260906, false],
  ];
  // Chaque donnée est vérifiée isolément pour identifier précisément une régression.
  for (const [value, expected] of dates) {
    // ----------------------------------------------------------------------------
    // Vérifie une date sans accepter les reports silencieux au mois suivant.
    // ----------------------------------------------------------------------------
    register(`date ${JSON.stringify(value)}`, function calendarCase() {
      assert.equal(isCalendarDate(value), expected);
    });
  }
  // Identifiants partageables dans les deux langues et leurs variantes refusées.
  const slugs: readonly [unknown, boolean][] = [
    ['audio', true], ['project-2', true], ['a', true], ['2', true],
    ['A', false], ['démo', false], ['-demo', false], ['demo-', false],
    ['demo--test', false], ['demo_test', false], ['a/b', false],
    ['../x', false], ['', false], ['x\n', false], [undefined, false],
  ];
  // Une constante de boucle décrit ici une seule ligne de la table d'identifiants.
  for (const [value, expected] of slugs) {
    // ----------------------------------------------------------------------------
    // Vérifie que l'identifiant possède une forme ASCII stable.
    // ----------------------------------------------------------------------------
    register(`slug ${JSON.stringify(value)}`, function slugCase() {
      assert.equal(isSlug(value), expected);
    });
  }
  // Bornes numériques communes aux durées et dimensions ; pas de coercition.
  const numbers: readonly [unknown, boolean][] = [
    [1, true], [0.5, true], [0, false], [-1, false],
    [NaN, false], [Infinity, false], [-Infinity, false], ['12', false], [null, false],
  ];
  // La valeur NaN est nommée explicitement plutôt que sérialisée comme null.
  for (const [value, expected] of numbers) {
    // ----------------------------------------------------------------------------
    // Vérifie qu'une valeur numérique est finie et strictement positive.
    // ----------------------------------------------------------------------------
    register(`nombre ${String(value)} (${typeof value})`, function numberCase() {
      assert.equal(isPositiveNumber(value), expected);
    });
  }
  // Liens externes : domaines synthétiques, encodages et schémas actifs refusés.
  const links: readonly [unknown, boolean][] = [
    ['https://example.test', true], ['HTTPS://EXAMPLE.TEST/demo', true],
    ['https://cdn.example.test/a.mp4?version=2#demo', true],
    ['https://example.test/caf%C3%A9', true], ['https://example.test/a%20b', true],
    ['http://example.test', false], ['//example.test', false],
    ['javascript:alert(1)', false], ['data:text/html,hello', false],
    ['https:example.test', false], ['https:///example.test', false],
    ['https://user:secret@example.test', false], ['https://@example.test', false],
    ['https://example.test/a/../private', false], ['https://example.test/%2e%2e/private', false],
    ['https://example.test/%252e%252e/private', false], ['https://example.test/a\\b', false],
    ['https://example.test/%5cprivate', false], ['https://example.test/%0a', false],
    ['https://example.test/%', false], ['https://example.test/\n', false],
    [' https://example.test', false], ['https://example.test/a b', false],
    ['', false], [null, false],
  ];
  // Les URL n'ouvrent aucune connexion ; seuls leur contrat et leur syntaxe sont testés.
  for (const [value, expected] of links) {
    // ----------------------------------------------------------------------------
    // Vérifie qu'un lien peut être publié sans schéma actif ni normalisation cachée.
    // ----------------------------------------------------------------------------
    register(`HTTPS ${JSON.stringify(value)}`, function httpsCase() {
      assert.equal(isSafeHttpsUrl(value), expected);
    });
  }
  // Chemins logiques de médias : aucune sortie du répertoire ni double décodage.
  const paths: readonly [unknown, boolean][] = [
    ['/media/a/poster.webp', true], ['/media/caf%C3%A9/aper%C3%A7u.webp', true],
    ['/media/a%20b.webp', true], ['/media/écran.webp', true],
    ['/media/', false], ['/media', false], ['/media/a/', false],
    ['/media/a//b', false], ['/media/../secret', false], ['/media/./a', false],
    ['/media/%2e%2e/secret', false], ['/media/%252e%252e/secret', false],
    ['/media/a%2fb', false], ['/media/%5csecret', false], ['/media/a\\b', false],
    ['/media/a%00b', false], ['/media/a?x=1', false], ['/media/a#x', false],
    ['//example.test/media/a', false], ['media/a', false], ['/private/a', false],
    ['/media/a%ZZ', false], ['/media/a%25name', false], ['/media/a b', false],
    [null, false],
  ];
  // Chaque adresse représente un média distinct, pas un appel à un serveur.
  for (const [value, expected] of paths) {
    // ----------------------------------------------------------------------------
    // Vérifie la frontière logique du répertoire de médias.
    // ----------------------------------------------------------------------------
    register(`média ${JSON.stringify(value)}`, function mediaCase() {
      assert.equal(isLocalMediaPath(value), expected);
    });
  }
}
