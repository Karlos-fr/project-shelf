// ============================================================================
// XpAppsTests — Choix de la fenêtre lancée par chaque raccourci du bureau XP
// ----------------------------------------------------------------------------
// Ces tests utilisent le détail public synthétique et des catégories de fixture.
// ============================================================================
import { describe, expect, it } from 'vitest';
import type { PublicProject } from '../../src/domain/project.ts';
import { buildXpCatalog } from '../../src/xp/xp-apps.ts';
import { fixtureCategories, mediaProject, publicProjectFixture } from '../fixtures/catalogue.ts';

function withId(project: PublicProject, id: string, patch: Partial<PublicProject> = {}): PublicProject {
  return { ...structuredClone(project), id, ...patch };
}

describe('buildXpCatalog', () => {
  it('ouvre une démo en ligne dans Internet Explorer', () => {
    const project = withId(publicProjectFixture(), 'with-demo', { links: [{ type: 'demo', url: 'https://demo.example.test/' }] });
    const { apps } = buildXpCatalog([project], fixtureCategories, 'fr', '/');
    expect(apps['with-demo']).toMatchObject({ kind: 'browser', url: 'https://demo.example.test/' });
  });

  it('ouvre le Démineur dans sa propre fenêtre, sans navigateur', () => {
    const project = withId(publicProjectFixture(), 'minesweeper-infinite', { links: [{ type: 'demo', url: 'https://demo.example.test/' }] });
    const { apps } = buildXpCatalog([project], fixtureCategories, 'fr', '/');
    expect(apps['minesweeper-infinite']).toMatchObject({ kind: 'window', url: 'https://demo.example.test/' });
  });

  it('passe la vidéo au Lecteur Windows Media quand il n’y a pas de démo', () => {
    const project = withId(mediaProject(), 'with-video', { links: [] });
    const { apps } = buildXpCatalog([project], fixtureCategories, 'fr', '/shelf/');
    expect(apps['with-video']).toMatchObject({ kind: 'player', video: '/shelf/media/example/demo.mp4', poster: '/shelf/media/example/video-poster.webp' });
  });

  it('affiche la fiche du projet quand il n’a ni démo, ni vidéo, ni site', () => {
    const base = publicProjectFixture();
    const project = withId(base, 'bare', { links: [], media: [], preview: { poster: base.preview.poster } });
    const { apps } = buildXpCatalog([project], fixtureCategories, 'en', '/');
    expect(apps.bare).toMatchObject({ kind: 'browser', url: '/en/projects/bare/' });
  });

  it('range les projets dans un dossier par catégorie non vide, dans l’ordre donné', () => {
    const first = withId(publicProjectFixture(), 'first', { categories: ['games'] });
    const second = withId(publicProjectFixture(), 'second', { categories: ['games', 'web'] });
    const { order, folders } = buildXpCatalog([first, second], fixtureCategories, 'fr', '/');
    expect(order).toEqual(['first', 'second']);
    expect(folders).toEqual([
      { id: 'games', label: 'Jeux et portages', appIds: ['first', 'second'] },
      { id: 'web', label: 'Web', appIds: ['second'] },
    ]);
  });
});
