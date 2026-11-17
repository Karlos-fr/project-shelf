// ============================================================================
// PlaybackCases — Contrats purs de sélection et tentative de lecture média
// ----------------------------------------------------------------------------
// Ces scénarios n'utilisent pas de codec ni de navigateur. Ils contrôlent l'ordre
// des médias et la gestion explicite d'une promesse play résolue ou rejetée.
// ============================================================================
import assert from 'node:assert/strict';
import { orderMedia, tryPlay } from '../../src/media/playback.ts';
import type { PublicProject } from '../../src/domain/project.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios de lecture auprès du runner actif.
// ----------------------------------------------------------------------------
export function registerPlaybackTests(register: RegisterCase): void {
  register('place la première vidéo avant les images sans réordonner le reste', mediaOrderCase);
  register('conserve un ordre sans vidéo', imageOrderCase);
  register('ne modifie pas le tableau média source', immutableOrderCase);
  register('signale une lecture accordée', allowedPlayCase);
  register('signale un autoplay bloqué sans propager le rejet', blockedPlayCase);
}

// ----------------------------------------------------------------------------
// Vérifie le déplacement de la seule première vidéo vers la tête de galerie.
// ----------------------------------------------------------------------------
function mediaOrderCase(): void {
  const project = mediaProject();
  assert.deepEqual(orderMedia(project).map((media) => media.src), [
    '/media/video.mp4', '/media/one.webp', '/media/two.webp', '/media/video-2.mp4',
  ]);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une galerie uniquement composée d'images garde son ordre éditorial.
// ----------------------------------------------------------------------------
function imageOrderCase(): void {
  const project = mediaProject();
  project.media = project.media.filter((media) => media.type === 'image');
  assert.deepEqual(orderMedia(project).map((media) => media.src), ['/media/one.webp', '/media/two.webp']);
}

// ----------------------------------------------------------------------------
// Vérifie que le réordonnancement ne mute jamais le catalogue public partagé.
// ----------------------------------------------------------------------------
function immutableOrderCase(): void {
  const project = mediaProject();
  const before = project.media.map((media) => media.src);
  orderMedia(project);
  assert.deepEqual(project.media.map((media) => media.src), before);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une promesse play résolue donne l'état playing.
// ----------------------------------------------------------------------------
async function allowedPlayCase(): Promise<void> {
  const video = { play: async () => undefined } as unknown as HTMLVideoElement;
  assert.equal(await tryPlay(video), 'playing');
}

// ----------------------------------------------------------------------------
// Vérifie qu'un refus de lecture est converti en état explicite pour l'interface.
// ----------------------------------------------------------------------------
async function blockedPlayCase(): Promise<void> {
  const video = { play: async () => { throw new Error('blocked'); } } as unknown as HTMLVideoElement;
  assert.equal(await tryPlay(video), 'blocked');
}

// ----------------------------------------------------------------------------
// Produit un projet public synthétique avec images et vidéos intercalées.
// ----------------------------------------------------------------------------
function mediaProject(): PublicProject {
  return {
    id: 'media-project', name: 'Media Project', categories: ['audio'],
    createdAt: '2026-09-01', updatedAt: '2026-09-02', status: 'active',
    repositoryVisibility: 'private', featured: false, stack: ['TypeScript'],
    preview: { poster: '/media/poster.webp' }, links: [], indexable: true,
    content: {
      en: { tagline: 'Media', description: 'Media', features: [] },
      fr: { tagline: 'Média', description: 'Média', features: [] },
    },
    media: [
      { type: 'image', src: '/media/one.webp', alt: { en: 'One', fr: 'Un' } },
      { type: 'video', src: '/media/video.mp4', poster: '/media/video.webp', title: { en: 'Video', fr: 'Vidéo' } },
      { type: 'image', src: '/media/two.webp', alt: { en: 'Two', fr: 'Deux' } },
      { type: 'video', src: '/media/video-2.mp4', poster: '/media/video-2.webp', title: { en: 'Video 2', fr: 'Vidéo 2' } },
    ],
  };
}
