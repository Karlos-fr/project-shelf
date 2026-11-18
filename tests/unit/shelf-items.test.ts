// ============================================================================
// ShelfItemsTests — Sélection et placement des objets de l'étagère
// ----------------------------------------------------------------------------
// Ces tests utilisent les résumés publics synthétiques et un jeu d'objets dédié.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { layoutShelf, selectShelfItems, type ShelfObject } from '../../src/shelf/shelf-items.ts';
import { publishedFixture } from '../fixtures/catalogue.ts';

// Objets fictifs : une boîte et un écran, attribués aux deux premiers résumés de fixture.
function objectsFor(ids: readonly string[]): Record<string, ShelfObject> {
  const box: ShelfObject = { kind: 'case', size: [0.19, 0.248, 0.026], front: 'a.jpg', back: 'b.jpg', spine: 'c.jpg' };
  return Object.fromEntries(ids.map((id, index) => [id, index % 2 === 0 ? box : { kind: 'tv' }]));
}

describe('selectShelfItems', () => {
  it('ne garde que les projets qui ont un objet, dans l’ordre de la une', () => {
    const summaries = publishedFixture().summaries;
    const ids = summaries.slice(0, 2).map((project) => project.id);
    const items = selectShelfItems(summaries, objectsFor(ids));
    expect(items.map((item) => item.project.id).sort()).toEqual([...ids].sort());
    const orders = items.map((item) => item.project.featuredOrder ?? Number.MAX_SAFE_INTEGER);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('ne rend rien quand aucun projet n’a d’objet', () => {
    expect(selectShelfItems(publishedFixture().summaries, {})).toEqual([]);
  });

  it('respecte la limite d’objets posés', () => {
    const summaries = publishedFixture().summaries;
    const items = selectShelfItems(summaries, objectsFor(summaries.map((project) => project.id)), 1);
    expect(items).toHaveLength(1);
  });
});

describe('layoutShelf', () => {
  it('répartit les objets avec des intervalles égaux à l’intérieur de la planche', () => {
    const centers = layoutShelf([0.2, 0.4, 0.2], 2);
    expect(centers).toHaveLength(3);
    const gap = (2 - 0.8) / 4;
    expect(centers[0]).toBeCloseTo(-1 + gap + 0.1);
    expect(centers[2]).toBeCloseTo(1 - gap - 0.1);
    expect(centers[1]).toBeCloseTo(0);
  });

  it('renvoie une liste vide sans objet', () => {
    expect(layoutShelf([], 2)).toEqual([]);
  });
});
