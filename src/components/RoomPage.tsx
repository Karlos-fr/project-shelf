// ============================================================================
// RoomPage — Page autonome de la chambre 3D, à part de la vitrine
// ----------------------------------------------------------------------------
// Une chambre de la fin des années 90 : on clique pour passer d'un point de vue fixe
// à l'autre (vue d'ensemble, bureau, étagère). L'étagère ne porte que les projets
// sortis en boîte. Sans JavaScript ou sans WebGPU/WebGL, la page garde le titre et
// la liste des liens vers les fiches complètes.
// ============================================================================
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { SiteConfig } from '../config/site.ts';
import type { Locale } from '../domain/locale.ts';
import type { ProjectSummary } from '../domain/project.ts';
import { assetUrl, formatRoute, type RouteState } from '../domain/routes.ts';
import { MESSAGES } from '../i18n/messages.ts';
import { crossOriginFor } from '../media/ambilight.ts';
import { CRASH_GRACE_MS, readCrashFlag, writeCrashFlag } from '../shelf/crash-guard.ts';
import { selectShelfItems } from '../shelf/shelf-items.ts';
import type { RoomScene, RoomView, RoomZone } from '../room/room-scene.ts';
import XpDesktop from '../xp/XpDesktop.tsx';
import type { XpCatalog } from '../xp/xp-apps.ts';
import { XP_CORNER, XP_LABELS, XP_WIDTH, xpAsset } from '../xp/xp-art.ts';

export type RoomPageProps = {
  config: SiteConfig;
  summaries: ProjectSummary[];
  // Raccourcis, fenêtres et dossiers du bureau XP, calculés au build.
  xp: XpCatalog;
  locale: Locale;
};

type SceneState = 'loading' | 'ready' | 'failed';
const CRASH_FLAG = 'project-shelf:room-loading';
const VIEW_ORDER: readonly RoomView[] = ['overview', 'desk', 'screen', 'shelf'];
// Le bouton d'alimentation mène au bureau tant que l'allumage n'existe pas.
const zoneView = (zone: RoomZone): RoomView => (zone === 'power' ? 'desk' : zone);
type ScreenRect = { left: number; top: number; width: number; height: number };

// ----------------------------------------------------------------------------
// Rend l'en-tête, la scène plein cadre avec ses commandes, puis l'index des projets.
// ----------------------------------------------------------------------------
export default function RoomPage({ config, summaries, xp: xpCatalog, locale }: RoomPageProps) {
  const messages = MESSAGES[locale];
  const route: RouteState = { locale, projectId: null, categories: [], sort: 'updated', q: '' };
  const base = config.base;
  const root = base.endsWith('/') ? base : `${base}/`;
  // Seuls les projets qui ont eu un support physique vont sur l'étagère.
  const items = selectShelfItems(summaries).filter((item) => item.object.kind !== 'tv');
  const ids = items.map((item) => item.project.id).join(',');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<RoomScene | null>(null);
  const keyRef = useRef<((event: globalThis.KeyboardEvent) => void) | null>(null);
  const [sceneState, setSceneState] = useState<SceneState>('loading');
  const [progress, setProgress] = useState(0);
  const [view, setView] = useState<RoomView>('overview');
  const [active, setActive] = useState(-1);
  const [zoomed, setZoomed] = useState(-1);
  const [hover, setHover] = useState<{ zone: RoomZone; x: number; y: number } | null>(null);
  const [screenRect, setScreenRect] = useState<ScreenRect | null>(null);
  const labels: Record<RoomView, string> = { overview: messages.roomOverview, desk: messages.roomDesk, screen: messages.roomScreen, shelf: messages.roomShelf };

  // Charge la scène dès l'hydratation : la chambre est tout le contenu de la page.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    let disposed = false;
    let clearFlag = 0;
    // Un chargement précédent n'a jamais abouti : on reste sur la version HTML.
    if (readCrashFlag(CRASH_FLAG)) { setSceneState('failed'); return; }
    writeCrashFlag(CRASH_FLAG, true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    void import('../room/room-scene.ts')
      .then(({ createRoomScene }) => createRoomScene({
        canvas, reducedMotion,
        onProgress: (fraction) => { if (!disposed) setProgress(Math.round(fraction * 100)); },
        roomBase: `${root}room/`,
        pc: {
          labels: XP_LABELS[locale],
          asset: (name) => xpAsset(base, name),
          projects: summaries.map((project) => {
            const image = assetUrl(project.preview.poster, base);
            return { label: project.name, image, crossOrigin: crossOriginFor(image) };
          }),
        },
        shelfBase: `${root}shelf/`,
        items: items.map(({ project, object }) => {
          const poster = assetUrl(project.preview.poster, base);
          return { id: project.id, name: project.name, meta: project.categoryLabels[locale][0] ?? '', object, poster, crossOrigin: crossOriginFor(poster) };
        }),
      }))
      .then((scene) => {
        if (disposed) { scene.dispose(); return; }
        sceneRef.current = scene;
        setSceneState('ready');
        clearFlag = window.setTimeout(() => writeCrashFlag(CRASH_FLAG, false), CRASH_GRACE_MS);
      })
      .catch(() => { writeCrashFlag(CRASH_FLAG, false); if (!disposed) setSceneState('failed'); });
    const onResize = () => sceneRef.current?.resize();
    const onVisibility = () => sceneRef.current?.setRunning(document.visibilityState === 'visible');
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      window.clearTimeout(clearFlag);
      writeCrashFlag(CRASH_FLAG, false);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // La scène est reconstruite seulement si la liste d'objets ou la langue change.
  }, [ids, base, locale]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => keyRef.current?.(event);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { sceneRef.current?.setView(view); }, [view, sceneState]);
  useEffect(() => { sceneRef.current?.setActive(active); }, [active, sceneState]);
  // Face à l'écran : l'interface HTML se cale sur la dalle dès que la caméra est arrivée.
  useEffect(() => {
    const scene = sceneRef.current;
    if (scene === null || view !== 'screen') { setScreenRect(null); return; }
    let frame = 0;
    let last = '';
    const follow = () => {
      const rect = scene.screenRect();
      const key = rect === null ? '' : [rect.left, rect.top, rect.width, rect.height].map((v) => v.toFixed(1)).join(',');
      if (key !== last) { last = key; setScreenRect(rect); }
      frame = window.requestAnimationFrame(follow);
    };
    follow();
    return () => window.cancelAnimationFrame(frame);
  }, [view, sceneState]);
  useEffect(() => { sceneRef.current?.setZoom(zoomed); }, [zoomed, sceneState]);

  function goTo(next: RoomView): void {
    setView(next);
    setZoomed(-1);
    setActive(-1);
    setHover(null);
  }
  // Premier clic sur une boîte : la caméra s'en approche ; re-clic ou clic à côté : elle recule.
  function zoomTo(index: number): void {
    setZoomed(index);
    if (index >= 0) setActive(index);
  }
  function step(direction: number): void {
    if (items.length === 0) return;
    const from = zoomed >= 0 ? zoomed : active;
    const next = from < 0 ? (direction > 0 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, from + direction));
    if (zoomed >= 0) zoomTo(next); else setActive(next);
  }
  function back(): void {
    if (zoomed >= 0) zoomTo(-1);
    else if (view === 'screen') goTo('desk');
    else if (view !== 'overview') goTo('overview');
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    const scene = sceneRef.current;
    if (scene === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    scene.setPointer(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    const hit = scene.pick(event.clientX, event.clientY);
    const onItem = view === 'shelf' && hit.index >= 0;
    const toZone = hit.zone !== null && zoneView(hit.zone) !== view && !onItem ? hit.zone : null;
    event.currentTarget.style.cursor = onItem ? (hit.index === zoomed ? 'zoom-out' : 'zoom-in') : toZone !== null ? 'pointer' : 'default';
    setHover(toZone === null ? null : { zone: toZone, x: event.clientX - rect.left, y: event.clientY - rect.top });
    if (onItem && zoomed < 0) setActive(hit.index);
  }
  function handlePointerLeave(): void {
    sceneRef.current?.setPointer(0, 0);
    setHover(null);
    if (zoomed < 0) setActive(-1);
  }
  function handleClick(event: MouseEvent<HTMLCanvasElement>): void {
    const scene = sceneRef.current;
    if (scene === null) return;
    const hit = scene.pick(event.clientX, event.clientY);
    if (view === 'shelf' && hit.index >= 0) { zoomTo(hit.index === zoomed ? -1 : hit.index); return; }
    if (hit.zone !== null && zoneView(hit.zone) !== view) { goTo(zoneView(hit.zone)); return; }
    if (zoomed >= 0) zoomTo(-1);
  }
  function handleKeyDown(event: globalThis.KeyboardEvent): void {
    if (event.key === 'Escape' && (zoomed >= 0 || view !== 'overview')) { back(); event.preventDefault(); return; }
    if (view !== 'shelf' || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select') !== null) return;
    step(event.key === 'ArrowRight' ? 1 : -1);
    event.preventDefault();
  }

  // Le canvas ne prend pas le focus : les touches sont écoutées sur toute la fenêtre.
  keyRef.current = handleKeyDown;

  const current = view === 'shelf' ? items[active] : undefined;
  const hint = view === 'shelf' ? messages.roomHintShelf : messages.roomHint;
  const xp = XP_LABELS[locale];
  return (
    <main className="room-page" data-state={sceneState}>
      {/* Titre et liens restent dans le HTML : lecteurs d'écran, référencement, et repli si la 3D échoue. */}
      <h1 className="sr-only">{messages.roomPageTitle}</h1>
      <div className="room__stage" data-state={sceneState}>
        <canvas ref={canvasRef} className="room__canvas" aria-hidden="true"
          onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} onClick={handleClick} />
        {sceneState === 'loading' && (
          <div className="room__loading">
            <span>{messages.roomLoading}</span>
            <div className="room__progress" role="progressbar" aria-label={messages.roomLoading}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="room__percent">{progress} %</span>
          </div>
        )}
        {hover !== null && <span className="room__tip" style={{ left: hover.x, top: hover.y }}>{labels[zoneView(hover.zone)]}</span>}
        {view === 'screen' && screenRect !== null && (
          <div className="room__screen" style={{ left: screenRect.left, top: screenRect.top, transform: `scale(${screenRect.width / XP_WIDTH})`, borderRadius: XP_CORNER }}>
            <XpDesktop locale={locale} catalog={xpCatalog} base={base} onTurnOff={() => goTo('desk')} />
          </div>
        )}
        {view === 'screen' && sceneState === 'ready' && <button type="button" className="room__exit" onClick={() => goTo('desk')}>{xp.exit}</button>}
        {sceneState === 'ready' && view !== 'screen' && (
          <div className="room__hud">
            <nav className="room__views" aria-label={messages.roomViews}>
              {VIEW_ORDER.map((name) => (
                <button key={name} type="button" aria-pressed={view === name} onClick={() => goTo(name)}>{labels[name]}</button>
              ))}
            </nav>
            {view === 'shelf' && (
              <div className={`room__caption${current === undefined ? ' is-empty' : ''}`} aria-live="polite">
                <strong>{current === undefined ? messages.roomIdle : current.project.name}</strong>
                {current !== undefined && <span>{current.project.tagline[locale]}</span>}
                {current !== undefined && (
                  <a href={formatRoute({ ...route, projectId: current.project.id }, base)}>{messages.shelfOpen}</a>
                )}
              </div>
            )}
            <p className="room__hint">{hint}</p>
          </div>
        )}
      </div>
      <section className={sceneState === 'failed' ? 'room__fallback' : 'sr-only'} aria-labelledby="room-index">
        {sceneState === 'failed' && <p>{messages.roomFailed}</p>}
        <h2 id="room-index">{messages.roomIndex}</h2>
        <ul className="shelf__index">
          {summaries.map((project) => (
            <li key={project.id}><a href={formatRoute({ ...route, projectId: project.id }, base)}>{project.name}</a></li>
          ))}
        </ul>
        <p><a href={`${root}${locale}/`}>{messages.shelfBack}</a></p>
      </section>
    </main>
  );
}
