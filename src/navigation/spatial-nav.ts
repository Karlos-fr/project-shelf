// ============================================================================
// SpatialNavigation — Déplacement du focus aux flèches, comme une télécommande
// ----------------------------------------------------------------------------
// pickNeighbor est pur : il choisit, parmi des rectangles, le plus proche dans une
// direction. installSpatialNavigation l'applique aux éléments marqués data-nav,
// seulement quand l'un d'eux a déjà le focus : les champs de saisie, les listes
// déroulantes et le défilement au clavier gardent leur comportement natif.
// ============================================================================

export type Direction = 'left' | 'right' | 'up' | 'down';
export type Box = { left: number; top: number; width: number; height: number };

// Correspondance entre touches fléchées et directions.
const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
};
// Poids de l'écart latéral : on préfère rester aligné plutôt que sauter en diagonale.
const CROSS_AXIS_WEIGHT = 2.2;

// ----------------------------------------------------------------------------
// Choisit l'élément le plus proche dans une direction donnée.
// Paramètres : from est la boîte focalisée ; candidates les autres boîtes.
// Retour : index du meilleur candidat, ou -1 si aucun n'est dans cette direction.
// ----------------------------------------------------------------------------
export function pickNeighbor(from: Box, candidates: readonly Box[], direction: Direction): number {
  const [dx, dy] = direction === 'left' ? [-1, 0] : direction === 'right' ? [1, 0] : direction === 'up' ? [0, -1] : [0, 1];
  const ax = from.left + from.width / 2;
  const ay = from.top + from.height / 2;
  let best = -1;
  let bestScore = Infinity;
  candidates.forEach((box, index) => {
    const bx = box.left + box.width / 2;
    const by = box.top + box.height / 2;
    const along = (bx - ax) * dx + (by - ay) * dy;
    if (along <= 4) return;
    const across = Math.abs((bx - ax) * dy + (by - ay) * dx);
    const score = along + across * CROSS_AXIS_WEIGHT;
    if (score < bestScore) { bestScore = score; best = index; }
  });
  return best;
}

// ----------------------------------------------------------------------------
// Active la navigation aux flèches sur le document.
// Paramètres : doc est le document courant (injecté pour les tests).
// Retour : fonction de nettoyage retirant l'écouteur.
// Effets de bord : déplace le focus et fait défiler jusqu'à l'élément choisi.
// ----------------------------------------------------------------------------
export function installSpatialNavigation(doc: Document): () => void {
  // Traite une touche fléchée lorsque le focus est déjà sur un élément navigable.
  function onKeyDown(event: KeyboardEvent): void {
    const direction = KEY_DIRECTIONS[event.key];
    if (direction === undefined || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = doc.activeElement;
    if (!(current instanceof HTMLElement) || !current.hasAttribute('data-nav')) return;
    // Une popin ouverte restreint la navigation à son contenu.
    const scope: ParentNode = current.closest('dialog') ?? doc;
    const items = [...scope.querySelectorAll<HTMLElement>('[data-nav]')]
      .filter((item) => item !== current && item.getClientRects().length > 0 && item.closest('[aria-hidden="true"], [inert]') === null);
    const index = pickNeighbor(current.getBoundingClientRect(), items.map((item) => item.getBoundingClientRect()), direction);
    const target = items[index];
    if (target === undefined) return;
    event.preventDefault();
    target.focus();
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  doc.addEventListener('keydown', onKeyDown);
  return () => doc.removeEventListener('keydown', onKeyDown);
}
