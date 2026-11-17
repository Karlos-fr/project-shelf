// ============================================================================
// MediaCoordinatorCases — Contrats d'arbitrage entre lecteurs concurrents
// ----------------------------------------------------------------------------
// Ces scénarios vérifient les priorités, les reprises et le nettoyage sans DOM.
// Ils ne simulent ni lecture vidéo réelle ni préférences du navigateur.
// ============================================================================
import assert from 'node:assert/strict';
import { createMediaCoordinator } from '../../src/media/coordinator.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios communs auprès du runner réellement utilisé.
// Paramètres : register reçoit le titre et la fonction de chaque scénario.
// Effets de bord : enregistre seulement les tests ; aucune lecture média n'a lieu.
// ----------------------------------------------------------------------------
export function registerCoordinatorTests(register: RegisterCase): void {
  register('accorde le lecteur de plus forte priorité', priorityCase);
  register('réveille le lecteur en attente après libération', releaseCase);
  register('rend release idempotent', idempotentReleaseCase);
  register('suspend tous les lecteurs actifs', suspendCase);
  register('notifie uniquement les changements de propriétaire', subscriptionCase);
  register('met à jour une demande existante sans doubler son propriétaire', replacementCase);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une demande plus prioritaire interrompt le propriétaire précédent.
// ----------------------------------------------------------------------------
function priorityCase(): void {
  const coordinator = createMediaCoordinator();
  let featuredPauses = 0;
  const featured = coordinator.request('featured', 10, () => { featuredPauses += 1; });
  const hover = coordinator.request('hover:example-audio', 20, () => undefined);
  assert.equal(featured.isGranted(), false);
  assert.equal(hover.isGranted(), true);
  assert.equal(featuredPauses, 1);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une demande en attente reprend la propriété quand la priorité sort.
// ----------------------------------------------------------------------------
function releaseCase(): void {
  const coordinator = createMediaCoordinator();
  const featured = coordinator.request('featured', 10, () => undefined);
  const detail = coordinator.request('detail', 30, () => undefined);
  assert.equal(featured.isGranted(), false);
  detail.release();
  assert.equal(featured.isGranted(), true);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une double libération n'altère pas la prochaine demande accordée.
// ----------------------------------------------------------------------------
function idempotentReleaseCase(): void {
  const coordinator = createMediaCoordinator();
  const first = coordinator.request('hover:a', 20, () => undefined);
  first.release();
  first.release();
  const second = coordinator.request('featured', 10, () => undefined);
  assert.equal(second.isGranted(), true);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une suspension interrompt le propriétaire et garde les demandes prêtes.
// ----------------------------------------------------------------------------
function suspendCase(): void {
  const coordinator = createMediaCoordinator();
  let pauses = 0;
  const lease = coordinator.request('featured', 10, () => { pauses += 1; });
  coordinator.suspendAll();
  assert.equal(lease.isGranted(), false);
  assert.equal(pauses, 1);
  coordinator.resumeAll();
  assert.equal(lease.isGranted(), true);
}

// ----------------------------------------------------------------------------
// Vérifie que l'abonnement reflète les transitions utiles et se désabonne proprement.
// ----------------------------------------------------------------------------
function subscriptionCase(): void {
  const coordinator = createMediaCoordinator();
  let notifications = 0;
  const unsubscribe = coordinator.subscribe(() => { notifications += 1; });
  const low = coordinator.request('featured', 10, () => undefined);
  const high = coordinator.request('detail', 30, () => undefined);
  high.release();
  unsubscribe();
  low.release();
  assert.equal(notifications, 3);
}

// ----------------------------------------------------------------------------
// Vérifie qu'un même propriétaire remplace sa demande au lieu de créer un doublon.
// ----------------------------------------------------------------------------
function replacementCase(): void {
  const coordinator = createMediaCoordinator();
  let oldPauses = 0;
  let newPauses = 0;
  const first = coordinator.request('hover:a', 20, () => { oldPauses += 1; });
  const replacement = coordinator.request('hover:a', 40, () => { newPauses += 1; });
  assert.equal(first.isGranted(), false);
  assert.equal(replacement.isGranted(), true);
  coordinator.request('detail', 50, () => undefined);
  assert.equal(oldPauses, 0);
  assert.equal(newPauses, 1);
}
