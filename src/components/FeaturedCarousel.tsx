// ============================================================================
// FeaturedCarousel — Carrousel éditorial piloté par vidéo ou poster
// ----------------------------------------------------------------------------
// Ce composant relie la machine Featured aux vrais événements média. Il partage
// l'arbitre global et réutilise ProjectCard pour ouvrir la fiche commune.
// ============================================================================
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ProjectSummary } from '../domain/project.ts';
import { assetUrl, type RouteState } from '../domain/routes.ts';
import { createFeaturedState, reduceFeatured, visibleFeaturedIds } from '../featured/machine.ts';
import { MESSAGES } from '../i18n/messages.ts';
import { useMediaCoordinator } from '../media/context.tsx';
import { tryPlay } from '../media/playback.ts';
import ProjectCard from './ProjectCard.tsx';

export type FeaturedCarouselProps = {
  projects: ProjectSummary[];
  route: RouteState;
  base: string;
  suspended: boolean;
  onOpen?: (projectId: string, triggerId: string) => void;
};

// Durée par défaut d'un Featured sans vidéo, en millisecondes.
const DEFAULT_POSTER_MS = 6000;
// Délai maximal sans démarrage vidéo avant repli poster, en millisecondes.
const MEDIA_STALL_MS = 8000;
// Priorité la plus basse dans l'arbitre média global.
const FEATURED_MEDIA_PRIORITY = 10;

// ----------------------------------------------------------------------------
// Rend le projet actif et jusqu'à deux posters secondaires.
// ----------------------------------------------------------------------------
export default function FeaturedCarousel({ projects, route, base, suspended, onOpen }: FeaturedCarouselProps) {
  const coordinator = useMediaCoordinator();
  const ids = useMemo(() => projects.map((project) => project.id), [projects]);
  const [state, dispatch] = useReducer(reduceFeatured, projects.length, (count) => createFeaturedState(count, true));
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const [pageHidden, setPageHidden] = useState(false);
  const [leaseGranted, setLeaseGranted] = useState(false);
  const [fallbackPoster, setFallbackPoster] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = projects[state.active];
  const messages = MESSAGES[route.locale];
  const windowProjects = visibleFeaturedIds(ids, state.active).flatMap((id) => {
    const project = projects.find((candidate) => candidate.id === id);
    return project === undefined ? [] : [project];
  });
  const hasRotation = projects.length > 1;
  const externalPause = suspended || pageHidden || !visible || !leaseGranted;

  // ----------------------------------------------------------------------------
  // Détecte reduced-motion après hydratation et impose une pause explicite.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    // --------------------------------------------------------------------------
    // Synchronise la préférence de mouvement avec la machine Featured.
    // --------------------------------------------------------------------------
    function syncMotion(): void {
      setReducedMotion(query.matches);
      dispatch({ type: query.matches ? 'pause' : 'resume' });
    }
    syncMotion();
    query.addEventListener('change', syncMotion);
    return () => query.removeEventListener('change', syncMotion);
  }, []);

  // ----------------------------------------------------------------------------
  // Suspend la rotation hors viewport sans transformer le retour en reprise forcée.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const element = sectionRef.current;
    if (element === null || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true), { threshold: 0.05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // ----------------------------------------------------------------------------
  // Suspend les médias lorsque l'onglet devient caché.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    // --------------------------------------------------------------------------
    // Reflète document.hidden dans l'état local de suspension.
    // --------------------------------------------------------------------------
    function syncVisibility(): void { setPageHidden(document.hidden); }
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  // ----------------------------------------------------------------------------
  // Demande l'usage du lecteur uniquement lorsque la vidéo active peut jouer.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (active?.preview.video === undefined || reducedMotion || fallbackPoster) {
      setLeaseGranted(true);
      return;
    }
    const lease = coordinator.request(`featured:${active.id}`, FEATURED_MEDIA_PRIORITY, () => {
      videoRef.current?.pause();
      setLeaseGranted(false);
    });
    // --------------------------------------------------------------------------
    // Recalcule l'accord quand un lecteur plus prioritaire apparaît ou disparaît.
    // --------------------------------------------------------------------------
    function syncLease(): void { setLeaseGranted(lease.isGranted()); }
    const unsubscribe = coordinator.subscribe(syncLease);
    syncLease();
    return () => { unsubscribe(); lease.release(); };
  }, [active?.id, active?.preview.video, coordinator, fallbackPoster, reducedMotion]);

  // ----------------------------------------------------------------------------
  // Agrège les causes externes de suspension dans la machine pure.
  // ----------------------------------------------------------------------------
  useEffect(() => { dispatch({ type: 'suspend', value: externalPause }); }, [externalPause]);

  // ----------------------------------------------------------------------------
  // Réinitialise repli et temporisations lorsqu'un autre projet devient actif.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    setFallbackPoster(false);
    clearTimers(posterTimerRef, stallTimerRef);
    return () => clearTimers(posterTimerRef, stallTimerRef);
  }, [active?.id]);

  // ----------------------------------------------------------------------------
  // Démarre la vidéo active ou le timer poster selon le média disponible.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    clearTimers(posterTimerRef, stallTimerRef);
    const project = active;
    if (project === undefined || state.userPaused || state.suspended) {
      videoRef.current?.pause();
      return;
    }
    const video = videoRef.current;
    if (project.preview.video !== undefined && !fallbackPoster && !reducedMotion && video !== null) {
      video.muted = true;
      void tryPlay(video).then((played) => {
        if (!played) setFallbackPoster(true);
      });
      stallTimerRef.current = setTimeout(() => setFallbackPoster(true), MEDIA_STALL_MS);
      return;
    }
    posterTimerRef.current = setTimeout(
      () => dispatch({ type: 'ended' }),
      project.preview.posterDurationMs ?? DEFAULT_POSTER_MS,
    );
  }, [active, fallbackPoster, reducedMotion, state.suspended, state.userPaused]);

  // ----------------------------------------------------------------------------
  // Passe au projet suivant lorsque la vidéo active se termine.
  // ----------------------------------------------------------------------------
  function handleEnded(): void {
    clearTimers(posterTimerRef, stallTimerRef);
    dispatch({ type: 'ended' });
  }

  // ----------------------------------------------------------------------------
  // Convertit une erreur vidéo en poster temporisé plutôt qu'en blocage.
  // ----------------------------------------------------------------------------
  function handleVideoError(): void {
    videoRef.current?.pause();
    setFallbackPoster(true);
  }

  // ----------------------------------------------------------------------------
  // Sélectionne un projet manuellement et désactive la reprise implicite.
  // ----------------------------------------------------------------------------
  function selectProject(index: number): void { dispatch({ type: 'manual', index }); }

  // ----------------------------------------------------------------------------
  // Bascule la pause utilisateur, distincte des suspensions externes.
  // ----------------------------------------------------------------------------
  function toggleRotation(): void { dispatch({ type: state.userPaused ? 'resume' : 'pause' }); }

  if (active === undefined) return null;

  return (
    <section ref={sectionRef} className="featured-carousel" data-featured data-active-project={active.id}
      onPointerEnter={() => dispatch({ type: 'hover', value: true })}
      onPointerLeave={() => dispatch({ type: 'hover', value: false })}
      onFocusCapture={() => dispatch({ type: 'keyboard-focus' })}
      aria-labelledby="featured-title">
      <div className="section-heading featured-carousel__heading">
        <h2 id="featured-title">{messages.featured}</h2>
        <div className="featured-carousel__controls">
          {hasRotation && <span className="featured-carousel__counter">{state.active + 1} / {projects.length}</span>}
          {hasRotation && <button type="button" onClick={() => selectProject(state.active - 1)} aria-label={messages.previousProject}>‹</button>}
          {hasRotation && <button type="button" onClick={toggleRotation}>{state.userPaused ? messages.resumeRotation : messages.pauseRotation}</button>}
          {hasRotation && <button type="button" onClick={() => selectProject(state.active + 1)} aria-label={messages.nextProject}>›</button>}
        </div>
      </div>
      <div className="featured-grid">
        {windowProjects.map((project, index) => (
          <div key={project.id} className={index === 0 ? 'featured-slot featured-slot--active' : 'featured-slot'}>
            <ProjectCard project={project} route={route} base={base} variant="featured" onOpen={onOpen} />
            {index === 0 && project.preview.video !== undefined && !fallbackPoster && !reducedMotion && (
              <video key={project.id} ref={videoRef} className="featured-carousel__video" muted playsInline preload="metadata"
                poster={assetUrl(project.preview.poster, base)} onEnded={handleEnded} onError={handleVideoError} aria-hidden="true">
                <source src={assetUrl(project.preview.video, base)} />
              </video>
            )}
            {index > 0 && <button type="button" className="featured-carousel__select" onClick={() => selectProject(state.active + index)}>{messages.readPreview}</button>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Annule les timers poster et watchdog sans modifier l'état de la machine.
// ----------------------------------------------------------------------------
function clearTimers(
  poster: { current: ReturnType<typeof setTimeout> | null },
  stall: { current: ReturnType<typeof setTimeout> | null },
): void {
  if (poster.current !== null) clearTimeout(poster.current);
  if (stall.current !== null) clearTimeout(stall.current);
  poster.current = null;
  stall.current = null;
}
