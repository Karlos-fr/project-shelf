// ============================================================================
// CrashGuard — Marque de session posée pendant le chargement d'une scène 3D
// ----------------------------------------------------------------------------
// Si le navigateur ferme l'onglet faute de mémoire pendant le chargement, la marque
// reste en place : au rechargement, la page garde sa version HTML au lieu de relancer
// la scène et de boucler. Le stockage bloqué désactive simplement le garde-fou.
// ============================================================================

// Délai après lequel une scène qui tourne prouve que l'onglet a survécu.
export const CRASH_GRACE_MS = 6000;

export function readCrashFlag(key: string): boolean {
  try { return window.sessionStorage.getItem(key) === '1'; } catch { return false; }
}

export function writeCrashFlag(key: string, on: boolean): void {
  try {
    if (on) window.sessionStorage.setItem(key, '1');
    else window.sessionStorage.removeItem(key);
  } catch {
    // Stockage bloqué (navigation privée stricte) : pas de garde-fou, la scène se charge quand même.
  }
}
