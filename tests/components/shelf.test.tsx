// @vitest-environment jsdom
// ============================================================================
// ProjectShelfComponent — Rendu sans scène 3D de la section « L'étagère »
// ----------------------------------------------------------------------------
// jsdom n'a ni WebGPU ni WebGL : on vérifie le HTML de repli (titre, liens) et
// l'absence de section quand aucun projet n'a d'objet.
// ============================================================================
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import ProjectShelf from '../../src/components/ProjectShelf.tsx';
import { createMediaCoordinator } from '../../src/media/coordinator.ts';
import { MediaCoordinatorContext } from '../../src/media/context.tsx';
import type { ProjectSummary } from '../../src/domain/project.ts';
import { publishedFixture, showcaseFixtureProps } from '../fixtures/catalogue.ts';

// Route d'accueil française complète, reprise des fixtures de la vitrine.
const route = { ...showcaseFixtureProps().initialRoute, locale: 'fr', projectId: null } as const;

// Monte l'étagère dans le même arbitre de lecture que l'application.
function renderShelf(projects: readonly ProjectSummary[]) {
  return render(
    <MediaCoordinatorContext.Provider value={createMediaCoordinator()}>
      <ProjectShelf projects={projects} route={route} base="/" suspended={false} />
    </MediaCoordinatorContext.Provider>,
  );
}

it('ne rend aucune section sans objet d’étagère', () => {
  const { container } = renderShelf(publishedFixture().summaries);
  expect(container.querySelector('.shelf')).toBeNull();
});

it('rend le titre et un lien par objet, utilisables sans scène 3D', () => {
  const summary = publishedFixture().summaries[0];
  if (summary === undefined) throw new Error('Fixture vide.');
  const project = { ...summary, id: 'quake2js', name: 'Quake2JS' };
  renderShelf([project]);
  expect(screen.getByRole('heading', { name: 'L’étagère' })).toBeVisible();
  const link = screen.getByRole('link', { name: 'Quake2JS' });
  expect(link).toHaveAttribute('href', '/fr/projects/quake2js/');
});
