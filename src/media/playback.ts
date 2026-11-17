// ============================================================================
// MediaPlayback — Ordre de galerie et tentative de lecture vidéo
// ----------------------------------------------------------------------------
// Ce module ne gère ni priorité globale ni état React. Il fournit seulement les
// opérations communes dont les composants média ont besoin pour rester cohérents.
// ============================================================================
import type { ProjectMedia, PublicProject } from '../domain/project.ts';

// ----------------------------------------------------------------------------
// Place la première vidéo en tête tout en conservant l'ordre relatif des autres médias.
// Paramètres : project est un détail public déjà validé.
// Retour : nouveau tableau ; le tableau du projet n'est jamais muté.
// ----------------------------------------------------------------------------
export function orderMedia(project: PublicProject): ProjectMedia[] {
  const firstVideo = project.media.findIndex((media) => media.type === 'video');
  if (firstVideo <= 0) return [...project.media];
  const ordered = [...project.media];
  const [video] = ordered.splice(firstVideo, 1);
  if (video !== undefined) ordered.unshift(video);
  return ordered;
}

// ----------------------------------------------------------------------------
// Tente une lecture sans propager le refus d'autoplay du navigateur.
// Paramètres : video est l'élément dont la source a déjà été configurée.
// Retour : playing si play résout, blocked si la promesse est rejetée.
// Effets de bord : appelle uniquement HTMLMediaElement.play().
// ----------------------------------------------------------------------------
export async function tryPlay(video: HTMLVideoElement): Promise<'playing' | 'blocked'> {
  try {
    await video.play();
    return 'playing';
  } catch {
    return 'blocked';
  }
}
