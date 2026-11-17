// ============================================================================
// FeaturedMachine — Politique pure de rotation du carrousel
// ----------------------------------------------------------------------------
// Cette machine ne lance ni vidéo ni minuterie. Le composant lui transmet les
// événements réels et conserve séparément la politique de lecture des médias.
// ============================================================================
export type FeaturedState = {
  count: number; active: number; userPaused: boolean;
  hover: boolean; suspended: boolean; ended: boolean;
};
export type FeaturedEvent =
  | { type: 'ended' } | { type: 'pause' } | { type: 'resume' }
  | { type: 'hover'; value: boolean } | { type: 'suspend'; value: boolean }
  | { type: 'manual'; index: number } | { type: 'keyboard-focus' };

// ----------------------------------------------------------------------------
// Prépare la rotation à l'initialisation de la sélection éditoriale.
// Paramètres : count est le nombre de Featured ; reducedMotion interdit l'automatisme initial.
// Retour : état neuf ; aucune vidéo n'est démarrée par cette opération.
// Erreurs : refuse un nombre de projets négatif, non entier ou non fini.
// ----------------------------------------------------------------------------
export function createFeaturedState(count: number, reducedMotion: boolean): FeaturedState {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Nombre de projets invalide.');
  return { count, active: 0, userPaused: reducedMotion, hover: false, suspended: false, ended: false };
}

// ----------------------------------------------------------------------------
// Applique un événement sans modifier l'état reçu ni perdre une pause volontaire.
// Paramètres : state vient de cette machine ; event est une interaction ou fin réelle.
// Retour : état suivant ; une fin retenue avance une seule fois lorsque les blocages cessent.
// Erreurs : refuse un index manuel invalide ou un événement hors contrat.
// ----------------------------------------------------------------------------
export function reduceFeatured(state: FeaturedState, event: FeaturedEvent): FeaturedState {
  let next: FeaturedState;
  switch (event.type) {
    case 'ended': next = { ...state, ended: state.count > 1 }; break;
    case 'pause': case 'keyboard-focus': next = { ...state, userPaused: true }; break;
    case 'resume': next = { ...state, userPaused: false }; break;
    case 'hover': next = { ...state, hover: event.value }; break;
    case 'suspend': next = { ...state, suspended: event.value }; break;
    case 'manual':
      next = { ...state, active: circularIndex(event.index, state.count), ended: false, userPaused: true };
      break;
    default: throw new Error('Événement Featured invalide.');
  }
  if (next.count > 1 && next.ended && !next.userPaused && !next.hover && !next.suspended) {
    return { ...next, active: (next.active + 1) % next.count, ended: false };
  }
  return next;
}

// ----------------------------------------------------------------------------
// Sélectionne l'actif puis au plus deux posters sans dupliquer un projet.
// Paramètres : ids est une sélection unique et ordonnée ; active son index circulaire.
// Retour : nouvelle liste de zéro à trois identifiants, sans modifier ids.
// Erreurs : refuse un index non entier ou des identifiants dupliqués dans la sélection.
// ----------------------------------------------------------------------------
export function visibleFeaturedIds(ids: readonly string[], active: number): string[] {
  if (new Set(ids).size !== ids.length) throw new Error('Identifiants Featured dupliqués.');
  // L'index est contrôlé même lorsqu'aucune carte n'est présente.
  const first = circularIndex(active, ids.length);
  // La taille de fenêtre ne dépend pas du nombre total de Featured à faire défiler.
  const visible: string[] = [];
  for (let offset = 0; offset < Math.min(3, ids.length); offset += 1) {
    visible.push(ids[(first + offset) % ids.length]!);
  }
  return visible;
}

// ----------------------------------------------------------------------------
// Ramène un index entier dans une sélection circulaire, y compris vers l'arrière.
// Paramètres : index est le déplacement demandé ; count la taille validée de sélection.
// Retour : zéro pour la sélection vide, sinon un index compris dans ses limites.
// Erreurs : refuse les index fractionnaires ou non finis.
// ----------------------------------------------------------------------------
function circularIndex(index: number, count: number): number {
  if (!Number.isSafeInteger(index)) throw new RangeError('Index Featured invalide.');
  return count === 0 ? 0 : ((index % count) + count) % count;
}
