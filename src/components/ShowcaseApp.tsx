// ============================================================================
// ShowcaseApp — Composition SSR et état interactif principal de la vitrine
// ----------------------------------------------------------------------------
// Le rendu initial contient toute la galerie et une fiche directe éventuelle.
// Après hydratation, History et la popin reprennent l'interaction sans client-only.
// ============================================================================
import { useMemo } from 'react';
import type { SiteConfig } from '../config/site.ts';
import type { Category, ProjectSummary, PublicProject } from '../domain/project.ts';
import { selectProjects, sortCategories } from '../domain/gallery.ts';
import type { RouteState } from '../domain/routes.ts';
import { selectFeaturedProjects } from '../featured/order.ts';
import { MESSAGES } from '../i18n/messages.ts';
import { MediaCoordinatorContext } from '../media/context.tsx';
import { createMediaCoordinator } from '../media/coordinator.ts';
import { useShowcase } from '../navigation/useShowcase.ts';
import SiteHeader from './SiteHeader.tsx';
import FeaturedCarousel from './FeaturedCarousel.tsx';
import ProjectDetails from './ProjectDetails.tsx';
import ProjectFilters from './ProjectFilters.tsx';
import ProjectGrid from './ProjectGrid.tsx';
import ProjectModal from './ProjectModal.tsx';

export type ShowcaseAppProps = {
  config: SiteConfig;
  categories: Category[];
  summaries: ProjectSummary[];
  initialRoute: RouteState;
  initialProject?: PublicProject;
};

// ----------------------------------------------------------------------------
// Rend header, Featured, filtres, grille SSR et popin après hydratation.
// ----------------------------------------------------------------------------
export default function ShowcaseApp({ config, categories, summaries, initialRoute, initialProject }: ShowcaseAppProps) {
  const mediaCoordinator = useMemo(() => createMediaCoordinator(), []);
  const controller = useShowcase(config, categories, initialRoute, initialProject);
  const route = controller.route;
  // La navigation recrée le tableau à chaque route : une clé textuelle stabilise les critères.
  const categoryKey = route.categories.join(',');
  const gallery = useMemo(
    () => ({ categories: categoryKey ? categoryKey.split(',') : [], sort: route.sort, q: route.q }),
    [categoryKey, route.sort, route.q],
  );
  const sortedCategories = useMemo(() => sortCategories(categories, route.locale), [categories, route.locale]);
  const selected = useMemo(() => selectProjects(summaries, gallery), [summaries, gallery]);
  const featured = useMemo(() => selectFeaturedProjects(summaries), [summaries]);
  const messages = MESSAGES[route.locale];
  const projectForFallback = !controller.hydrated && initialProject?.id === route.projectId ? initialProject : undefined;

  return (
    <MediaCoordinatorContext.Provider value={mediaCoordinator}>
    <div className="site-shell" data-showcase-ready={controller.hydrated ? 'true' : 'false'}>
      <SiteHeader config={config} route={route} onSwitchLocale={controller.switchLocale} />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">ProjectShelf</p>
          <h1 id="hero-title">{config.intro[route.locale]}</h1>
        </section>
        {projectForFallback !== undefined && (
          <section className="direct-project" aria-label={projectForFallback.name}>
            <ProjectDetails project={projectForFallback} locale={route.locale} base={config.base} categories={categories} />
          </section>
        )}
        {featured.length > 0 && (
          <FeaturedCarousel projects={featured} route={route} base={config.base}
            suspended={route.projectId !== null} onOpen={controller.openProject} />
        )}
        <section className="all-projects" aria-labelledby="all-projects-title">
          <div className="section-heading"><h2 id="all-projects-title" tabIndex={-1}>{messages.allProjects}</h2></div>
          <ProjectFilters categories={sortedCategories} locale={route.locale} state={gallery}
            onChange={controller.updateGallery} onSearchCommit={controller.endSearchEdit} />
          <ProjectGrid projects={selected} route={route} base={config.base} onOpen={controller.openProject} />
        </section>
      </main>
      <footer className="site-footer"><span>ProjectShelf</span><a href={config.githubUrl}>GitHub</a></footer>
      {controller.hydrated && route.projectId !== null && (
        <ProjectModal projectId={route.projectId} categories={categories} project={controller.project?.id === route.projectId ? controller.project : undefined}
          locale={route.locale} base={config.base} loading={controller.loading} error={controller.error} onClose={controller.closeProject} onSwitchLocale={controller.switchLocale} />
      )}
    </div>
    </MediaCoordinatorContext.Provider>
  );
}
