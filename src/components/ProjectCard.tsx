// ============================================================================
// ProjectCard — Carte commune aux grilles et emplacements Featured
// ----------------------------------------------------------------------------
// La carte reste un véritable lien HTML pour SEO, clavier et nouvel onglet. Le
// clic principal peut être intercepté après hydratation sans casser ces usages.
// ============================================================================
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { ProjectSummary } from '../domain/project.ts';
import { formatProjectDate } from '../domain/locale.ts';
import { assetUrl, formatRoute, type RouteState } from '../domain/routes.ts';
import { MESSAGES } from '../i18n/messages.ts';
import { useMediaCoordinator } from '../media/context.tsx';
import { tryPlay } from '../media/playback.ts';

export type ProjectCardProps = {
  project: ProjectSummary;
  route: RouteState;
  base: string;
  variant: 'grid' | 'featured';
  onOpen?: (projectId: string, triggerId: string) => void;
};

// Priorité du survol : supérieure au Featured décoratif, inférieure à la fiche.
const HOVER_MEDIA_PRIORITY = 20;

// ----------------------------------------------------------------------------
// Rend poster, nom, accroche, catégories, date et preview desktop éventuelle.
// ----------------------------------------------------------------------------
export default function ProjectCard({ project, route, base, variant, onOpen }: ProjectCardProps) {
  const coordinator = useMediaCoordinator();
  const locale = route.locale;
  const target = formatRoute({ ...route, projectId: project.id }, base);
  const focus = project.preview.focus;
  const position = focus === undefined ? undefined : `${focus.x}% ${focus.y}%`;
  const triggerId = `card-${variant}-${project.id}`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canPreview, setCanPreview] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(false);

  // ----------------------------------------------------------------------------
  // Active le hover vidéo seulement avec pointeur précis et animations autorisées.
  // Effets de bord : écoute les changements de capacités média du navigateur.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (variant !== 'grid' || project.preview.video === undefined) return;
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // --------------------------------------------------------------------------
    // Recalcule la permission de preview sans démarrer de lecture elle-même.
    // --------------------------------------------------------------------------
    function refreshPreviewCapability(): void {
      setCanPreview(hoverQuery.matches && !motionQuery.matches);
    }
    refreshPreviewCapability();
    hoverQuery.addEventListener('change', refreshPreviewCapability);
    motionQuery.addEventListener('change', refreshPreviewCapability);
    return () => {
      hoverQuery.removeEventListener('change', refreshPreviewCapability);
      motionQuery.removeEventListener('change', refreshPreviewCapability);
    };
  }, [project.preview.video, variant]);

  // ----------------------------------------------------------------------------
  // Demande le bail de lecture pendant le survol et restaure le poster à la sortie.
  // Effets de bord : démarre/arrête uniquement la preview courte de cette carte.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!hovered || !canPreview || video === null || project.preview.video === undefined) {
      if (video !== null) {
        video.pause();
        video.currentTime = 0;
      }
      setPlaying(false);
      return;
    }
    // Référence non nullable figée après la garde ; elle reste sûre dans les callbacks différés.
    const activeVideo: HTMLVideoElement = video;
    activeVideo.muted = true;
    const lease = coordinator.request(`hover:${project.id}`, HOVER_MEDIA_PRIORITY, () => {
      activeVideo.pause();
      setPlaying(false);
    });
    let active = true;
    // --------------------------------------------------------------------------
    // Tente la lecture uniquement lorsque l'arbitre accorde réellement ce bail.
    // --------------------------------------------------------------------------
    function attemptPreview(): void {
      if (!active || !lease.isGranted()) return;
      void tryPlay(activeVideo).then((result) => {
        if (active) setPlaying(result === 'playing');
      });
    }
    const unsubscribe = coordinator.subscribe(attemptPreview);
    attemptPreview();
    return () => {
      active = false;
      unsubscribe();
      activeVideo.pause();
      activeVideo.currentTime = 0;
      lease.release();
      setPlaying(false);
    };
  }, [canPreview, coordinator, hovered, project.id, project.preview.video]);

  // ----------------------------------------------------------------------------
  // Intercepte uniquement le clic standard afin de conserver les comportements natifs.
  // ----------------------------------------------------------------------------
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    if (onOpen === undefined || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen(project.id, triggerId);
  }

  // ----------------------------------------------------------------------------
  // Signale l'entrée du pointeur sans lancer de réseau sur appareil non compatible.
  // ----------------------------------------------------------------------------
  function handlePointerEnter(): void { if (canPreview) setHovered(true); }

  // ----------------------------------------------------------------------------
  // Termine immédiatement la preview lorsque le pointeur quitte la carte.
  // ----------------------------------------------------------------------------
  function handlePointerLeave(): void { setHovered(false); }

  return (
    <article className={`project-card project-card--${variant}`} data-project-card={project.id}
      onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      <a id={triggerId} className="project-card__link" href={target} data-project-link={project.id}
        aria-label={`${project.name} — ${project.tagline[locale]}`} onClick={handleClick}>
        <span className="project-card__media">
          <img src={assetUrl(project.preview.poster, base)} alt="" loading={variant === 'featured' ? 'eager' : 'lazy'} style={{ objectPosition: position }} />
          {variant === 'grid' && canPreview && project.preview.video !== undefined && (
            <video ref={videoRef} className={playing ? 'project-card__preview project-card__preview--playing' : 'project-card__preview'}
              muted loop playsInline preload="none" aria-hidden="true" poster={assetUrl(project.preview.poster, base)} style={{ objectPosition: position }}>
              <source src={assetUrl(project.preview.video, base)} />
            </video>
          )}
        </span>
        <span className="project-card__body">
          <strong className="project-card__name" title={project.name}>{project.name}</strong>
          <span className="project-card__tagline">{project.tagline[locale]}</span>
          <span className="project-card__meta">
            <span className="project-card__categories">{project.categoryLabels[locale].join(' · ')}</span>
            <time dateTime={project.updatedAt}>{formatProjectDate(project.updatedAt, locale)}</time>
          </span>
          {/* Appel visuel de la scène Featured ; le nom accessible reste porté par le lien. */}
          {variant === 'featured' && <span className="project-card__cta" aria-hidden="true">{MESSAGES[locale].viewProject}</span>}
        </span>
      </a>
    </article>
  );
}
