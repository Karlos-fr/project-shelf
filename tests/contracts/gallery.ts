// ============================================================================
// GalleryCases — Contrats de recherche, de langue et d'adresses partageables
// ----------------------------------------------------------------------------
// Ces cas portent sur les fonctions pures, sans simuler React ou l'historique.
// Les données ci-dessous sont fictives et n'alimentent pas le catalogue public.
// ============================================================================
import assert from 'node:assert/strict';
import { MESSAGES } from '../../src/i18n/messages.ts';
import { detectLocale, formatProjectDate } from '../../src/domain/locale.ts';
import { normalizeBasePath } from '../../src/domain/paths.ts';
import { parseRoute, formatRoute, assetUrl, type RouteState } from '../../src/domain/routes.ts';
import { normalizeSearch, selectProjects, sortCategories } from '../../src/domain/gallery.ts';
import { loadSiteConfig } from '../../src/config/site.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Produit un état de route neuf pour chaque scénario, sans mutable partagé.
// Paramètres : patch surcharge les seuls champs nécessaires au cas courant.
// Retour : état français sur l'accueil avec tri par mises à jour.
// ----------------------------------------------------------------------------
function route(patch: Partial<RouteState> = {}): RouteState {
  return { locale: 'fr', projectId: null, categories: [], sort: 'updated', q: '', ...patch };
}

// ----------------------------------------------------------------------------
// Enregistre les attentes de T4 et la compatibilité du préfixe avec T1.
// Paramètres : register est le runner natif ou Vitest, pas un substitut du navigateur.
// Effets de bord : enregistre des tests déterministes en mémoire.
// ----------------------------------------------------------------------------
export function registerGalleryTests(register: RegisterCase): void {
  // Préférences ordonnées : URL, choix explicite mémorisé, navigateur, anglais.
  const languages = [
    ['en', 'fr', ['fr-CA'], 'en'], ['fr', 'en', ['en-US'], 'fr'],
    [null, 'fr', ['en-US'], 'fr'], [null, 'en', ['fr'], 'en'],
    [null, null, ['de-DE', 'fr-CA'], 'fr'], [null, null, ['en-US', 'fr'], 'en'],
    [null, null, ['fr-CA', 'en'], 'fr'], [null, 'invalid', ['fr'], 'fr'],
    [null, 'FR', ['en'], 'en'], [null, null, ['FR-ca'], 'fr'],
    [null, null, ['fr_XX', 'de'], 'en'], [null, null, ['de-DE'], 'en'],
    [null, null, [], 'en'], [null, null, [''], 'en'],
  ] as const;
  // Chaque ligne conserve l'ordre original des préférences du navigateur.
  for (const [explicit, saved, browser, expected] of languages) {
    // ----------------------------------------------------------------------------
    // Vérifie une sélection de langue sans géolocalisation ou accès au stockage.
    // ----------------------------------------------------------------------------
    register(`langue ${JSON.stringify([explicit, saved, browser])}`, function languageCase() {
      assert.equal(detectLocale(explicit, saved, browser), expected);
    });
  }
  // Préfixes canoniques : les encodages UTF-8 sûrs ne sont pas des traversées.
  const prefixes = [
    ['/', '/'], ['/shelf', '/shelf/'], ['/shelf/', '/shelf/'],
    ['/mes-projets/nested', '/mes-projets/nested/'],
    ['/vitrine%20projets/', '/vitrine%20projets/'],
    ['/caf%c3%a9', '/caf%C3%A9/'], ['/café/', '/caf%C3%A9/'],
  ];
  // Les valeurs sont figées par cas ; le normaliseur ne les corrige pas en place.
  for (const [value, expected] of prefixes) {
    // ----------------------------------------------------------------------------
    // Vérifie une représentation URL unique du montage statique.
    // ----------------------------------------------------------------------------
    register(`préfixe ${value}`, function prefixCase() {
      assert.equal(normalizeBasePath(value!), expected);
    });
  }
  // Préfixes dont la normalisation pourrait sortir du montage autorisé.
  const invalidPrefixes = ['', 'shelf', '//shelf', '/a//b', '/a/../b', '/%2e%2e/', '/%252e%252e/', '/a%2fb/', '/a\\b', '/a?b', '/a#b', '/a%00b', '/a b'];
  // Le rejet est contrôlé pour chaque forme, avant toute réduction par URL.
  for (const value of invalidPrefixes) {
    // ----------------------------------------------------------------------------
    // Exige un rejet, sans transformer silencieusement l'entrée en racine.
    // ----------------------------------------------------------------------------
    register(`préfixe refusé ${JSON.stringify(value)}`, function invalidPrefixCase() {
      // ----------------------------------------------------------------------------
      // Soumet le préfixe interdit sans laisser URL en effacer la traversée.
      // Erreurs : l’assertion attend une exception ; aucune valeur invalide n’est publiée.
      // ----------------------------------------------------------------------------
      assert.throws(function rejectPrefix() { normalizeBasePath(value); }, /préfixe/i);
    });
  }
  // ----------------------------------------------------------------------------
  // Contrôle l'accord entre le montage de build et celui des liens clients.
  // ----------------------------------------------------------------------------
  register('configuration et routes acceptent le même préfixe UTF-8', function encodedConfigCase() {
    assert.equal(loadSiteConfig({ SITE_BASE: '/caf%C3%A9/' }).base, '/caf%C3%A9/');
  });
  // ----------------------------------------------------------------------------
  // Vérifie le tri, la déduplication et l'omission des paramètres par défaut.
  // ----------------------------------------------------------------------------
  register('sérialise les critères de manière canonique', function canonicalQueryCase() {
    // Les doublons de catégorie ne doivent pas créer plusieurs URL équivalentes.
    const original = route({ categories: ['windows', 'audio', 'audio'], q: ' a & b/é ' });
    // L'URL synthétique sert seulement à inspecter les paramètres produits.
    const parsed = new URL(formatRoute(original, '/shelf/'), 'https://example.test');
    assert.equal(parsed.pathname, '/shelf/fr/');
    assert.equal(parsed.searchParams.get('categories'), 'audio,windows');
    assert.equal(parsed.searchParams.get('q'), 'a & b/é');
    assert.equal(parsed.searchParams.has('sort'), false);
    assert.deepEqual(original.categories, ['windows', 'audio', 'audio']);
  });
  // ----------------------------------------------------------------------------
  // Vérifie que la fiche conserve les critères et le préfixe lors de l'aller-retour.
  // ----------------------------------------------------------------------------
  register('restaure la route projet complète', function routeRoundTripCase() {
    // État localisé réel du contrat, contenant volontairement des caractères réservés.
    const expected = route({ projectId: 'example-audio', categories: ['audio', 'windows'], sort: 'created', q: 'C++ & écran #1' });
    // L'encodage du montage doit rester identique en entrée et en sortie.
    const url = new URL(formatRoute(expected, '/caf%C3%A9/'), 'https://example.test');
    assert.deepEqual(parseRoute(url, '/café/', ['audio', 'windows']), expected);
  });
  // ----------------------------------------------------------------------------
  // Vérifie les valeurs par défaut et l'exclusion des paramètres inconnus.
  // ----------------------------------------------------------------------------
  register('ignore critères inconnus et paramètres sans contrat', function unknownQueryCase() {
    // Des catégories répétées via plusieurs paramètres sont combinées puis dédupliquées.
    const url = new URL('https://example.test/en/?categories=unknown,audio&categories=windows,audio&sort=bad&q=test&secret=never');
    assert.deepEqual(parseRoute(url, '/', ['audio', 'windows']), route({ locale: 'en', categories: ['audio', 'windows'], q: 'test' }));
  });
  // Routes qui ne doivent pas être transformées en accueil de succès.
  const invalidRoutes = ['/shelf/en/other/', '/shelf/de/', '/shelf/fr/projects/', '/shelf/fr/projects/A/', '/shelf/fr/projects/a/extra/', '/other/en/', '/shelfish/en/', '/shelf/fr/projects/%2F/'];
  // Chaque cas est interprété dans le même montage de référence.
  for (const path of invalidRoutes) {
    // ----------------------------------------------------------------------------
    // Préserve la possibilité d'une vraie 404 pour une syntaxe de route inconnue.
    // ----------------------------------------------------------------------------
    register(`route inconnue ${path}`, function unknownRouteCase() {
      assert.equal(parseRoute(new URL(path, 'https://example.test'), '/shelf/', []), null);
    });
  }
  // ----------------------------------------------------------------------------
  // Contrôle l'accueil racine anglais et les chemins sans barre finale.
  // ----------------------------------------------------------------------------
  register('comprend racine et route canonisable', function rootRouteCase() {
    assert.deepEqual(parseRoute(new URL('https://example.test/shelf/'), '/shelf/', []), route({ locale: 'en' }));
    assert.deepEqual(parseRoute(new URL('https://example.test/shelf/fr'), '/shelf/', []), route());
  });
  // ----------------------------------------------------------------------------
  // Refuse de produire une adresse à partir d'un identifiant non conforme.
  // ----------------------------------------------------------------------------
  register('ne sérialise pas de slug dangereux', function badSlugCase() {
    // ----------------------------------------------------------------------------
    // Soumet un identifiant hors contrat au sérialiseur de route.
    // Erreurs : l’assertion attend une exception ; aucune valeur invalide n’est publiée.
    // ----------------------------------------------------------------------------
    assert.throws(function badProject() { formatRoute(route({ projectId: '../secret' }), '/'); });
  });
  // ----------------------------------------------------------------------------
  // Vérifie l'absence de double préfixe et de téléchargement des médias externes.
  // ----------------------------------------------------------------------------
  register('résout un média local ou HTTPS', function assetCase() {
    assert.equal(assetUrl('/media/écran.webp', '/shelf/'), '/shelf/media/%C3%A9cran.webp');
    assert.equal(assetUrl('https://cdn.example.test/a.mp4?v=2', '/shelf/'), 'https://cdn.example.test/a.mp4?v=2');
    // ----------------------------------------------------------------------------
    // Soumet une traversée locale au résolveur public de média.
    // Erreurs : l’assertion attend une exception ; aucune valeur invalide n’est publiée.
    // ----------------------------------------------------------------------------
    assert.throws(function traversalAsset() { assetUrl('/media/../secret', '/'); });
    // ----------------------------------------------------------------------------
    // Soumet un schéma exécutable pour contrôler le refus de publication.
    // Erreurs : l’assertion attend une exception ; aucune valeur invalide n’est publiée.
    // ----------------------------------------------------------------------------
    assert.throws(function activeAsset() { assetUrl('javascript:alert(1)', '/'); });
  });
  // ----------------------------------------------------------------------------
  // Vérifie la neutralité de la recherche vis-à-vis de la casse et des accents.
  // ----------------------------------------------------------------------------
  register('normalise la recherche sans changer les données publiées', function normalizedSearchCase() {
    assert.equal(normalizeSearch('  ÉCRAN\tAudio  '), 'ecran audio');
    assert.equal(normalizeSearch('é e\u0301'), 'e e');
  });
  // Résumés publics fictifs, gelés afin de détecter toute mutation de la sélection.
  const projects = Object.freeze([
    Object.freeze({ id: 'a', categories: ['audio'], createdAt: '2026-09-01', updatedAt: '2026-09-06', searchText: 'Écran audio windows', marker: 1 }),
    Object.freeze({ id: 'b', categories: ['windows'], createdAt: '2026-09-02', updatedAt: '2026-09-04', searchText: 'outil fenêtre native', marker: 2 }),
    Object.freeze({ id: 'c', categories: ['web'], createdAt: '2026-09-03', updatedAt: '2026-09-06', searchText: 'browser écran web', marker: 3 }),
    Object.freeze({ id: 'd', categories: ['audio', 'web'], createdAt: '2026-09-01', updatedAt: '2026-09-06', searchText: 'web musique fenêtre', marker: 4 }),
  ]);
  // Résultats attendus : OR entre catégories, AND avec chaque mot de recherche.
  const selections: readonly [Partial<RouteState>, readonly string[]][] = [
    [{}, ['c', 'a', 'd', 'b']], [{ sort: 'created' }, ['c', 'b', 'a', 'd']],
    [{ categories: ['audio', 'windows'] }, ['a', 'd', 'b']],
    [{ categories: ['audio'], q: 'WINDOWS ECRAN' }, ['a']],
    [{ q: 'fenetre' }, ['d', 'b']], [{ q: 'écran web' }, ['c']],
    [{ categories: ['windows'], q: 'web' }, []], [{ q: 'introuvable' }, []],
    [{ q: '  \n\t ' }, ['c', 'a', 'd', 'b']],
  ];
  // Une sélection retourne les objets d'origine dans un nouveau tableau ordonné.
  for (const [state, expected] of selections) {
    // ----------------------------------------------------------------------------
    // Vérifie une combinaison des critères et la conservation du type des résumés.
    // ----------------------------------------------------------------------------
    register(`sélection ${JSON.stringify(state)}`, function selectionCase() {
      assert.deepEqual(selectProjects(projects, route(state)).map(projectId), expected);
      assert.equal(selectProjects(projects, route())[0]!.marker, 3);
      assert.equal(projects[0]!.id, 'a');
    });
  }
  // ----------------------------------------------------------------------------
  // Vérifie le tri des traductions indépendamment de l'identifiant stable.
  // ----------------------------------------------------------------------------
  register('trie les catégories selon la langue active', function categoryOrderCase() {
    // En anglais Audio précède Zoo ; en français Alphabet précède Zèbre.
    const categories = Object.freeze([
      { id: 'a', label: { en: 'Audio', fr: 'Zèbre' } },
      { id: 'z', label: { en: 'Zoo', fr: 'Alphabet' } },
    ]);
    assert.deepEqual(sortCategories(categories, 'en').map(projectId), ['a', 'z']);
    assert.deepEqual(sortCategories(categories, 'fr').map(projectId), ['z', 'a']);
    assert.equal(categories[0]!.id, 'a');
  });
  // ----------------------------------------------------------------------------
  // Vérifie l'affichage UTC d'une date de projet, sans jour précédent implicite.
  // ----------------------------------------------------------------------------
  register('formate les dates calendaires en UTC', function dateFormatCase() {
    assert.equal(formatProjectDate('2026-09-06', 'en'), 'Sep 6, 2026');
    assert.match(formatProjectDate('2026-09-06', 'fr'), /^6 /);
    // ----------------------------------------------------------------------------
    // Soumet une date impossible au formateur localisé.
    // Erreurs : l’assertion attend une exception ; aucune valeur invalide n’est publiée.
    // ----------------------------------------------------------------------------
    assert.throws(function invalidDate() { formatProjectDate('2026-02-30', 'en'); });
  });
}

// ----------------------------------------------------------------------------
// Extrait uniquement l'identifiant pour comparer l'ordre d'une sélection.
// Paramètres : item représente un résumé ou une catégorie de fixture.
// Retour : identifiant stable, sans modifier l'objet reçu.
// ----------------------------------------------------------------------------
function projectId(item: { id: string }): string { return item.id; }

// ----------------------------------------------------------------------------
// Enregistre les contrôles de cohérence des libellés communs aux deux langues.
// Paramètres : register est le runner ; effets : enregistre les cas sans rendu UI.
// ----------------------------------------------------------------------------
export function registerMessagesTests(register: RegisterCase): void {
  // ----------------------------------------------------------------------------
  // Vérifie que les libellés indispensables existent dans les deux dictionnaires.
  // ----------------------------------------------------------------------------
  register('libellés FR et EN complets et distincts', function messagesCase() {
    assert.equal(MESSAGES.en.featured, 'Featured');
    assert.equal(MESSAGES.fr.featured, 'À la une');
    assert.equal(MESSAGES.en.allProjects, 'All projects');
    assert.equal(MESSAGES.fr.allProjects, 'Tous les projets');
    assert.deepEqual(Object.keys(MESSAGES.fr).sort(), Object.keys(MESSAGES.en).sort());
    // La traduction ne peut pas être une chaîne vide acceptée par accident.
    for (const value of [...Object.values(MESSAGES.en), ...Object.values(MESSAGES.fr)]) assert.ok(value.trim());
  });
}
