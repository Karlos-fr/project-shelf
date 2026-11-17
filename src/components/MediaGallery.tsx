// ============================================================================
// MediaGallery — Galerie de fiche avec média principal et vignettes
// ----------------------------------------------------------------------------
// La première vidéo est affichée en premier comme validé. La lecture automatique
// n'est tentée qu'après hydratation ; le HTML sans JavaScript conserve les contrôles.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Locale } from '../domain/locale.ts';
import type { ProjectMedia, PublicProject } from '../domain/project.ts';
import { assetUrl } from '../domain/routes.ts';
import { useMediaCoordinator } from '../media/context.tsx';
import { orderMedia, tryPlay } from '../media/playback.ts';
import { MESSAGES } from '../i18n/messages.ts';

export type MediaGalleryProps = {
  project: PublicProject;
  locale: Locale;
  base: string;
};

// Priorité d'une vidéo de fiche, supérieure au hover et au Featured décoratif.
const DETAIL_MEDIA_PRIORITY = 30;

// ----------------------------------------------------------------------------
// Rend le média sélectionné et sa bande de vignettes dans l'ordre éditorial.
// ----------------------------------------------------------------------------
export default function MediaGallery({ project, locale, base }: MediaGalleryProps) {
  const coordinator = useMediaCoordinator();
  const ordered = useMemo(() => orderMedia(project), [project]);
  const [selected, setSelected] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = ordered[selected];
  const messages = MESSAGES[locale];

  // ----------------------------------------------------------------------------
  // Repart du premier média lorsqu'une autre fiche réutilise le composant.
  // ----------------------------------------------------------------------------
  useEffect(() => { setSelected(0); setBlocked(false); }, [project.id]);

  // ----------------------------------------------------------------------------
  // Demande la priorité détail et tente une lecture muette du média sélectionné.
  // Effets de bord : pause et libère le bail au changement de média/démontage.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (current?.type !== 'video') return;
    const video = videoRef.current;
    if (video === null) return;
    video.muted = true;
    const lease = coordinator.request(`detail:${project.id}`, DETAIL_MEDIA_PRIORITY, () => video.pause());
    let active = true;
    const unsubscribe = coordinator.subscribe(() => {
      if (!active || !lease.isGranted() || !video.paused) return;
      void tryPlay(video).then((result) => { if (active) setBlocked(result === 'blocked'); });
    });
    if (lease.isGranted()) void tryPlay(video).then((result) => { if (active) setBlocked(result === 'blocked'); });
    return () => {
      active = false;
      unsubscribe();
      video.pause();
      lease.release();
    };
  }, [coordinator, current, project.id]);

  if (current === undefined) {
    return <div className="media-gallery"><div className="media-gallery__stage"><img src={assetUrl(project.preview.poster, base)} alt="" /></div></div>;
  }

  return (
    <div className="media-gallery" data-media-gallery>
      <div className="media-gallery__stage">
        <MainMedia media={current} locale={locale} base={base} videoRef={videoRef} />
        {blocked && current.type === 'video' && <span className="media-gallery__play-hint">{messages.playVideo}</span>}
      </div>
      {ordered.length > 1 && (
        <div className="media-gallery__thumbs" aria-label={messages.video}>
          {ordered.map((media, index) => (
            <button key={`${media.type}-${media.src}-${index}`} type="button"
              className={index === selected ? 'media-thumb media-thumb--active' : 'media-thumb'}
              aria-pressed={index === selected} aria-label={mediaLabel(media, locale, index)}
              onClick={() => { setBlocked(false); setSelected(index); }}>
              <img src={assetUrl(thumbnailSource(media), base)} alt="" loading="lazy" />
              {media.type === 'video' && <span className="media-thumb__play" aria-hidden="true">▶</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Rend le média principal sans automatiser le passage au suivant en fin de vidéo.
// ----------------------------------------------------------------------------
function MainMedia({ media, locale, base, videoRef }: { media: ProjectMedia; locale: Locale; base: string; videoRef: React.RefObject<HTMLVideoElement | null> }) {
  if (media.type === 'image') return <img src={assetUrl(media.src, base)} alt={media.alt[locale]} />;
  return (
    <video key={media.src} ref={videoRef} controls muted playsInline preload="metadata" poster={assetUrl(media.poster, base)}>
      <source src={assetUrl(media.src, base)} />
      {media.captions?.map((caption) => <track key={`${caption.language}-${caption.src}`} kind="captions" src={assetUrl(caption.src, base)} srcLang={caption.language} label={caption.label[locale]} />)}
    </video>
  );
}

// ----------------------------------------------------------------------------
// Choisit la vignette explicite, sinon le poster vidéo ou l'image elle-même.
// ----------------------------------------------------------------------------
function thumbnailSource(media: ProjectMedia): string {
  if (media.thumbnail !== undefined) return media.thumbnail;
  return media.type === 'video' ? media.poster : media.src;
}

// ----------------------------------------------------------------------------
// Produit un libellé accessible stable pour chaque vignette.
// ----------------------------------------------------------------------------
function mediaLabel(media: ProjectMedia, locale: Locale, index: number): string {
  if (media.type === 'video') return media.title[locale];
  return media.alt[locale] || `${index + 1}`;
}
