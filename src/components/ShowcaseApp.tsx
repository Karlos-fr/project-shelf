// ============================================================================
// ShowcaseApp — Composition SSR et état interactif principal de la vitrine
// ----------------------------------------------------------------------------
// Le rendu initial contient toute la galerie et une fiche directe éventuelle.
// Après hydratation, History et la popin reprennent l'interaction sans client-only.
// Les flèches déplacent le focus comme une télécommande, et l'ouverture d'une
// fiche fait grandir son média jusqu'à la popin quand le navigateur le permet.
// ============================================================================
import { useCallback, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import type { SiteConfig } from '../config/site.ts';
import type { Locale } from '../domain/locale.ts';
import type { Category, ProjectSummary, PublicProject } from '../domain/project.ts';
import { selectProjects, sortCategories } from '../domain/gallery.ts';
import type { RouteState } from '../domain/routes.ts';
import { selectFeaturedProjects } from '../featured/order.ts';
import { MESSAGES } from '../i18n/messages.ts';
import { MediaCoordinatorContext } from '../media/context.tsx';
import { createMediaCoordinator } from '../media/coordinator.ts';
import { installSpatialNavigation } from '../navigation/spatial-nav.ts';
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
  const [introLead, introRest] = splitIntro(config.intro[route.locale]);
  const { openProject, switchLocale } = controller;

  // Active la navigation aux flèches une seule fois, après hydratation.
  useEffect(() => installSpatialNavigation(document), []);

  // Change de langue avec une transition : le texte se fond en remontant légèrement,
  // la pastille EN/FR glisse, et les vidéos restent immobiles.
  const switchLocaleAnimated = useCallback((locale: Locale): void => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (locale === route.locale || typeof document.startViewTransition !== 'function' || reduced) {
      switchLocale(locale);
      return;
    }
    const root = document.documentElement;
    root.classList.add('is-switching-locale');
    const transition = document.startViewTransition(() => flushSync(() => switchLocale(locale)));
    transition.ready.catch(() => undefined);
    transition.finished.catch(() => undefined).finally(() => root.classList.remove('is-switching-locale'));
  }, [route.locale, switchLocale]);

  // Ouvre une fiche ; le média cliqué devient celui de la popin (View Transitions).
  const openWithTransition = useCallback((projectId: string, triggerId: string): void => {
    const trigger = document.getElementById(triggerId);
    const source = trigger?.closest('.project-card')?.querySelector<HTMLElement>('[data-vt-media]')
      ?? document.querySelector<HTMLElement>(`.featured-slide--active [data-vt-media="${projectId}"]`);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (source === null || source === undefined || typeof document.startViewTransition !== 'function' || reduced) {
      openProject(projectId, triggerId);
      return;
    }
    source.style.viewTransitionName = 'project-hero';
    const transition = document.startViewTransition(async () => {
      source.style.viewTransitionName = '';
      flushSync(() => openProject(projectId, triggerId));
      const target = await waitForElement('dialog.project-modal[open] .media-gallery__stage', 700);
      if (target !== null) target.style.viewTransitionName = 'project-hero';
    });
    // Une transition interrompue ne doit jamais remonter en erreur : la fiche est déjà ouverte.
    transition.ready.catch(() => undefined);
    transition.finished.catch(() => undefined).finally(() => {
      document.querySelectorAll<HTMLElement>('.media-gallery__stage').forEach((stage) => { stage.style.viewTransitionName = ''; });
    });
  }, [openProject]);

  return (
    <MediaCoordinatorContext.Provider value={mediaCoordinator}>
    <div className="site-shell" data-showcase-ready={controller.hydrated ? 'true' : 'false'}>
      <SiteHeader config={config} route={route} onSwitchLocale={switchLocaleAnimated} />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <h1 id="hero-title"><span>{introLead}</span>{introRest !== '' && <> <span className="hero__rest">{introRest}</span></>}</h1>
        </section>
        {projectForFallback !== undefined && (
          <section className="direct-project" aria-label={projectForFallback.name}>
            <ProjectDetails project={projectForFallback} locale={route.locale} base={config.base} categories={categories} />
          </section>
        )}
        {featured.length > 0 && (
          <FeaturedCarousel projects={featured} route={route} base={config.base}
            suspended={route.projectId !== null} onOpen={openWithTransition} />
        )}
        <section className="all-projects" aria-labelledby="all-projects-title">
          <div className="section-heading"><h2 id="all-projects-title" tabIndex={-1}>{messages.allProjects}</h2></div>
          <ProjectFilters categories={sortedCategories} locale={route.locale} state={gallery}
            onChange={controller.updateGallery} onSearchCommit={controller.endSearchEdit} />
          <ProjectGrid projects={selected} route={route} base={config.base} onOpen={openWithTransition} />
        </section>
      </main>
      <footer className="site-footer"><span>ProjectShelf</span><a href={config.githubUrl}>GitHub</a></footer>
      {controller.hydrated && route.projectId !== null && (
        <ProjectModal projectId={route.projectId} categories={categories} project={controller.project?.id === route.projectId ? controller.project : undefined}
          locale={route.locale} base={config.base} loading={controller.loading} error={controller.error} onClose={controller.closeProject} onSwitchLocale={switchLocaleAnimated} />
      )}
    </div>
    </MediaCoordinatorContext.Provider>
  );
}

// ----------------------------------------------------------------------------
// Sépare l'accroche en une phrase principale et un complément plus discret.
// Paramètres : intro est le texte traduit du site ; retour : [principal, reste].
// ----------------------------------------------------------------------------
function splitIntro(intro: string): [string, string] {
  const cut = intro.indexOf('. ');
  return cut === -1 ? [intro, ''] : [intro.slice(0, cut + 1), intro.slice(cut + 2)];
}

// ----------------------------------------------------------------------------
// Attend qu'un élément apparaisse, sans dépasser un délai maximal.
// Retour : l'élément trouvé, ou null si le délai est écoulé.
// ----------------------------------------------------------------------------
function waitForElement(selector: string, timeoutMs: number): Promise<HTMLElement | null> {
  const started = performance.now();
  return new Promise((resolve) => {
    // Vérifie toutes les 16 ms : pendant une View Transition, le navigateur ne
    // produit plus d'images, donc requestAnimationFrame ne serait jamais rappelé.
    function check(): void {
      const found = document.querySelector<HTMLElement>(selector);
      if (found !== null || performance.now() - started > timeoutMs) resolve(found);
      else setTimeout(check, 16);
    }
    check();
  });
}
