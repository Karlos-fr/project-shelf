// ============================================================================
// ContentContractTests — Cohérence du guide éditorial avec le schéma exécutable
// ----------------------------------------------------------------------------
// Ces tests relisent l’exemple Markdown au lieu de maintenir une fixture parallèle.
// Ils vérifient aussi qu’un dépôt privé peut produire une fiche publique indexable.
// ============================================================================
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseCatalogue } from '../../src/domain/schema.ts';
import { publishCatalogue } from '../../scripts/publish-catalogue.ts';
import { fixtureCategories, minimalProject } from '../fixtures/catalogue.ts';

// Marqueurs stables entourant l’unique bloc JSON vérifié du modèle documentaire.
const EXAMPLE_PATTERN = /PROJECT_SHELF_EXAMPLE_BEGIN[\s\S]*?```json\s*([\s\S]*?)\s*```[\s\S]*?PROJECT_SHELF_EXAMPLE_END/u;

describe('contrat éditorial', () => {
  // ----------------------------------------------------------------------------
  // Refuse une provenance interne ajoutée à un projet destiné au catalogue.
  // ----------------------------------------------------------------------------
  it('refuse un champ interne non déclaré', () => {
    const project = { ...minimalProject(), internalNotes: 'PRIVATE_NOTE_CANARY' };
    expect(() => parseCatalogue({ categories: fixtureCategories, projects: [project] })).toThrow();
  });

  // ----------------------------------------------------------------------------
  // Parse le JSON réellement publié dans la documentation avec le schéma du produit.
  // ----------------------------------------------------------------------------
  it('valide l exemple documentaire avec le parseur unique', async () => {
    const markdown = await readFile('docs/project-entry-template.md', 'utf8');
    const match = EXAMPLE_PATTERN.exec(markdown);
    expect(match?.[1]).toBeDefined();
    expect(() => parseCatalogue(JSON.parse(match?.[1] ?? 'null'))).not.toThrow();
  });

  // ----------------------------------------------------------------------------
  // Vérifie qu’une fiche indexable n’expose pas l’URL de son dépôt privé.
  // ----------------------------------------------------------------------------
  it('publie une fiche privée indexable sans URL de dépôt', () => {
    const project = minimalProject({ repositoryVisibility: 'private', indexable: true });
    const published = publishCatalogue(parseCatalogue({ categories: fixtureCategories, projects: [project] }));
    const detail = published.details[project.id];
    expect(detail?.indexable).toBe(true);
    expect(detail?.repositoryVisibility).toBe('private');
    expect(detail?.repositoryUrl).toBeUndefined();
  });
});
