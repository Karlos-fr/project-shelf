// ============================================================================
// RoomPage — Page autonome de la chambre 3D, à part de la vitrine
// ----------------------------------------------------------------------------
// Une chambre de la fin des années 90 : on clique pour passer d'un point de vue fixe
// à l'autre (vue d'ensemble, bureau, étagère). L'étagère ne porte que les projets
// sortis en boîte. Sans JavaScript ou sans WebGPU/WebGL, la page garde le titre et
// la liste des liens vers les fiches complètes.
// ============================================================================
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { SiteConfig } from '../config/site.ts';
import type { Locale } from '../domain/locale.ts';
import type { ProjectSummary } from '../domain/project.ts';
import { assetUrl, formatRoute, type RouteState } from '../domain/routes.ts';
import { MESSAGES } from '../i18n/messages.ts';
import { crossOriginFor } from '../media/ambilight.ts';
import { consumeCrashFlag, CRASH_GRACE_MS, guardLoading } from '../shelf/crash-guard.ts';
import { selectShelfItems } from '../shelf/shelf-items.ts';
import type { RoomScene, RoomView, RoomZone } from '../room/room-scene.ts';
import XpDesktop from '../xp/XpDesktop.tsx';
import { AwardBios, XpBoot, XpSplash } from '../xp/XpPower.tsx';
import type { XpCatalog } from '../xp/xp-apps.ts';
import { XP_CORNER, XP_HEIGHT, XP_LABELS, XP_WIDTH, xpAsset } from '../xp/xp-art.ts';
import { quadTransform } from '../room/homography.ts';
import { bootKey, BOOTING, PC_NEXT, powerOf, screenOf, type PcState } from '../room/pc-power.ts';

export type RoomPageProps = {
  config: SiteConfig;
  summaries: ProjectSummary[];
  // Raccourcis, fenêtres et dossiers du bureau XP, calculés au build.
  xp: XpCatalog;
  locale: Locale;
};

type SceneState = 'loading' | 'ready' | 'failed';
// Marque de session posée pendant le chargement de la scène (garde-fou anti-plantage).
const CRASH_FLAG = 'project-shelf:room-loading';
// Bouton d'alimentation et interrupteur agissent sur place ; les autres zones mènent à une vue.
const zoneView = (zone: RoomZone): RoomView => (zone === 'power' ? 'desk' : zone === 'switch' ? 'overview' : zone);
const isAction = (zone: RoomZone | null) => zone === 'power' || zone === 'switch';
// Pas d'une flèche du clavier autour du cube : 15°.
const ORBIT_STEP = Math.PI / 12;

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
  const [gpu, setGpu] = useState('');
  // ?fps dans l'URL : la scène redessine en continu et affiche ses images par seconde.
  const [fps, setFps] = useState<number | null>(null);
  const [noWebGpu, setNoWebGpu] = useState(false);
  const [view, setView] = useState<RoomView>('overview');
  // Glissé en cours : orbite autour du cube ou de l'île, ou, au doigt, regard dans les autres vues.
  const dragRef = useRef<{ x: number; y: number; moved: number; look: boolean } | null>(null);
  const draggedRef = useRef(false);
  const [active, setActive] = useState(-1);
  const [zoomed, setZoomed] = useState(-1);
  // Transformation CSS qui plaque le bureau XP sur la dalle 3D, dans toutes les vues où elle se voit.
  const [screenTransform, setScreenTransform] = useState<string | null>(null);
  // Dernière transformation connue : le bureau garde sa place, masqué, quand la dalle sort du champ.
  const lastTransformRef = useRef('none');
  const [pc, setPc] = useState<PcState>('on');
  // Début de la phase en cours : le BIOS reprend là où il en était si l'on revient à l'écran.
  const phaseStart = useMemo(() => performance.now(), [pc]);

  // Charge la scène dès l'hydratation : la chambre est tout le contenu de la page.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    let disposed = false;
    let clearFlag = 0;
    let fpsTimer = 0;
    // Un chargement précédent n'a jamais abouti : on reste une fois sur la version HTML ;
    // la marque est effacée, le rechargement suivant retente la 3D.
    if (consumeCrashFlag(CRASH_FLAG)) { setSceneState('failed'); return; }
    // Marque posée pendant le chargement, effacée si la page est quittée normalement.
    const releaseGuard = guardLoading(CRASH_FLAG);
    const showFps = new URLSearchParams(window.location.search).has('fps');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    void import('../room/room-scene.ts')
      .then(({ createRoomScene }) => createRoomScene({
        canvas, reducedMotion, continuous: showFps,
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
        setGpu(scene.gpu);
        if (showFps) {
          let last = performance.now();
          let count = scene.frames();
          setFps(0);
          fpsTimer = window.setInterval(() => {
            const now = performance.now();
            const frames = scene.frames();
            setFps(Math.round((frames - count) * 1000 / (now - last)));
            last = now;
            count = frames;
          }, 500);
        }
        setSceneState('ready');
        clearFlag = window.setTimeout(releaseGuard, CRASH_GRACE_MS);
      })
      .catch((error: unknown) => {
        releaseGuard();
        if (disposed) return;
        setNoWebGpu(error instanceof Error && error.name === 'WebGpuUnavailableError');
        setSceneState('failed');
      });
    const onResize = () => sceneRef.current?.resize();
    const onVisibility = () => sceneRef.current?.setRunning(document.visibilityState === 'visible');
    // Safari iOS reprend un glissé à un doigt pour faire défiler ou rebondir la page, malgré
    // touch-action: none, et annule alors les pointer events (pointercancel) : la vue ne tournait
    // pas. Bloquer touchmove sur le canvas lui laisse le geste ; le tap reste un clic.
    const holdGesture = (event: TouchEvent) => { if (event.cancelable) event.preventDefault(); };
    canvas.addEventListener('touchmove', holdGesture, { passive: false });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      window.clearTimeout(clearFlag);
      window.clearInterval(fpsTimer);
      releaseGuard();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('touchmove', holdGesture);
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
    sceneRef.current?.setScreen(screenOf(pc));
    const next = PC_NEXT[pc];
    if (next === undefined) return;
    const timer = window.setTimeout(() => setPc(next[1]), next[0]);
    return () => window.clearTimeout(timer);
  }, [pc, sceneState]);
  // Le vrai bureau XP (HTML) est plaqué en perspective sur la dalle, de près comme de loin :
  // l'écran 3D montre exactement ce qui est affiché. Masqué si un objet passe devant.
  useEffect(() => {
    const scene = sceneRef.current;
    if (scene === null) { setScreenTransform(null); return; }
    let frame = 0;
    const follow = () => {
      const quad = scene.screenQuad();
      const transform = quad === null ? null : quadTransform(XP_WIDTH, XP_HEIGHT, quad);
      if (transform !== null) lastTransformRef.current = transform;
      setScreenTransform(transform);
      frame = window.requestAnimationFrame(follow);
    };
    follow();
    return () => window.cancelAnimationFrame(frame);
  }, [sceneState]);
  // Bureau HTML monté tant que le PC n'est pas éteint, même quand la dalle sort du champ :
  // ses fenêtres, pages et vidéos survivent à un regard ailleurs. Il n'est que masqué.
  const overlayMounted = sceneState === 'ready' && pc !== 'off';
  // Bureau HTML visible sous le canvas : la vitre 3D n'y ajoute que ses reflets.
  const overlayOn = overlayMounted && screenTransform !== null;
  useEffect(() => { sceneRef.current?.setScreenOverlay(overlayOn); }, [overlayOn, sceneState]);
  useEffect(() => { sceneRef.current?.setZoom(zoomed); }, [zoomed, sceneState]);

  function goTo(next: RoomView): void {
    sceneRef.current?.setPointer(0, 0);
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
    else if (view === 'cube' || view === 'lego') goTo('shelf');
    else if (view !== 'overview') goTo('overview');
  }

  // Vues du cube et de l'île : un glissé horizontal fait tourner la caméra autour de l'objet.
  // Vue d'ensemble : souris ou doigt font tourner le regard sur 360°. Au doigt, dans les autres
  // vues, le glissé oriente un peu le regard. Le clic qui termine un glissé est ignoré.
  const orbiting = view === 'cube' || view === 'lego';
  const lookingAround = view === 'overview';
  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    draggedRef.current = false;
    const touch = event.pointerType !== 'mouse';
    if (event.button !== 0 || (!orbiting && !lookingAround && !touch) || view === 'screen') return;
    dragRef.current = { x: event.clientX, y: event.clientY, moved: 0, look: !orbiting };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (orbiting || lookingAround) event.currentTarget.style.cursor = 'grabbing';
  }
  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>): void {
    if (dragRef.current === null) return;
    draggedRef.current = dragRef.current.moved > 6;
    dragRef.current = null;
    if (orbiting || lookingAround) event.currentTarget.style.cursor = 'grab';
  }
  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    const scene = sceneRef.current;
    if (scene === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const drag = dragRef.current;
    if (drag !== null) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (!drag.look) {
        // Toute la largeur du cadre vaut environ 230° : on fait tourner l'objet comme sur une platine.
        scene.orbitView(-dx / rect.width * Math.PI * 1.3);
      } else {
        // Le doigt tire la vue, comme une photo panoramique : glisser vers la droite tourne le regard
        // vers la gauche. Toute la largeur de l'écran vaut environ 70° (180° en vue d'ensemble,
        // pour faire le tour de la pièce en deux glissés).
        scene.look(dx / rect.width * (lookingAround ? Math.PI : 1.2), dy / rect.height * 0.8);
      }
      return;
    }
    if (event.pointerType !== 'mouse') return;
    scene.setPointer(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    const hit = scene.pick(event.clientX, event.clientY);
    if (orbiting && hit.zone === view) { event.currentTarget.style.cursor = 'grab'; return; }
    const onItem = view === 'shelf' && hit.index >= 0;
    const toZone = hit.zone !== null && (isAction(hit.zone) || zoneView(hit.zone) !== view) && !onItem ? hit.zone : null;
    event.currentTarget.style.cursor = onItem ? (hit.index === zoomed ? 'zoom-out' : 'zoom-in') : toZone !== null ? 'pointer' : lookingAround ? 'grab' : 'default';
    if (onItem && zoomed < 0) setActive(hit.index);
  }
  function handlePointerLeave(event: PointerEvent<HTMLCanvasElement>): void {
    // Au doigt, le regard reste où on l'a laissé ; la souris, elle, recentre la vue en sortant.
    if (event.pointerType !== 'mouse') return;
    sceneRef.current?.setPointer(0, 0);
    if (zoomed < 0) setActive(-1);
  }
  function handleClick(event: MouseEvent<HTMLCanvasElement>): void {
    const scene = sceneRef.current;
    if (scene === null) return;
    if (draggedRef.current) { draggedRef.current = false; return; }
    const hit = scene.pick(event.clientX, event.clientY);
    if (hit.zone === 'power') { scene.pressPower(); togglePower(); return; }
    if (hit.zone === 'switch') { scene.toggleLight(); return; }
    if (view === 'shelf' && hit.index >= 0) { zoomTo(hit.index === zoomed ? -1 : hit.index); return; }
    if (hit.zone !== null && zoneView(hit.zone) !== view) { goTo(zoneView(hit.zone)); return; }
    // Sans bouton ni étiquette, un clic à côté ramène en arrière : boîte, puis vue, puis vue d'ensemble.
    if (zoomed >= 0) zoomTo(-1);
    else if (view === 'screen' || hit.zone === null) back();
  }
  function handleKeyDown(event: globalThis.KeyboardEvent): void {
    // Face à l'écran pendant l'allumage : F1 fait repartir le BIOS, une autre touche passe au
    // bureau. Tab, Échap, les modificateurs seuls et les touches répétées gardent leur rôle.
    const boot = bootKey(pc, event.key, event.repeat, view === 'screen');
    if (boot !== null) {
      if (boot !== 'hold') setPc(boot);
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape' && (zoomed >= 0 || view !== 'overview')) { back(); event.preventDefault(); return; }
    if (orbiting && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      sceneRef.current?.orbitView(ORBIT_STEP * (event.key === 'ArrowLeft' ? 1 : -1));
      event.preventDefault();
      return;
    }
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
      <div className="room__stage" data-state={sceneState}
        onClick={(event) => { if (view === 'screen' && event.target === event.currentTarget) handleClick(event as unknown as MouseEvent<HTMLCanvasElement>); }}>
        <canvas ref={canvasRef} className={`room__canvas${view === 'screen' ? ' is-passive' : ''}`} aria-hidden="true"
          onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
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
        {sceneState === 'ready' && gpu !== '' && <span className="room__gpu">{gpu}{fps !== null && ` · ${fps} FPS`}</span>}
        {overlayMounted && (
          <div className={`room__screen is-${pc}${view === 'screen' ? '' : ' is-far'}${overlayOn ? '' : ' is-hidden'}`}
            style={{ transform: screenTransform ?? lastTransformRef.current, borderRadius: XP_CORNER }}
            aria-hidden={view !== 'screen'} inert={view !== 'screen'}
            onClick={() => { if (pc === 'bios') setPc('boot'); else if (BOOTING.includes(pc)) setPc('on'); }}>
            {pc === 'on' && <XpDesktop locale={locale} catalog={xpCatalog} base={base} active={view === 'screen'} onTurnOff={() => setPc('shutdown')} />}
            {(pc === 'shutdown' || pc === 'collapse') && <div className="room__tube"><XpSplash logo={xpAsset(base, 'logo')} labels={xp} mode="shutdown" /></div>}
            {pc === 'warmup' && <div className="xp-power" />}
            {pc === 'bios' && <AwardBios startedAt={phaseStart} />}
            {pc === 'boot' && <XpBoot logo={xpAsset(base, 'logo')} />}
            {pc === 'welcome' && <XpSplash logo={xpAsset(base, 'logo')} labels={xp} mode="welcome" />}
          </div>
        )}
      </div>
      <section className={sceneState === 'failed' ? 'room__fallback' : 'sr-only'} aria-labelledby="room-index">
        {sceneState === 'failed' && <p>{noWebGpu ? messages.roomNoWebGpu : messages.roomFailed}</p>}
        {sceneState === 'failed' && !noWebGpu && (
          <p><button type="button" className="room__retry" onClick={() => window.location.reload()}>{messages.roomRetry}</button></p>
        )}
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
