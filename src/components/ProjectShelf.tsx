// ============================================================================
// ProjectShelf — Section « L'étagère » : objets d'époque en 3D et index des projets
// ----------------------------------------------------------------------------
// Le HTML initial contient le titre, une légende et la liste des liens vers les
// fiches : il fonctionne sans JavaScript. Après hydratation, la scène Three.js est
// chargée à l'approche de la section, mise en pause hors champ ou onglet masqué,
// et ses écrans passent par l'arbitre commun des lecteurs vidéo.
// ============================================================================
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import type { ProjectSummary } from '../domain/project.ts';
import { assetUrl, formatRoute, type RouteState } from '../domain/routes.ts';
import { MESSAGES } from '../i18n/messages.ts';
import { crossOriginFor } from '../media/ambilight.ts';
import { useMediaCoordinator } from '../media/context.tsx';
import { selectShelfItems } from '../shelf/shelf-items.ts';
import type { ShelfScene } from '../shelf/shelf-scene.ts';
import { CRASH_GRACE_MS, readCrashFlag, writeCrashFlag } from '../shelf/crash-guard.ts';

type ProjectShelfProps = {
  projects: readonly ProjectSummary[];
  route: RouteState;
  base: string;
  // Vrai quand une fiche est ouverte : la scène s'arrête et libère sa vidéo.
  suspended: boolean;
  onOpen?: (projectId: string, triggerId: string) => void;
};

// Même priorité qu'un aperçu de carte survolée : la une cède, la fiche ouverte l'emporte.
const SHELF_MEDIA_PRIORITY = 20;
// Distance horizontale, en pixels CSS, au-delà de laquelle un geste est un glissé.
const SWIPE_THRESHOLD = 40;

type SceneState = 'idle' | 'loading' | 'ready' | 'failed';

// Marque de session posée pendant le chargement de la scène et retirée une fois qu'elle tourne.
const CRASH_FLAG = 'project-shelf:shelf-loading';

// ----------------------------------------------------------------------------
// Rend la section de l'étagère, ou rien si aucun projet public n'a d'objet.
// ----------------------------------------------------------------------------
export default function ProjectShelf({ projects, route, base, suspended, onOpen }: ProjectShelfProps) {
  const locale = route.locale;
  const messages = MESSAGES[locale];
  const items = selectShelfItems(projects);
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ShelfScene | null>(null);
  const downXRef = useRef<number | null>(null);
  const swipedRef = useRef(false);
  const swipeRef = useRef<((dx: number) => void) | null>(null);
  const [sceneState, setSceneState] = useState<SceneState>('idle');
  const [active, setActive] = useState(-1);
  const [zoomed, setZoomed] = useState(-1);
  const [visible, setVisible] = useState(false);
  const coordinator = useMediaCoordinator();
  const ids = items.map((item) => item.project.id).join(',');

  // Charge la scène quand la section approche de l'écran, puis suit sa visibilité.
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (section === null || canvas === null || items.length === 0 || typeof IntersectionObserver === 'undefined') return;
    let disposed = false;
    let started = false;
    let clearFlag = 0;
    const observer = new IntersectionObserver((entries) => {
      const isVisible = entries.some((entry) => entry.isIntersecting);
      setVisible(isVisible);
      if (!isVisible || started) return;
      started = true;
      // Un chargement précédent n'a jamais abouti : le navigateur a sans doute fermé l'onglet
      // faute de mémoire. On reste sur la version HTML pour ne pas recharger en boucle.
      if (readCrashFlag(CRASH_FLAG)) { setSceneState('failed'); return; }
      writeCrashFlag(CRASH_FLAG, true);
      setSceneState('loading');
      const small = window.matchMedia('(max-width: 719px)').matches;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      void import('../shelf/shelf-scene.ts')
        .then(({ createShelfScene }) => createShelfScene({
          canvas, small, reducedMotion,
          assetBase: `${base.endsWith('/') ? base : `${base}/`}shelf/`,
          items: items.map(({ project, object }) => {
            const poster = assetUrl(project.preview.poster, base);
            const video = project.preview.video === undefined ? undefined : assetUrl(project.preview.video, base);
            return {
              id: project.id, name: project.name, meta: project.categoryLabels[locale][0] ?? '', object, poster, video,
              crossOrigin: crossOriginFor(video ?? poster),
            };
          }),
        }))
        .then((scene) => {
          if (disposed) { scene.dispose(); return; }
          sceneRef.current = scene;
          setSceneState('ready');
          // Quelques secondes de rendu sans fermeture d'onglet suffisent à lever le doute.
          clearFlag = window.setTimeout(() => writeCrashFlag(CRASH_FLAG, false), CRASH_GRACE_MS);
        })
        .catch(() => { writeCrashFlag(CRASH_FLAG, false); if (!disposed) setSceneState('failed'); });
    }, { rootMargin: '300px 0px' });
    observer.observe(section);
    const onResize = () => sceneRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      disposed = true;
      window.clearTimeout(clearFlag);
      // Un démontage normal prouve que l'onglet a survécu : la marque n'a plus lieu d'être.
      if (started) writeCrashFlag(CRASH_FLAG, false);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // La scène est reconstruite seulement si la liste d'objets ou la langue change.
  }, [ids, base, locale]);

  // Pause hors champ, onglet masqué ou fiche ouverte.
  useEffect(() => {
    const scene = sceneRef.current;
    if (scene === null) return;
    const sync = () => scene.setRunning(visible && !suspended && document.visibilityState === 'visible');
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [visible, suspended, sceneState]);

  // Glissé au doigt. Safari iOS annule les événements pointeur dès que le geste
  // ressemble un peu à un défilement, ce qui arrive à presque tout glissé humain.
  // Les événements touch, eux, vont jusqu'au bout : un geste surtout horizontal
  // bloque le défilement de la page et passe à l'objet voisin.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || sceneState !== 'ready') return;
    let start: { x: number; y: number } | null = null;
    let horizontal: boolean | null = null;
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start = event.touches.length === 1 && touch !== undefined ? { x: touch.clientX, y: touch.clientY } : null;
      horizontal = null;
    };
    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (start === null || touch === undefined) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      // La direction se décide sur les premiers pixels, puis ne change plus.
      if (horizontal === null && Math.hypot(dx, dy) > 8) horizontal = Math.abs(dx) > Math.abs(dy);
      if (horizontal === true && event.cancelable) event.preventDefault();
    };
    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (start !== null && touch !== undefined && horizontal === true) {
        const dx = touch.clientX - start.x;
        if (Math.abs(dx) > SWIPE_THRESHOLD) swipeRef.current?.(dx);
      }
      start = null;
    };
    const onCancel = () => { start = null; };
    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);
    canvas.addEventListener('touchcancel', onCancel);
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('touchcancel', onCancel);
    };
  }, [sceneState]);

  useEffect(() => { sceneRef.current?.setActive(active); }, [active, sceneState]);
  useEffect(() => { sceneRef.current?.setZoom(zoomed); }, [zoomed, sceneState]);

  // Un écran actif lit l'aperçu vidéo du projet, si l'arbitre lui accorde la priorité.
  useEffect(() => {
    const scene = sceneRef.current;
    const item = items[active];
    if (scene === null || item === undefined || item.object.kind !== 'tv' || item.project.preview.video === undefined || suspended) return;
    const index = active;
    const lease = coordinator.request(`shelf:${item.project.id}`, SHELF_MEDIA_PRIORITY, () => scene.stopVideo(index));
    let current = true;
    const attempt = () => { if (current && lease.isGranted()) void scene.playVideo(index); };
    const unsubscribe = coordinator.subscribe(attempt);
    attempt();
    return () => {
      current = false;
      unsubscribe();
      scene.stopVideo(index);
      lease.release();
    };
  }, [active, ids, suspended, sceneState, coordinator]);

  if (items.length === 0) return null;

  // Premier clic : la caméra s'approche ; re-clic sur l'objet ou clic dans le vide : elle recule.
  function zoomTo(index: number): void {
    setZoomed(index);
    if (index >= 0) setActive(index);
  }
  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    const scene = sceneRef.current;
    if (scene === null || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    scene.setPointer(((event.clientX - rect.left) / rect.width) * 2 - 1);
    const index = scene.pick(event.clientX, event.clientY);
    event.currentTarget.style.cursor = index >= 0 ? (index === zoomed ? 'zoom-out' : 'zoom-in') : 'default';
    if (index >= 0 && zoomed < 0) setActive(index);
  }
  function handlePointerLeave(): void {
    sceneRef.current?.setPointer(0);
    if (zoomed < 0 && !window.matchMedia('(max-width: 719px)').matches) setActive(-1);
  }
  // Passe à l'objet voisin : vers la droite si le geste va vers la gauche.
  function swipe(dx: number): void {
    swipedRef.current = true;
    const from = zoomed >= 0 ? zoomed : Math.max(active, 0);
    const next = Math.max(0, Math.min(items.length - 1, from + (dx < 0 ? 1 : -1)));
    if (zoomed >= 0) zoomTo(next); else setActive(next);
  }
  swipeRef.current = swipe;
  // Le glissé à la souris passe par les événements pointeur ; au doigt, par les
  // événements touch (voir plus haut). Le simple appui passe par click, seul
  // événement que Safari iOS délivre de façon fiable pour un tap sur un canvas.
  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    swipedRef.current = false;
    downXRef.current = event.pointerType === 'touch' ? null : event.clientX;
  }
  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>): void {
    const downX = downXRef.current;
    downXRef.current = null;
    if (sceneRef.current === null || downX === null) return;
    const dx = event.clientX - downX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) swipe(dx);
  }
  function handleClick(event: MouseEvent<HTMLCanvasElement>): void {
    const scene = sceneRef.current;
    // Le click qui suit un glissé à la souris ne doit pas zoomer en plus.
    if (scene === null || swipedRef.current) { swipedRef.current = false; return; }
    const index = scene.pick(event.clientX, event.clientY);
    zoomTo(index < 0 || index === zoomed ? -1 : index);
  }
  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape' && zoomed >= 0) { zoomTo(-1); event.stopPropagation(); return; }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const links = Array.from(sectionRef.current?.querySelectorAll<HTMLAnchorElement>('.shelf__index a') ?? []);
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (current < 0) return;
    const next = Math.max(0, Math.min(links.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)));
    links[next]?.focus();
    event.preventDefault();
  }
  function handleOpen(event: MouseEvent<HTMLAnchorElement>, projectId: string): void {
    if (onOpen === undefined || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen(projectId, event.currentTarget.id);
  }

  const current = items[active];
  const hint = zoomed >= 0 ? messages.shelfHintZoomed : messages.shelfHint;
  return (
    <section ref={sectionRef} className="shelf" aria-labelledby="shelf-title" onKeyDown={handleKeyDown}>
      <div className="section-heading">
        <h2 id="shelf-title">{messages.shelfTitle}</h2>
        <p className="shelf__lead">{messages.shelfLead}</p>
      </div>
      <div className="shelf__stage" data-state={sceneState}>
        <canvas ref={canvasRef} className="shelf__canvas" aria-hidden="true"
          onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}
          onPointerCancel={() => { downXRef.current = null; }} onClick={handleClick} />
        {sceneState === 'loading' && <span className="shelf__loading">{messages.shelfLoading}</span>}
      </div>
      <div className={`shelf__caption${current === undefined ? ' is-empty' : ''}`} aria-live="polite">
        <strong>{current === undefined ? messages.shelfIdle : current.project.name}</strong>
        {current !== undefined && <span>{current.project.tagline[locale]}</span>}
        {current !== undefined && (
          <a id={`shelf-open-${current.project.id}`} href={formatRoute({ ...route, projectId: current.project.id }, base)}
            onClick={(event) => handleOpen(event, current.project.id)}>{messages.shelfOpen}</a>
        )}
      </div>
      <ol className="shelf__index" aria-label={messages.shelfIndex}>
        {items.map(({ project }, index) => (
          <li key={project.id}>
            <a id={`shelf-${project.id}`} href={formatRoute({ ...route, projectId: project.id }, base)} data-nav=""
              aria-current={index === active ? 'true' : undefined}
              onFocus={() => zoomTo(index)} onMouseEnter={() => { if (zoomed < 0) setActive(index); }}
              onClick={(event) => handleOpen(event, project.id)}>{project.name}</a>
          </li>
        ))}
      </ol>
      <p className="shelf__hint">{hint}</p>
      <p className="shelf__credits">{messages.shelfCredits}</p>
    </section>
  );
}
