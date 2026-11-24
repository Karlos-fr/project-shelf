// ============================================================================
// CrashGuard — Marque de session posée pendant le chargement d'une scène 3D
// ----------------------------------------------------------------------------
// Si le navigateur ferme l'onglet faute de mémoire pendant le chargement, la marque
// reste en place : au rechargement, la page garde sa version HTML au lieu de relancer
// la scène et de boucler. La marque ne sert qu'une fois : la page suivante retente la
// 3D. Un départ normal de la page (rechargement, navigation) l'efface, car il prouve
// que l'onglet n'a pas planté. Le stockage bloqué désactive simplement le garde-fou.
// ============================================================================

// Délai après lequel une scène qui tourne prouve que l'onglet a survécu.
export const CRASH_GRACE_MS = 6000;

// ----------------------------------------------------------------------------
// Lit la marque de chargement de la session.
// Retour : vrai si un chargement précédent n'a pas abouti ; faux si le stockage est bloqué.
// ----------------------------------------------------------------------------
export function readCrashFlag(key: string): boolean {
  try { return window.sessionStorage.getItem(key) === '1'; } catch { return false; }
}

// ----------------------------------------------------------------------------
// Pose (on vrai) ou efface la marque de chargement. Sans stockage, ne fait rien.
// ----------------------------------------------------------------------------
export function writeCrashFlag(key: string, on: boolean): void {
  try {
    if (on) window.sessionStorage.setItem(key, '1');
    else window.sessionStorage.removeItem(key);
  } catch {
    // Stockage bloqué (navigation privée stricte) : pas de garde-fou, la scène se charge quand même.
  }
}

// ----------------------------------------------------------------------------
// Lit la marque et l'efface aussitôt : la version HTML n'est gardée qu'une fois, et un
// rechargement suivant retente la scène 3D.
// Retour : vrai si un chargement précédent n'a pas abouti.
// ----------------------------------------------------------------------------
export function consumeCrashFlag(key: string): boolean {
  const crashed = readCrashFlag(key);
  if (crashed) writeCrashFlag(key, false);
  return crashed;
}

// ----------------------------------------------------------------------------
// Pose la marque pendant un chargement et l'efface si la page est quittée normalement
// (pagehide : rechargement, lien, fermeture) : seul un onglet tué laisse la marque.
// Retour : fonction qui efface la marque et retire l'écouteur ; à appeler une fois la
// scène prouvée stable, en cas d'échec ou au démontage.
// ----------------------------------------------------------------------------
export function guardLoading(key: string): () => void {
  writeCrashFlag(key, true);
  // Départ normal de la page : l'onglet n'a pas planté.
  const onPageHide = () => writeCrashFlag(key, false);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    window.removeEventListener('pagehide', onPageHide);
    writeCrashFlag(key, false);
  };
}
