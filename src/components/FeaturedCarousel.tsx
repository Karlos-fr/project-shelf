// ============================================================================
// FeaturedCarousel — Scène « Écran » pilotée par un index typographique
// ----------------------------------------------------------------------------
// Ce composant relie la machine Featured aux vrais événements média. Sur grand
// écran, survoler ou focaliser un titre de l'index change la vidéo de la scène ;
// sur téléphone, les diapositives se font glisser au doigt. Il partage l'arbitre
// média global et chaque titre reste un vrai lien vers la fiche commune.
// ============================================================================
import { useEffect, useMemo, useReducer, useRef, useState, type MouseEvent, type UIEvent } from 'react';
import type { ProjectSummary } from '../domain/project.ts';
import { assetUrl, formatRoute, type RouteState } from '../domain/routes.ts';
import { createFeaturedState, reduceFeatured } from '../featured/machine.ts';
import { MESSAGES } from '../i18n/messages.ts';
import { averageZones, canReadPixels, crossOriginFor, glowColor } from '../media/ambilight.ts';
import { useMediaCoordinator } from '../media/context.tsx';
import { tryPlay } from '../media/playback.ts';
import ProjectTags from './ProjectTags.tsx';

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
// Fréquence d'échantillonnage des couleurs Ambilight, en millisecondes.
const AMBILIGHT_SAMPLE_MS = 250;

// ----------------------------------------------------------------------------
// Rend la scène : médias superposés, index des titres et commandes de rotation.
// ----------------------------------------------------------------------------
export default function FeaturedCarousel({ projects, route, base, suspended, onOpen }: FeaturedCarouselProps) {
  const coordinator = useMediaCoordinator();
  const [state, dispatch] = useReducer(reduceFeatured, projects.length, (count) => createFeaturedState(count, true));
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const [pageHidden, setPageHidden] = useState(false);
  const [leaseGranted, setLeaseGranted] = useState(false);
  const [fallbackPoster, setFallbackPoster] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const posterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = projects[state.active];
  const messages = MESSAGES[route.locale];
  const locale = route.locale;
  const hasRotation = projects.length > 1;
  const externalPause = suspended || pageHidden || !visible || !leaseGranted;
  const playsVideo = active?.preview.video !== undefined && !fallbackPoster && !reducedMotion;

  // Détecte reduced-motion après hydratation et impose une pause explicite.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Synchronise la préférence de mouvement avec la machine Featured.
    function syncMotion(): void {
      setReducedMotion(query.matches);
      dispatch({ type: query.matches ? 'pause' : 'resume' });
    }
    syncMotion();
    query.addEventListener('change', syncMotion);
    return () => query.removeEventListener('change', syncMotion);
  }, []);

  // Suspend la rotation hors viewport sans transformer le retour en reprise forcée.
  useEffect(() => {
    const element = sectionRef.current;
    if (element === null || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true), { threshold: 0.05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Suspend les médias lorsque l'onglet devient caché.
  useEffect(() => {
    // Reflète document.hidden dans l'état local de suspension.
    function syncVisibility(): void { setPageHidden(document.hidden); }
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  // Demande l'usage du lecteur uniquement lorsque la vidéo active peut jouer.
  useEffect(() => {
    if (active?.preview.video === undefined || reducedMotion || fallbackPoster) {
      setLeaseGranted(true);
      return;
    }
    const lease = coordinator.request(`featured:${active.id}`, FEATURED_MEDIA_PRIORITY, () => {
      videoRef.current?.pause();
      setLeaseGranted(false);
    });
    // Recalcule l'accord quand un lecteur plus prioritaire apparaît ou disparaît.
    function syncLease(): void { setLeaseGranted(lease.isGranted()); }
    const unsubscribe = coordinator.subscribe(syncLease);
    syncLease();
    return () => { unsubscribe(); lease.release(); };
  }, [active?.id, active?.preview.video, coordinator, fallbackPoster, reducedMotion]);

  // Agrège les causes externes de suspension dans la machine pure.
  useEffect(() => { dispatch({ type: 'suspend', value: externalPause }); }, [externalPause]);

  // Réinitialise repli et temporisations lorsqu'un autre projet devient actif.
  useEffect(() => {
    setFallbackPoster(false);
    clearTimers(posterTimerRef, stallTimerRef);
    return () => clearTimers(posterTimerRef, stallTimerRef);
  }, [active?.id]);

  // Démarre la vidéo active ou le timer poster selon le média disponible.
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

  // Aligne la barre de progression du titre actif sur la lecture réelle de la vidéo.
  useEffect(() => {
    if (!playsVideo) return;
    let frame = 0;
    // Recopie la position de lecture à chaque image affichée.
    function tick(): void {
      const video = videoRef.current;
      const bar = progressRef.current;
      if (video !== null && bar !== null && video.duration > 0) bar.style.transform = `scaleX(${video.currentTime / video.duration})`;
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playsVideo, active?.id]);

  // Ambilight : la lueur autour de la scène reprend les couleurs de l'image en cours.
  useEffect(() => {
    const section = sectionRef.current;
    if (section === null || active === undefined || typeof document.createElement('canvas').getContext !== 'function') return;
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 9;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) return;
    const activeSection = section;
    const drawing = context;
    // Lit l'image courante (vidéo en lecture, sinon poster) et met à jour la lueur.
    function sample(): boolean {
      const video = videoRef.current;
      const poster = activeSection.querySelector<HTMLImageElement>('.featured-slide--active .featured-slide__media img');
      const source = video !== null && video.readyState >= 2 ? video : poster !== null && poster.complete && poster.naturalWidth > 0 ? poster : null;
      if (source === null) return true;
      const src = source instanceof HTMLVideoElement ? (source.currentSrc || source.querySelector('source')?.src || '') : source.currentSrc || source.src;
      if (!canReadPixels(src, window.location.origin)) return false;
      try {
        drawing.drawImage(source, 0, 0, canvas.width, canvas.height);
        const [left, right] = averageZones(drawing.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        activeSection.style.setProperty('--ambilight-left', glowColor(left));
        activeSection.style.setProperty('--ambilight-right', glowColor(right));
        return true;
      } catch {
        // Image non lisible (CORS refusé) : la lueur reste neutre, la vidéo continue.
        return false;
      }
    }
    if (!sample()) return;
    const timer = setInterval(() => { if (!sample()) clearInterval(timer); }, AMBILIGHT_SAMPLE_MS);
    return () => clearInterval(timer);
  }, [active, playsVideo]);

  // Sur téléphone, une rotation automatique fait défiler la piste jusqu'au projet actif.
  useEffect(() => {
    const track = slidesRef.current;
    if (track === null || track.scrollWidth <= track.clientWidth) return;
    const slide = track.children[state.active] as HTMLElement | undefined;
    if (slide === undefined || Math.abs(track.scrollLeft - slide.offsetLeft + track.offsetLeft) < 4) return;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [state.active, reducedMotion]);

  // Arrête le repli « stall » dès que la vidéo joue réellement.
  function handlePlaying(): void {
    if (stallTimerRef.current !== null) clearTimeout(stallTimerRef.current);
    stallTimerRef.current = null;
  }

  // Passe au projet suivant lorsque la vidéo active se termine.
  function handleEnded(): void {
    clearTimers(posterTimerRef, stallTimerRef);
    dispatch({ type: 'ended' });
  }

  // Convertit une erreur vidéo en poster temporisé plutôt qu'en blocage.
  function handleVideoError(): void {
    videoRef.current?.pause();
    setFallbackPoster(true);
  }

  // Sélectionne un projet manuellement et désactive la reprise implicite.
  function selectProject(index: number): void { dispatch({ type: 'manual', index }); }

  // Le survol d'un titre change la scène sans figer la rotation de l'utilisateur.
  function previewProject(index: number): void {
    if (index === state.active) return;
    const wasPaused = state.userPaused;
    dispatch({ type: 'manual', index });
    if (!wasPaused) dispatch({ type: 'resume' });
  }

  // Bascule la pause utilisateur, distincte des suspensions externes.
  function toggleRotation(): void { dispatch({ type: state.userPaused ? 'resume' : 'pause' }); }

  // Le glissement au doigt choisit la diapositive la plus visible.
  function handleTrackScroll(event: UIEvent<HTMLDivElement>): void {
    const track = event.currentTarget;
    if (track.scrollWidth <= track.clientWidth) return;
    const slides = [...track.children] as HTMLElement[];
    let closest = 0;
    let distance = Infinity;
    slides.forEach((slide, index) => {
      const gap = Math.abs(slide.offsetLeft - track.offsetLeft - track.scrollLeft);
      if (gap < distance) { distance = gap; closest = index; }
    });
    if (closest !== state.active && distance < track.clientWidth / 3) selectProject(closest);
  }

  if (active === undefined) return null;

  return (
    <section ref={sectionRef} className="featured-stage" data-featured data-active-project={active.id}
      onPointerEnter={() => dispatch({ type: 'hover', value: true })}
      onPointerLeave={() => dispatch({ type: 'hover', value: false })}
      onFocusCapture={(event) => { if ((event.target as HTMLElement).matches(':focus-visible')) dispatch({ type: 'keyboard-focus' }); }}
      aria-labelledby="featured-title">
      <h2 id="featured-title" className="sr-only">{messages.featured}</h2>
      <div className="featured-stage__ambilight" aria-hidden="true" />
      <div ref={slidesRef} className="featured-stage__slides" onScroll={handleTrackScroll}>
        {projects.map((project, index) => {
          const isActive = index === state.active;
          const href = formatRoute({ ...route, projectId: project.id }, base);
          return (
            <article key={project.id} className={isActive ? 'featured-slide featured-slide--active' : 'featured-slide'} aria-hidden={isActive ? undefined : true}>
              <div className="featured-slide__media" data-vt-media={project.id}>
                <img src={assetUrl(project.preview.poster, base)} alt="" loading={index === 0 ? 'eager' : 'lazy'} crossOrigin={crossOriginFor(assetUrl(project.preview.poster, base))} />
                {isActive && playsVideo && project.preview.video !== undefined && (
                  <video key={project.id} ref={videoRef} className="featured-slide__video" muted playsInline preload="metadata" crossOrigin={crossOriginFor(assetUrl(project.preview.video, base))}
                    poster={assetUrl(project.preview.poster, base)} onPlaying={handlePlaying} onEnded={handleEnded} onError={handleVideoError} aria-hidden="true">
                    <source src={assetUrl(project.preview.video, base)} />
                  </video>
                )}
              </div>
              <a className="featured-slide__caption" href={href} tabIndex={isActive ? undefined : -1}
                onClick={(event) => handleOpen(event, project.id, `featured-slide-${project.id}`)} id={`featured-slide-${project.id}`}>
                <strong>{project.name}</strong>
                <span>{project.tagline[locale]}</span>
                <ProjectTags categoryLabels={project.categoryLabels[locale]} status={project.status} stack={project.topStack.slice(0, 1)} locale={locale} />
              </a>
            </article>
          );
        })}
      </div>
      <ol className="featured-stage__index">
        {projects.map((project, index) => {
          const isActive = index === state.active;
          return (
            <li key={project.id}>
              <a id={`featured-title-${project.id}`} className="featured-title" href={formatRoute({ ...route, projectId: project.id }, base)}
                aria-current={isActive ? 'true' : undefined} data-nav=""
                onMouseEnter={() => previewProject(index)} onFocus={() => { if (index !== state.active) selectProject(index); }}
                onClick={(event) => handleOpen(event, project.id, `featured-title-${project.id}`)}>
                <span className="featured-title__name">{project.name}</span>
                <span className="featured-title__meta" aria-hidden={isActive ? undefined : true}>
                  <span>
                    <span className="featured-title__tagline">{project.tagline[locale]}</span>
                    <ProjectTags categoryLabels={project.categoryLabels[locale]} status={project.status} stack={project.topStack} locale={locale} />
                    <span className="featured-title__progress">
                      {isActive && <i key={`${project.id}-${playsVideo}`} ref={progressRef}
                        style={playsVideo || state.userPaused ? undefined : { animationDuration: `${project.preview.posterDurationMs ?? DEFAULT_POSTER_MS}ms` }}
                        className={playsVideo || state.userPaused ? undefined : 'is-timed'} />}
                    </span>
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
      {hasRotation && (
        <div className="featured-stage__controls">
          <ol className="featured-stage__dots" aria-hidden="true">
            {projects.map((project, index) => <li key={project.id} className={index === state.active ? 'is-active' : undefined} />)}
          </ol>
          <button type="button" onClick={() => selectProject(state.active - 1)} aria-label={messages.previousProject} data-nav="">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5 5 8l5.5 5.5" /></svg>
          </button>
          <button type="button" onClick={toggleRotation} aria-label={state.userPaused ? messages.resumeRotation : messages.pauseRotation} data-nav="">
            {state.userPaused
              ? <svg viewBox="0 0 16 16" aria-hidden="true"><path className="is-filled" d="M4.5 2.5v11l9-5.5z" /></svg>
              : <svg viewBox="0 0 16 16" aria-hidden="true"><path className="is-filled" d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" /></svg>}
          </button>
          <button type="button" onClick={() => selectProject(state.active + 1)} aria-label={messages.nextProject} data-nav="">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 2.5 11 8l-5.5 5.5" /></svg>
          </button>
        </div>
      )}
    </section>
  );

  // --------------------------------------------------------------------------
  // Ouvre la fiche en popin, sauf clic modifié qui garde le comportement du lien.
  // --------------------------------------------------------------------------
  function handleOpen(event: MouseEvent<HTMLAnchorElement>, projectId: string, triggerId: string): void {
    if (onOpen === undefined || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen(projectId, triggerId);
  }
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
