// ============================================================================
// FeaturedCases — Contrats de rotation accessibles et déterministes
// ----------------------------------------------------------------------------
// Les tests portent sur les états, pas sur un codec, une horloge ou un navigateur.
// Le contenu de test n'est jamais ajouté au catalogue publié.
// ============================================================================
import assert from 'node:assert/strict';
import { createFeaturedState, reduceFeatured, visibleFeaturedIds, type FeaturedEvent } from '../../src/featured/machine.ts';
import { selectFeaturedProjects } from '../../src/featured/order.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les transitions de T10 auprès de Node ou de Vitest.
// Paramètres : register est l'API d'enregistrement du runner disponible.
// Effets de bord : enregistre les tests ; n'installe aucune minuterie.
// ----------------------------------------------------------------------------
export function registerFeaturedTests(register: RegisterCase): void {
  // Nombre de cartes visible sans duplication, y compris au retour de boucle.
  const windows: readonly [readonly string[], number, readonly string[]][] = [
    [[], 0, []], [['a'], 0, ['a']], [['a', 'b'], 0, ['a', 'b']],
    [['a', 'b'], 1, ['b', 'a']], [['a', 'b', 'c', 'd'], 0, ['a', 'b', 'c']],
    [['a', 'b', 'c', 'd'], 3, ['d', 'a', 'b']], [['a', 'b', 'c'], -1, ['c', 'a', 'b']],
  ];
  // Chaque fenêtre conserve l'ordre circulaire du catalogue de Featured.
  for (const [ids, active, expected] of windows) {
    // ----------------------------------------------------------------------------
    // Vérifie les projets visibles sans remplir artificiellement trois cartes.
    // ----------------------------------------------------------------------------
    register(`fenêtre Featured ${ids.length}/${active}`, function visibleCase() {
      assert.deepEqual(visibleFeaturedIds(ids, active), expected);
    });
  }
  // Valeurs qui ne représentent pas un nombre exploitable de projets.
  const invalidCounts = [-1, 1.5, NaN, Infinity];
  // Le domaine refuse un compteur invalide au lieu de créer une boucle incohérente.
  for (const count of invalidCounts) {
    // ----------------------------------------------------------------------------
    // Vérifie l'invariant de compteur entier positif ou nul.
    // ----------------------------------------------------------------------------
    register(`compteur Featured refusé ${String(count)}`, function countCase() {
      // ----------------------------------------------------------------------------
      // Soumet un compteur invalide au constructeur pour constater son rejet.
      // Erreurs : l’assertion attend une exception ; aucune valeur invalide n’est publiée.
      // ----------------------------------------------------------------------------
      assert.throws(function invalidCount() { createFeaturedState(count, false); });
    });
  }
  // ----------------------------------------------------------------------------
  // Retient la fin de lecture sous la souris, puis avance à sa sortie.
  // ----------------------------------------------------------------------------
  register('attend la sortie du survol après la fin', function hoverCase() {
    let state = createFeaturedState(4, false);
    state = reduceFeatured(state, { type: 'hover', value: true });
    state = reduceFeatured(state, { type: 'ended' });
    assert.equal(state.active, 0);
    assert.equal(state.ended, true);
    state = reduceFeatured(state, { type: 'hover', value: false });
    assert.equal(state.active, 1);
    assert.equal(state.ended, false);
  });
  // ----------------------------------------------------------------------------
  // Conserve une pause volontaire lorsque la fiche ou l'onglet rend la main.
  // ----------------------------------------------------------------------------
  register('ne reprend pas une rotation arrêtée volontairement', function stickyPauseCase() {
    let state = createFeaturedState(4, false);
    state = reduceFeatured(state, { type: 'pause' });
    state = reduceFeatured(state, { type: 'suspend', value: true });
    state = reduceFeatured(state, { type: 'ended' });
    state = reduceFeatured(state, { type: 'suspend', value: false });
    assert.equal(state.active, 0);
    assert.equal(state.userPaused, true);
    state = reduceFeatured(state, { type: 'resume' });
    assert.equal(state.active, 1);
  });
  // ----------------------------------------------------------------------------
  // Arrête la rotation après une interaction clavier et un choix manuel.
  // ----------------------------------------------------------------------------
  register('clavier et navigation manuelle exigent une reprise explicite', function manualCase() {
    let state = createFeaturedState(4, false);
    state = reduceFeatured(state, { type: 'manual', index: -1 });
    assert.equal(state.active, 3);
    assert.equal(state.userPaused, true);
    state = reduceFeatured(state, { type: 'ended' });
    state = reduceFeatured(state, { type: 'keyboard-focus' });
    assert.equal(state.active, 3);
    state = reduceFeatured(state, { type: 'resume' });
    assert.equal(state.active, 0);
  });
  // ----------------------------------------------------------------------------
  // Empêche une fin ancienne de déplacer la nouvelle sélection manuelle.
  // ----------------------------------------------------------------------------
  register('la sélection manuelle annule la fin en attente', function pendingEndCase() {
    let state = reduceFeatured(createFeaturedState(4, false), { type: 'pause' });
    state = reduceFeatured(state, { type: 'ended' });
    state = reduceFeatured(state, { type: 'manual', index: 2 });
    state = reduceFeatured(state, { type: 'resume' });
    assert.equal(state.active, 2);
    assert.equal(state.ended, false);
  });
  // ----------------------------------------------------------------------------
  // Respecte la préférence initiale de réduction des animations.
  // ----------------------------------------------------------------------------
  register('réduction des animations sans lancement automatique', function reducedMotionCase() {
    let state = createFeaturedState(3, true);
    assert.equal(state.userPaused, true);
    state = reduceFeatured(state, { type: 'ended' });
    assert.equal(state.active, 0);
    state = reduceFeatured(state, { type: 'resume' });
    assert.equal(state.active, 1);
  });
  // ----------------------------------------------------------------------------
  // Vérifie qu'aucune rotation fictive n'est produite pour zéro ou un projet.
  // ----------------------------------------------------------------------------
  register('ne tourne pas avec zéro ou un projet', function singleCase() {
    // Les deux extrêmes utilisent la même séquence d'événements utilisateur.
    for (const count of [0, 1]) {
      let state = createFeaturedState(count, false);
      state = reduceFeatured(state, { type: 'ended' });
      state = reduceFeatured(state, { type: 'resume' });
      assert.equal(state.active, 0);
      assert.equal(state.ended, false);
    }
  });
  // ----------------------------------------------------------------------------
  // Vérifie ordre éditorial, date et id, sans déplacer les objets de l'appelant.
  // ----------------------------------------------------------------------------
  register('ordonne la sélection Featured indépendamment de la grille', function featuredOrderCase() {
    // Les égalités volontaires forcent chaque niveau de départage.
    const entries = Object.freeze([
      { id: 'z', featured: true, updatedAt: '2026-09-06' },
      { id: 'b', featured: true, updatedAt: '2026-09-06', featuredOrder: 1 },
      { id: 'a', featured: true, updatedAt: '2026-09-06', featuredOrder: 1 },
      { id: 'old', featured: true, updatedAt: '2026-09-01', featuredOrder: 1 },
      { id: 'first', featured: true, updatedAt: '2026-09-01', featuredOrder: 0 },
      { id: 'hidden-from-featured', featured: false, updatedAt: '2026-09-06', featuredOrder: -1 },
    ]);
    assert.deepEqual(selectFeaturedProjects(entries).map(entryId), ['first', 'a', 'b', 'old', 'z']);
    assert.equal(entries[0]!.id, 'z');
  });
  // ----------------------------------------------------------------------------
  // Explore les états atteignables sans horloge pour détecter les reprises indues.
  // ----------------------------------------------------------------------------
  register('préserve les invariants sur les séquences de transitions', function transitionGraphCase() {
    // Événements représentatifs couvrant tous les axes indépendants de pause.
    const events: FeaturedEvent[] = [
      { type: 'ended' }, { type: 'pause' }, { type: 'resume' },
      { type: 'hover', value: true }, { type: 'hover', value: false },
      { type: 'suspend', value: true }, { type: 'suspend', value: false },
      { type: 'manual', index: 1 }, { type: 'keyboard-focus' },
    ];
    // Chaque taille donne un graphe fini ; aucune attente ni hasard n'intervient.
    for (const count of [0, 1, 2, 5]) {
      // File des états déjà découverts pour cette taille.
      const queue = [createFeaturedState(count, false), createFeaturedState(count, true)];
      // Signatures utilisées seulement pour borner l'exploration de test.
      const visited = new Set<string>();
      while (queue.length) {
        // L'objet gelé rend toute mutation du reducer immédiatement visible.
        const state = Object.freeze(queue.shift()!);
        // La signature ne contient que le contrat d'état public de la machine.
        const key = JSON.stringify(state);
        if (visited.has(key)) continue;
        visited.add(key);
        // Chaque événement est appliqué à la même entrée immuable.
        for (const event of events) {
          // Le résultat doit respecter les invariants même après une longue séquence.
          const next = reduceFeatured(state, event);
          assert.equal(next.count, count);
          assert.ok(next.active >= 0 && next.active < Math.max(1, count));
          if (state.userPaused && event.type !== 'resume') assert.equal(next.userPaused, true);
          if (event.type !== 'manual' && !state.ended && event.type !== 'ended') assert.equal(next.active, state.active);
          if (count < 2) assert.equal(next.active, 0);
          queue.push(next);
        }
      }
    }
  });
}

// ----------------------------------------------------------------------------
// Extrait l'identifiant d'une entrée de test sans dépendre du modèle complet.
// Paramètres : entry est une entrée minimale ; retour : identifiant stable.
// ----------------------------------------------------------------------------
function entryId(entry: { id: string }): string { return entry.id; }
