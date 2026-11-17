// ============================================================================
// MediaCoordinatorContext — Partage React de l'arbitre de lecteurs
// ----------------------------------------------------------------------------
// Une seule instance par ShowcaseApp décide quel lecteur peut jouer. Les composants
// n'instancient jamais leur propre arbitre concurrent.
// ============================================================================
import { createContext, useContext } from 'react';
import type { MediaCoordinator } from './coordinator.ts';

// Valeur nulle hors ShowcaseApp afin de détecter un montage incomplet en développement.
export const MediaCoordinatorContext = createContext<MediaCoordinator | null>(null);

// ----------------------------------------------------------------------------
// Retourne l'arbitre courant ou signale qu'un composant média est hors provider.
// ----------------------------------------------------------------------------
export function useMediaCoordinator(): MediaCoordinator {
  const coordinator = useContext(MediaCoordinatorContext);
  if (coordinator === null) throw new Error('MediaCoordinatorProvider absent.');
  return coordinator;
}
