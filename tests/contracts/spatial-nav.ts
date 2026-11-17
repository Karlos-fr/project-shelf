// ============================================================================
// SpatialNavCases — Contrats du choix de voisin pour la navigation aux flèches
// ----------------------------------------------------------------------------
// Ces tests manipulent des rectangles synthétiques, sans DOM ni navigateur.
// ============================================================================
import assert from 'node:assert/strict';
import { pickNeighbor, type Box } from '../../src/navigation/spatial-nav.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios de navigation spatiale auprès du runner actif.
// ----------------------------------------------------------------------------
export function registerSpatialNavTests(register: RegisterCase): void {
  register('choisit le voisin aligné plutôt que le plus proche en diagonale', alignedCase);
  register('ignore les éléments situés dans la direction opposée', oppositeCase);
  register('passe de l index de la scène à la grille vers le bas', downCase);
}

// Fabrique un rectangle de 100 × 40 à la position donnée.
function box(left: number, top: number): Box { return { left, top, width: 100, height: 40 }; }

// ----------------------------------------------------------------------------
// Vérifie qu'à droite, la carte de la même rangée gagne sur une carte décalée.
// ----------------------------------------------------------------------------
function alignedCase(): void {
  assert.equal(pickNeighbor(box(0, 0), [box(130, 90), box(260, 0)], 'right'), 1);
}

// ----------------------------------------------------------------------------
// Vérifie qu'aucun voisin n'est proposé sans candidat dans la direction.
// ----------------------------------------------------------------------------
function oppositeCase(): void {
  assert.equal(pickNeighbor(box(200, 0), [box(0, 0), box(200, -100)], 'right'), -1);
}

// ----------------------------------------------------------------------------
// Vérifie la descente des titres de la scène vers la première carte.
// ----------------------------------------------------------------------------
function downCase(): void {
  assert.equal(pickNeighbor(box(40, 500), [box(1200, 520), box(40, 900), box(400, 900)], 'down'), 1);
}
