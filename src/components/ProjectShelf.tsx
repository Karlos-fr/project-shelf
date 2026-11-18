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
const CRASH_GRACE_MS = 6000;

function readCrashFlag(): boolean {
  try { return window.sessionStorage.getItem(CRASH_FLAG) === '1'; } catch { return false; }
}

function writeCrashFlag(on: boolean): void {
  try {
    if (on) window.sessionStorage.setItem(CRASH_FLAG, '1');
    else window.sessionStorage.removeItem(CRASH_FLAG);
  } catch {
    // Stockage bloqué (navigation privée stricte) : pas de garde-fou, la scène se charge quand même.
  }
}

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
      if (readCrashFlag()) { setSceneState('failed'); return; }
      writeCrashFlag(true);
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
          clearFlag = window.setTimeout(() => writeCrashFlag(false), CRASH_GRACE_MS);
        })
        .catch(() => { writeCrashFlag(false); if (!disposed) setSceneState('failed'); });
    }, { rootMargin: '300px 0px' });
    observer.observe(section);
    const onResize = () => sceneRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      disposed = true;
      window.clearTimeout(clearFlag);
      // Un démontage normal prouve que l'onglet a survécu : la marque n'a plus lieu d'être.
      if (started) writeCrashFlag(false);
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
  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>): void {
    const scene = sceneRef.current;
    const downX = downXRef.current;
    downXRef.current = null;
    if (scene === null || downX === null) return;
    const dx = event.clientX - downX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const from = zoomed >= 0 ? zoomed : Math.max(active, 0);
      const next = Math.max(0, Math.min(items.length - 1, from + (dx < 0 ? 1 : -1)));
      if (zoomed >= 0) zoomTo(next); else setActive(next);
      return;
    }
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
          onPointerDown={(event) => { downXRef.current = event.clientX; }} onPointerUp={handlePointerUp} />
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
