// @vitest-environment jsdom
// ============================================================================
// CrashGuardTest — Marque de chargement des scènes 3D
// ----------------------------------------------------------------------------
// Vérifie que la version HTML n'est gardée qu'une fois après un plantage, et qu'un
// départ normal de la page (pagehide) efface la marque posée pendant le chargement.
// ============================================================================
import { afterEach, describe, expect, it } from 'vitest';
import { consumeCrashFlag, guardLoading, readCrashFlag, writeCrashFlag } from '../../src/shelf/crash-guard.ts';

// Clé de test, distincte de celles des pages.
const KEY = 'test:scene-loading';

describe('crash-guard', () => {
  // Chaque test part d'une session vide.
  afterEach(() => window.sessionStorage.clear());

  it('ne garde la version HTML qu’une fois après un chargement interrompu', () => {
    writeCrashFlag(KEY, true);
    expect(consumeCrashFlag(KEY)).toBe(true);
    expect(readCrashFlag(KEY)).toBe(false);
    expect(consumeCrashFlag(KEY)).toBe(false);
  });

  it('efface la marque quand la page est quittée normalement pendant le chargement', () => {
    const release = guardLoading(KEY);
    expect(readCrashFlag(KEY)).toBe(true);
    window.dispatchEvent(new Event('pagehide'));
    expect(readCrashFlag(KEY)).toBe(false);
    release();
  });

  it('efface la marque et oublie pagehide une fois libérée', () => {
    const release = guardLoading(KEY);
    release();
    expect(readCrashFlag(KEY)).toBe(false);
    writeCrashFlag(KEY, true);
    window.dispatchEvent(new Event('pagehide'));
    expect(readCrashFlag(KEY)).toBe(true);
  });
});
