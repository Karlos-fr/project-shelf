// ============================================================================
// UseShowcase — Orchestration React de la route, galerie et fiche courante
// ----------------------------------------------------------------------------
// Ce hook relie le contrôleur History, le chargeur JSON et SeoModel. Les fonctions
// pures restent dans leurs modules ; aucun catalogue source n'est lu côté client.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SiteConfig } from '../config/site.ts';
import type { Category, PublicProject } from '../domain/project.ts';
import type { GalleryState, RouteState } from '../domain/routes.ts';
import { detectLocale } from '../domain/locale.ts';
import { buildSeo } from '../seo/model.ts';
import { buildStructuredData } from '../seo/structured-data.ts';
import { syncHead } from '../seo/sync-head.ts';
import { loadProject } from './details-loader.ts';
import {
  createNavigation, LOCALE_STORAGE_KEY, readNavigationRestoreState, type NavigationController,
} from './history.ts';

export type ShowcaseController = {
  route: RouteState;
  project?: PublicProject;
  loading: boolean;
  error: boolean;
  hydrated: boolean;
  updateGallery(next: GalleryState): void;
  endSearchEdit(): void;
  openProject(id: string, triggerId: string): void;
  closeProject(): void;
  switchLocale(locale: 'en' | 'fr'): void;
};

// ----------------------------------------------------------------------------
// Crée l'état interactif d'une instance ShowcaseApp.
// Paramètres : config/catégories décrivent le public ; initialRoute/project viennent du SSR.
// Retour : contrôleur React stable dont les actions délèguent à History après montage.
// ----------------------------------------------------------------------------
export function useShowcase(
  config: SiteConfig,
  categories: readonly Category[],
  initialRoute: RouteState,
  initialProject?: PublicProject,
): ShowcaseController {
  const categoryIds = useMemo(() => categories.map((category) => category.id), [categories]);
  const [route, setRoute] = useState<RouteState>(initialRoute);
  const [project, setProject] = useState<PublicProject | undefined>(initialProject);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const navigationRef = useRef<NavigationController | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previousProjectIdRef = useRef<string | null>(initialRoute.projectId);

  // ----------------------------------------------------------------------------
  // Installe History une seule fois et applique la détection uniquement sur la racine.
  // Effets de bord : écoute popstate, peut remplacer / par /fr/ et nettoie au démontage.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const navigation = createNavigation(window, config, categoryIds);
    navigationRef.current = navigation;
    const syncRoute = () => setRoute(navigation.getRoute());
    const unsubscribe = navigation.subscribe(syncRoute);
    syncRoute();
    setHydrated(true);
    if (window.location.pathname === config.base) {
      let saved: string | null = null;
      try { saved = window.localStorage.getItem(LOCALE_STORAGE_KEY); } catch { saved = null; }
      const locale = detectLocale(null, saved, window.navigator.languages ?? []);
      if (locale !== navigation.getRoute().locale) navigation.switchLocale(locale);
    }
    return () => {
      abortRef.current?.abort();
      unsubscribe();
      navigation.dispose();
      navigationRef.current = null;
    };
  }, [config, categoryIds]);

  // ----------------------------------------------------------------------------
  // Charge le projet correspondant à la route et annule toute requête devenue obsolète.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const id = route.projectId;
    if (id === null) {
      abortRef.current?.abort();
      setProject(undefined);
      setLoading(false);
      setError(false);
      return;
    }
    if (project?.id === id) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setLoading(true);
    setError(false);
    void loadProject(id, config.base, controller.signal).then((loaded) => {
      if (controller.signal.aborted) return;
      setProject(loaded);
      setLoading(false);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setProject(undefined);
      setLoading(false);
      setError(true);
    });
    return () => controller.abort();
  }, [route.projectId, config.base, project?.id]);

  // ----------------------------------------------------------------------------
  // Restaure scroll et focus lorsqu'une fiche se ferme vers la galerie.
  // Effets de bord : défile la fenêtre et replace le focus sur la carte déclencheuse.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const previousProjectId = previousProjectIdRef.current;
    previousProjectIdRef.current = route.projectId;
    if (previousProjectId === null || route.projectId !== null) return;
    const restore = readNavigationRestoreState(window.history.state);
    if (restore !== null) window.scrollTo({ top: restore.scrollY });
    const target = restore?.triggerId === null || restore === null
      ? document.getElementById('all-projects-title')
      : document.getElementById(restore.triggerId);
    target?.focus();
  }, [hydrated, route.projectId]);

  // ----------------------------------------------------------------------------
  // Synchronise le head seulement lorsqu'une route projet possède son détail exact.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    if (route.projectId !== null && project?.id !== route.projectId) return;
    const structuredData = project === undefined ? [] : buildStructuredData(project, route.locale, config);
    syncHead(buildSeo(config, route, project), structuredData);
  }, [config, hydrated, project, route]);

  // ----------------------------------------------------------------------------
  // Applique un état de galerie en regroupant les frappes de recherche dans History.
  // ----------------------------------------------------------------------------
  const updateGallery = useCallback((next: GalleryState): void => {
    const navigation = navigationRef.current;
    if (navigation === null) return;
    const current = navigation.getRoute();
    const sameCategories = current.categories.length === next.categories.length
      && current.categories.every((id, index) => id === next.categories[index]);
    if (sameCategories && current.sort === next.sort && current.q !== next.q) navigation.editSearch(next.q);
    else {
      navigation.endSearchEdit();
      navigation.setGallery(next);
    }
  }, []);

  // ----------------------------------------------------------------------------
  // Termine explicitement une session de recherche sur blur ou Entrée.
  // ----------------------------------------------------------------------------
  const endSearchEdit = useCallback((): void => navigationRef.current?.endSearchEdit(), []);

  // ----------------------------------------------------------------------------
  // Ouvre une fiche à partir d'une carte native déjà identifiée.
  // ----------------------------------------------------------------------------
  const openProject = useCallback((id: string, triggerId: string): void => navigationRef.current?.openProject(id, triggerId), []);

  // ----------------------------------------------------------------------------
  // Ferme la fiche selon la provenance déterminée par le contrôleur History.
  // ----------------------------------------------------------------------------
  const closeProject = useCallback((): void => navigationRef.current?.closeProject(), []);

  // ----------------------------------------------------------------------------
  // Bascule de langue en conservant critères et projet courant.
  // ----------------------------------------------------------------------------
  const switchLocale = useCallback((locale: 'en' | 'fr'): void => navigationRef.current?.switchLocale(locale), []);

  return { route, project, loading, error, hydrated, updateGallery, endSearchEdit, openProject, closeProject, switchLocale };
}
