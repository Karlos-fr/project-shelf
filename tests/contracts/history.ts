// ============================================================================
// NavigationHistoryCases — Contrats d'historique et de continuité de galerie
// ----------------------------------------------------------------------------
// Ces tests utilisent un faux Window déterministe. Ils contrôlent les écritures
// d'historique sans navigateur réel, rendu React, stockage persistant ou réseau.
// ============================================================================
import assert from 'node:assert/strict';
import { createNavigation, readNavigationRestoreState } from '../../src/navigation/history.ts';
import type { SiteConfig } from '../../src/config/site.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios d'historique auprès du runner actif.
// ----------------------------------------------------------------------------
export function registerHistoryTests(register: RegisterCase): void {
  register('regroupe les frappes d une recherche dans une entrée', searchSessionCase);
  register('ouvre un projet puis Retour restaure la galerie', openBackCase);
  register('ferme une arrivée directe par remplacement vers la galerie', directCloseCase);
  register('change de langue sans perdre projet ni critères', localeCase);
  register('popstate relit la route sans nouvelle écriture', popstateCase);
  register('dispose retire l écouteur de navigation', disposeCase);
  register('expose seulement le contexte de restauration possédé', restoreStateCase);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une session de saisie pousse une seule entrée puis la remplace.
// ----------------------------------------------------------------------------
function searchSessionCase(): void {
  const win = fakeWindow('https://example.test/en/');
  const navigation = createNavigation(win.window, config(), ['audio']);
  navigation.editSearch('a');
  navigation.editSearch('au');
  navigation.editSearch('audio');
  assert.equal(win.pushes, 1);
  assert.equal(win.currentUrl(), 'https://example.test/en/?q=audio');
  navigation.endSearchEdit();
  navigation.editSearch('audio x');
  assert.equal(win.pushes, 2);
}

// ----------------------------------------------------------------------------
// Vérifie l'ouverture depuis galerie et le retour natif vers la recherche précédente.
// ----------------------------------------------------------------------------
function openBackCase(): void {
  const win = fakeWindow('https://example.test/en/?q=audio');
  const navigation = createNavigation(win.window, config(), ['audio']);
  navigation.openProject('example-audio', 'card-example-audio');
  assert.equal(win.currentUrl(), 'https://example.test/en/projects/example-audio/?q=audio');
  navigation.closeProject();
  assert.equal(win.currentUrl(), 'https://example.test/en/?q=audio');
  assert.equal(navigation.getRoute().projectId, null);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une fiche ouverte directement se ferme sans sortir du site.
// ----------------------------------------------------------------------------
function directCloseCase(): void {
  const win = fakeWindow('https://example.test/fr/projects/example-audio/?categories=audio');
  const navigation = createNavigation(win.window, config(), ['audio']);
  navigation.closeProject();
  assert.equal(win.currentUrl(), 'https://example.test/fr/?categories=audio');
  assert.equal(win.backs, 0);
}

// ----------------------------------------------------------------------------
// Vérifie qu'un changement de langue est un remplacement conservant l'état partageable.
// ----------------------------------------------------------------------------
function localeCase(): void {
  const win = fakeWindow('https://example.test/en/projects/example-audio/?categories=audio&q=x');
  const navigation = createNavigation(win.window, config(), ['audio']);
  const pushesBefore = win.pushes;
  navigation.switchLocale('fr');
  assert.equal(win.currentUrl(), 'https://example.test/fr/projects/example-audio/?categories=audio&q=x');
  assert.equal(win.pushes, pushesBefore);
  assert.equal(win.savedLocale, 'fr');
}

// ----------------------------------------------------------------------------
// Vérifie qu'un événement Retour met à jour le contrôleur sans push/replace supplémentaire.
// ----------------------------------------------------------------------------
function popstateCase(): void {
  const win = fakeWindow('https://example.test/en/');
  const navigation = createNavigation(win.window, config(), ['audio']);
  navigation.openProject('example-audio', 'card');
  const writes = win.pushes + win.replaces;
  win.history.back();
  assert.equal(navigation.getRoute().projectId, null);
  assert.equal(win.pushes + win.replaces, writes);
}

// ----------------------------------------------------------------------------
// Vérifie qu'un contrôleur détruit ne réagit plus aux événements popstate.
// ----------------------------------------------------------------------------
function disposeCase(): void {
  const win = fakeWindow('https://example.test/en/');
  const navigation = createNavigation(win.window, config(), ['audio']);
  let notifications = 0;
  navigation.subscribe(() => { notifications += 1; });
  navigation.openProject('example-audio', 'card');
  navigation.dispose();
  const before = notifications;
  win.history.back();
  assert.equal(notifications, before);
}

// ----------------------------------------------------------------------------
// Vérifie que le contexte de restauration ne lit jamais un état History étranger.
// ----------------------------------------------------------------------------
function restoreStateCase(): void {
  assert.deepEqual(readNavigationRestoreState({
    owner: 'project-shelf', entryId: 2, canBackClose: false, scrollY: 320, triggerId: 'card-example',
  }), { scrollY: 320, triggerId: 'card-example' });
  assert.equal(readNavigationRestoreState({ owner: 'other', scrollY: 1, triggerId: 'x' }), null);
}

// ----------------------------------------------------------------------------
// Produit la configuration de navigation synthétique sans accès réseau.
// ----------------------------------------------------------------------------
function config(): SiteConfig {
  return {
    origin: 'https://example.test', base: '/', mode: 'production', name: 'ProjectShelf',
    intro: { en: 'Projects', fr: 'Projets' }, githubUrl: 'https://github.com/example',
  };
}

type FakeHarness = {
  window: Window;
  history: History;
  pushes: number;
  replaces: number;
  backs: number;
  savedLocale: string | null;
  currentUrl(): string;
};

// ----------------------------------------------------------------------------
// Crée le sous-ensemble de Window/History nécessaire au contrôleur.
// Paramètres : initialUrl est l'adresse chargée avant hydratation.
// Retour : harnais avec compteurs d'écritures et déclenchement synchrone de popstate.
// ----------------------------------------------------------------------------
function fakeWindow(initialUrl: string): FakeHarness {
  type Entry = { url: string; state: unknown };
  const entries: Entry[] = [{ url: initialUrl, state: null }];
  let index = 0;
  let pushes = 0;
  let replaces = 0;
  let backs = 0;
  let savedLocale: string | null = null;
  const listeners = new Set<(event: PopStateEvent) => void>();
  const location = { get href() { return entries[index]!.url; } } as Location;
  const history = {
    get state() { return entries[index]!.state; },
    pushState(state: unknown, _unused: string, url?: string | URL | null) {
      pushes += 1;
      entries.splice(index + 1);
      entries.push({ url: new URL(String(url), entries[index]!.url).href, state });
      index = entries.length - 1;
    },
    replaceState(state: unknown, _unused: string, url?: string | URL | null) {
      replaces += 1;
      entries[index] = { url: new URL(String(url), entries[index]!.url).href, state };
    },
    back() {
      backs += 1;
      if (index === 0) return;
      index -= 1;
      for (const listener of listeners) listener({ state: entries[index]!.state } as PopStateEvent);
    },
  } as unknown as History;
  const localStorage = {
    setItem(_key: string, value: string) { savedLocale = value; },
  } as Storage;
  const window = {
    location, history, localStorage, scrollY: 320,
    addEventListener(type: string, listener: EventListener) {
      if (type === 'popstate') listeners.add(listener as (event: PopStateEvent) => void);
    },
    removeEventListener(type: string, listener: EventListener) {
      if (type === 'popstate') listeners.delete(listener as (event: PopStateEvent) => void);
    },
  } as unknown as Window;
  return {
    window,
    history,
    get pushes() { return pushes; },
    get replaces() { return replaces; },
    get backs() { return backs; },
    get savedLocale() { return savedLocale; },
    currentUrl() { return entries[index]!.url; },
  };
}
