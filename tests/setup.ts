// ============================================================================
// TestSetup — Assertions DOM, APIs navigateur minimales et nettoyage des composants
// ----------------------------------------------------------------------------
// L'environnement jsdom reste opt-in par fichier ; les fonctions pures restent Node.
// Seules les API absentes de jsdom mais requises par les composants sont émulees.
// ============================================================================
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// ----------------------------------------------------------------------------
// Construit une MediaQueryList stable pour jsdom, sans prétendre détecter de vraies
// capacités navigateur. Paramètres : query est la requête CSS demandée.
// Retour : objet toujours non apparié avec écouteurs no-op compatibles composants.
// ----------------------------------------------------------------------------
function createMatchMediaResult(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  };
}

// ----------------------------------------------------------------------------
// Fournit matchMedia uniquement lorsque jsdom expose window sans cette API.
// Effets de bord : installe un fallback déterministe dans les seuls tests DOM.
// ----------------------------------------------------------------------------
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: createMatchMediaResult,
  });
}

// ----------------------------------------------------------------------------
// Démonte les composants entre deux tests DOM pour éviter les fuites d'abonnements.
// Effets de bord : nettoie le document de jsdom, uniquement lorsqu'il existe.
// ----------------------------------------------------------------------------
afterEach(function cleanupRenderedComponents() {
  if (typeof document !== 'undefined') cleanup();
});
