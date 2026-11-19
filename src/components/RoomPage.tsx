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
import { AwardBios, XpBoot, XpSplash } from '../xp/XpPower.tsx';
import type { XpCatalog } from '../xp/xp-apps.ts';
import { XP_CORNER, XP_LABELS, XP_WIDTH, xpAsset } from '../xp/xp-art.ts';
import type { PcPower } from '../room/pc-model.ts';

export type RoomPageProps = {
  config: SiteConfig;
  summaries: ProjectSummary[];
  // Raccourcis, fenêtres et dossiers du bureau XP, calculés au build.
  xp: XpCatalog;
  locale: Locale;
};

type SceneState = 'loading' | 'ready' | 'failed';
const CRASH_FLAG = 'project-shelf:room-loading';
// Le bouton d'alimentation mène au bureau tant que l'allumage n'existe pas.
const zoneView = (zone: RoomZone): RoomView => (zone === 'power' ? 'desk' : zone);
type ScreenRect = { left: number; top: number; width: number; height: number };
// États du PC : allumé, séquence d'arrêt (écran d'arrêt, image qui s'écrase), éteint, puis
// séquence d'allumage (tube qui chauffe, POST Award, démarrage de XP, accueil).
type PcState = 'on' | 'shutdown' | 'collapse' | 'off' | 'warmup' | 'bios' | 'boot' | 'welcome';
const PC_NEXT: Partial<Record<PcState, [number, PcState]>> = {
  shutdown: [2600, 'collapse'], collapse: [750, 'off'],
  warmup: [1000, 'bios'], bios: [5600, 'boot'], boot: [4200, 'welcome'], welcome: [2000, 'on'],
};
const BOOTING: readonly PcState[] = ['warmup', 'bios', 'boot', 'welcome'];
// Voyants et dalle 3D : éteint dès que l'image s'écrase, occupé pendant les séquences.
const powerOf = (state: PcState): PcPower => (state === 'on' ? 'on' : state === 'off' || state === 'collapse' ? 'off' : 'busy');

// ----------------------------------------------------------------------------
// Rend la scène plein cadre, sans commande : on clique dans la pièce pour s'y déplacer.
// Le titre et l'index des projets restent dans le HTML, masqués visuellement.
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
  const [screenRect, setScreenRect] = useState<ScreenRect | null>(null);
  const [pc, setPc] = useState<PcState>('on');

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
  // Enchaîne les écrans d'allumage et d'extinction, puis met voyants et dalle à jour.
  useEffect(() => {
    sceneRef.current?.setPower(powerOf(pc));
    const next = PC_NEXT[pc];
    if (next === undefined) return;
    const timer = window.setTimeout(() => setPc(next[1]), next[0]);
    return () => window.clearTimeout(timer);
  }, [pc, sceneState]);
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
    // Quitter l'écran pendant une séquence la termine aussitôt.
    if (next !== 'screen') setPc((state) => (BOOTING.includes(state) ? 'on' : state === 'shutdown' || state === 'collapse' ? 'off' : state));
    setView(next);
    setZoomed(-1);
    setActive(-1);
  }
  // Bouton de la tour ou menu Démarrer : la caméra se place face à l'écran pour voir la séquence.
  function togglePower(): void {
    if (pc === 'on') { setPc('shutdown'); setView('screen'); }
    else if (pc === 'off') { setPc('warmup'); setView('screen'); }
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
    const toZone = hit.zone !== null && (hit.zone === 'power' || zoneView(hit.zone) !== view) && !onItem ? hit.zone : null;
    event.currentTarget.style.cursor = onItem ? (hit.index === zoomed ? 'zoom-out' : 'zoom-in') : toZone !== null ? 'pointer' : 'default';
    if (onItem && zoomed < 0) setActive(hit.index);
  }
  function handlePointerLeave(): void {
    sceneRef.current?.setPointer(0, 0);
    if (zoomed < 0) setActive(-1);
  }
  function handleClick(event: MouseEvent<HTMLCanvasElement>): void {
    const scene = sceneRef.current;
    if (scene === null) return;
    const hit = scene.pick(event.clientX, event.clientY);
    if (hit.zone === 'power') { togglePower(); return; }
    if (view === 'shelf' && hit.index >= 0) { zoomTo(hit.index === zoomed ? -1 : hit.index); return; }
    if (hit.zone !== null && zoneView(hit.zone) !== view) { goTo(zoneView(hit.zone)); return; }
    // Sans bouton ni étiquette, un clic à côté ramène en arrière : boîte, puis vue, puis vue d'ensemble.
    if (zoomed >= 0) zoomTo(-1);
    else if (view === 'screen' || hit.zone === null) back();
  }
  function handleKeyDown(event: globalThis.KeyboardEvent): void {
    // Une touche pendant l'allumage passe directement au bureau.
    if (BOOTING.includes(pc) && event.key !== 'Escape') { setPc('on'); event.preventDefault(); return; }
    if (event.key === 'Escape' && (zoomed >= 0 || view !== 'overview')) { back(); event.preventDefault(); return; }
    if (view !== 'shelf' || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select') !== null) return;
    step(event.key === 'ArrowRight' ? 1 : -1);
    event.preventDefault();
  }

  // Le canvas ne prend pas le focus : les touches sont écoutées sur toute la fenêtre.
  keyRef.current = handleKeyDown;

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
        {view === 'screen' && screenRect !== null && pc !== 'off' && (
          <div className={`room__screen is-${pc}`} style={{ left: screenRect.left, top: screenRect.top, transform: `scale(${screenRect.width / XP_WIDTH})`, borderRadius: XP_CORNER }}
            onClick={() => { if (BOOTING.includes(pc)) setPc('on'); }}>
            {pc === 'on' && <XpDesktop locale={locale} catalog={xpCatalog} base={base} onTurnOff={() => setPc('shutdown')} />}
            {(pc === 'shutdown' || pc === 'collapse') && <div className="room__tube"><XpSplash logo={xpAsset(base, 'logo')} labels={xp} mode="shutdown" /></div>}
            {pc === 'warmup' && <div className="xp-power" />}
            {pc === 'bios' && <AwardBios />}
            {pc === 'boot' && <XpBoot logo={xpAsset(base, 'logo')} />}
            {pc === 'welcome' && <XpSplash logo={xpAsset(base, 'logo')} labels={xp} mode="welcome" />}
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
