// ============================================================================
// NavigationHistory — Synchronisation URL, History API et état de galerie
// ----------------------------------------------------------------------------
// Ce contrôleur possède les écritures d'historique de ProjectShelf. Il ne charge
// aucun projet et ne manipule ni dialog, ni focus DOM, ni métadonnées de document.
// ============================================================================
import type { SiteConfig } from '../config/site.ts';
import type { Locale } from '../domain/locale.ts';
import { formatRoute, parseRoute, type GalleryState, type RouteState } from '../domain/routes.ts';

export type NavigationController = {
  getRoute(): RouteState;
  subscribe(listener: () => void): () => void;
  editSearch(q: string): void;
  endSearchEdit(): void;
  setGallery(state: GalleryState): void;
  openProject(id: string, triggerId: string): void;
  closeProject(): void;
  switchLocale(locale: Locale): void;
  dispose(): void;
};

export type NavigationRestoreState = {
  scrollY: number;
  triggerId: string | null;
};

type OwnedHistoryState = {
  owner: 'project-shelf';
  entryId: number;
  canBackClose: boolean;
  scrollY: number;
  triggerId: string | null;
};

// Clé de préférence locale ; son accès reste protégé contre les stockages indisponibles.
export const LOCALE_STORAGE_KEY = 'project-shelf-locale';

// ----------------------------------------------------------------------------
// Crée le contrôleur d'une page hydratée à partir de son URL déjà servie.
// Paramètres : win est la fenêtre propriétaire ; config fournit le montage ; categories
// contient uniquement les identifiants publics reconnus dans les paramètres.
// Retour : contrôleur à détruire lors du démontage de l'application.
// Erreurs : refuse une URL initiale qui ne correspond pas au contrat de routes.
// ----------------------------------------------------------------------------
export function createNavigation(
  win: Window,
  config: SiteConfig,
  categories: readonly string[],
): NavigationController {
  const initial = parseRoute(new URL(win.location.href), config.base, categories);
  if (initial === null) throw new Error('La route initiale ProjectShelf est invalide.');
  let route = initial;
  let searchEditing = false;
  let disposed = false;
  let entryId = 0;
  const listeners = new Set<() => void>();

  // ----------------------------------------------------------------------------
  // Retourne une copie de la route courante pour empêcher une mutation extérieure.
  // ----------------------------------------------------------------------------
  function getRoute(): RouteState {
    return { ...route, categories: [...route.categories] };
  }

  // ----------------------------------------------------------------------------
  // Abonne un observateur aux changements de route possédés ou reçus par popstate.
  // ----------------------------------------------------------------------------
  function subscribe(listener: () => void): () => void {
    if (disposed) throw new Error('Le contrôleur de navigation est détruit.');
    listeners.add(listener);
    let active = true;
    // --------------------------------------------------------------------------
    // Retire l'observateur de manière idempotente.
    // --------------------------------------------------------------------------
    return function unsubscribe(): void {
      if (!active) return;
      active = false;
      listeners.delete(listener);
    };
  }

  // ----------------------------------------------------------------------------
  // Met à jour la recherche en ne poussant qu'une entrée par session de saisie.
  // Paramètres : q est la valeur contrôlée du champ ; les autres critères sont conservés.
  // Effets de bord : push au premier caractère de session, replace ensuite.
  // ----------------------------------------------------------------------------
  function editSearch(q: string): void {
    assertActive();
    const next = { ...route, categories: [...route.categories], q };
    writeRoute(next, searchEditing ? 'replace' : 'push', false, null);
    searchEditing = true;
  }

  // ----------------------------------------------------------------------------
  // Termine la session de saisie afin que la prochaine modification crée une entrée.
  // ----------------------------------------------------------------------------
  function endSearchEdit(): void {
    searchEditing = false;
  }

  // ----------------------------------------------------------------------------
  // Applique catégories, tri et recherche en conservant langue et fiche éventuelle.
  // Paramètres : state provient des contrôles publics de galerie.
  // Effets de bord : pousse une étape de navigation explicite.
  // ----------------------------------------------------------------------------
  function setGallery(state: GalleryState): void {
    assertActive();
    searchEditing = false;
    writeRoute({ ...route, ...state, categories: [...state.categories] }, 'push', false, null);
  }

  // ----------------------------------------------------------------------------
  // Ouvre une fiche depuis la galerie tout en mémorisant scroll et déclencheur.
  // Paramètres : id est le slug validé par le catalogue public ; triggerId identifie la carte.
  // Effets de bord : remplace l'entrée galerie avec son contexte puis pousse la fiche.
  // ----------------------------------------------------------------------------
  function openProject(id: string, triggerId: string): void {
    assertActive();
    searchEditing = false;
    if (route.projectId === id) return;
    const currentState = ownedState(false, triggerId);
    win.history.replaceState(currentState, '', win.location.href);
    writeRoute({ ...route, categories: [...route.categories], projectId: id }, 'push', true, triggerId);
  }

  // ----------------------------------------------------------------------------
  // Ferme une fiche par Retour seulement lorsque son entrée vient de notre galerie.
  // Effets de bord : history.back pour une ouverture possédée ; sinon replace vers galerie.
  // ----------------------------------------------------------------------------
  function closeProject(): void {
    assertActive();
    if (route.projectId === null) return;
    searchEditing = false;
    const state = readOwnedState(win.history.state);
    if (state?.canBackClose) {
      win.history.back();
      return;
    }
    writeRoute({ ...route, categories: [...route.categories], projectId: null }, 'replace', false, null);
  }

  // ----------------------------------------------------------------------------
  // Change la langue sans modifier projet, filtres, tri ou recherche.
  // Paramètres : locale est une langue prise en charge ; effets : replace et mémorisation locale.
  // ----------------------------------------------------------------------------
  function switchLocale(locale: Locale): void {
    assertActive();
    if (locale !== 'en' && locale !== 'fr') throw new Error('Langue de navigation invalide.');
    searchEditing = false;
    writeRoute({ ...route, categories: [...route.categories], locale }, 'replace', false, null);
    try {
      win.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Un stockage refusé ne bloque jamais la navigation explicite de l'utilisateur.
    }
  }

  // ----------------------------------------------------------------------------
  // Détruit le contrôleur et ses abonnements sans modifier l'historique courant.
  // ----------------------------------------------------------------------------
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    win.removeEventListener('popstate', onPopState);
    listeners.clear();
    searchEditing = false;
  }

  // ----------------------------------------------------------------------------
  // Réagit à Retour/Suivant en relisant uniquement l'URL produite par le navigateur.
  // Effets de bord : notifie les abonnés sans écrire une nouvelle entrée.
  // ----------------------------------------------------------------------------
  function onPopState(): void {
    if (disposed) return;
    const next = parseRoute(new URL(win.location.href), config.base, categories);
    if (next === null) return;
    route = next;
    searchEditing = false;
    notify();
  }

  // ----------------------------------------------------------------------------
  // Écrit une route normalisée et met à jour l'état local avant notification.
  // Paramètres : method choisit push/replace ; canBackClose décrit seulement la fiche courante.
  // ----------------------------------------------------------------------------
  function writeRoute(
    next: RouteState,
    method: 'push' | 'replace',
    canBackClose: boolean,
    triggerId: string | null,
  ): void {
    const path = formatRoute(next, config.base);
    const state = ownedState(canBackClose, triggerId);
    if (method === 'push') win.history.pushState(state, '', path);
    else win.history.replaceState(state, '', path);
    route = { ...next, categories: [...next.categories] };
    notify();
  }

  // ----------------------------------------------------------------------------
  // Construit l'état privé de l'entrée sans exposer le catalogue dans History API.
  // ----------------------------------------------------------------------------
  function ownedState(canBackClose: boolean, triggerId: string | null): OwnedHistoryState {
    entryId += 1;
    return {
      owner: 'project-shelf',
      entryId,
      canBackClose,
      scrollY: Number.isFinite(win.scrollY) ? win.scrollY : 0,
      triggerId,
    };
  }

  // ----------------------------------------------------------------------------
  // Notifie une copie logique des abonnés afin qu'un désabonnement soit sûr en callback.
  // ----------------------------------------------------------------------------
  function notify(): void {
    for (const listener of [...listeners]) listener();
  }

  // ----------------------------------------------------------------------------
  // Refuse une commande après destruction afin de signaler une fuite de cycle de vie.
  // ----------------------------------------------------------------------------
  function assertActive(): void {
    if (disposed) throw new Error('Le contrôleur de navigation est détruit.');
  }

  win.addEventListener('popstate', onPopState);
  return {
    getRoute, subscribe, editSearch, endSearchEdit, setGallery,
    openProject, closeProject, switchLocale, dispose,
  };
}

// ----------------------------------------------------------------------------
// Lit uniquement les états History API explicitement marqués par ProjectShelf.
// Paramètres : value peut provenir d'une page externe ou d'un autre script.
// Retour : état possédé ou null ; aucune donnée inconnue n'est interprétée.
// ----------------------------------------------------------------------------
function readOwnedState(value: unknown): OwnedHistoryState | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<OwnedHistoryState>;
  if (candidate.owner !== 'project-shelf' || typeof candidate.canBackClose !== 'boolean') return null;
  if (typeof candidate.entryId !== 'number' || !Number.isFinite(candidate.entryId)) return null;
  if (typeof candidate.scrollY !== 'number' || !Number.isFinite(candidate.scrollY)) return null;
  if (candidate.triggerId !== null && typeof candidate.triggerId !== 'string') return null;
  return candidate as OwnedHistoryState;
}


// ----------------------------------------------------------------------------
// Extrait le contexte de restauration d'un état History possédé par ProjectShelf.
// Paramètres : value peut provenir du navigateur ou d'un script tiers.
// Retour : scroll et déclencheur publics pour l'UI, sinon null.
// ----------------------------------------------------------------------------
export function readNavigationRestoreState(value: unknown): NavigationRestoreState | null {
  const state = readOwnedState(value);
  if (state === null) return null;
  return { scrollY: state.scrollY, triggerId: state.triggerId };
}
