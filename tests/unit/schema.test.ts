// ============================================================================
// ProjectSchemaUnit — Validation Zod du catalogue bilingue
// ----------------------------------------------------------------------------
// Ces tests exécutent le vrai schéma sur des fixtures synthétiques et strictes.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { parseCatalogue } from '../../src/domain/schema.ts';
import { fixtureCategories, minimalProject } from '../fixtures/catalogue.ts';

// Matrice ciblée des relations et champs qui ne sont pas couverts par les prédicats purs.
describe('parseCatalogue', () => {
  it('accepte un projet bilingue cohérent', () => {
    expect(parseCatalogue({ categories: fixtureCategories, projects: [minimalProject()] }).projects).toHaveLength(1);
  });
  it('refuse une mise à jour antérieure à la création', () => {
    expect(() => parseCatalogue({ categories: fixtureCategories, projects: [minimalProject({ updatedAt: '2026-08-31' })] })).toThrow(/updatedAt/);
  });
  it('refuse une date calendrier impossible', () => {
    expect(() => parseCatalogue({ categories: fixtureCategories, projects: [minimalProject({ createdAt: '2026-02-30' })] })).toThrow();
  });
  it('refuse une traduction manquante', () => {
    const project = minimalProject();
    const broken = { ...project, content: { en: project.content.en } };
    expect(() => parseCatalogue({ categories: fixtureCategories, projects: [broken] })).toThrow();
  });
  it('refuse une catégorie inconnue', () => {
    expect(() => parseCatalogue({ categories: fixtureCategories, projects: [minimalProject({ categories: ['unknown'] })] })).toThrow(/unknown/);
  });
  it('refuse un identifiant de projet dupliqué', () => {
    expect(() => parseCatalogue({ categories: fixtureCategories, projects: [minimalProject(), minimalProject()] })).toThrow(/dupliquée/);
  });
  it('refuse une URL active ou non HTTPS', () => {
    expect(() => parseCatalogue({ categories: fixtureCategories, projects: [minimalProject({ links: [{ type: 'demo', url: 'javascript:alert(1)' }] })] })).toThrow();
  });
  it('refuse tout champ éditorial non déclaré', () => {
    const project = { ...minimalProject(), internalNotes: 'PRIVATE_NOTE_CANARY' };
    expect(() => parseCatalogue({ categories: fixtureCategories, projects: [project] })).toThrow();
  });
});
