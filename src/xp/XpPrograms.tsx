// ============================================================================
// XpPrograms — Internet Explorer, Lecteur Windows Media, Explorateur et Démineur façon XP
// ----------------------------------------------------------------------------
// Contenus des fenêtres du bureau XP de la chambre. Internet Explorer affiche la démo
// d'un projet dans un cadre ; le Lecteur Windows Media lit sa vidéo ; l'Explorateur
// parcourt le Poste de travail, Mes documents et un dossier par catégorie. Les
// barres d'outils reprennent la disposition d'origine ; seuls les boutons utiles
// réagissent, les autres sont présents pour l'aspect.
// ============================================================================
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { XpApp, XpBrowserApp, XpCatalog, XpPlayerApp, XpWindowApp } from './xp-apps.ts';
import { SHORTCUT_SVG, svgUrl, type XP_LABELS, type XpFile } from './xp-art.ts';

type Labels = (typeof XP_LABELS)['fr'] | (typeof XP_LABELS)['en'];
type Asset = (name: XpFile) => string;

// ----------------------------------------------------------------------------
// Barre de menus texte, identique dans chaque programme, et animation Windows à droite.
// Les menus sont décoratifs (aria-hidden) : aucun ne s'ouvre.
// ----------------------------------------------------------------------------
function MenuBar({ labels, asset, extra }: { labels: Labels; asset: Asset; extra?: ReactNode }) {
  return (
    <div className="xp-app__menubar">
      <div className="xp-app__menus" aria-hidden="true">
        {[labels.menuFile, labels.menuEdit, labels.menuView, labels.menuFavorites, labels.menuTools, labels.menuHelp].map((label) => <span key={label}>{label}</span>)}
        {extra}
      </div>
      <img className="xp-app__throbber" src={asset('throbber')} alt="" draggable={false} />
    </div>
  );
}

// Bouton de barre d'outils : icône, libellé facultatif, petite flèche de liste déroulante.
type ToolProps = { icon: string; label?: string; title: string; disabled?: boolean; arrow?: boolean; small?: boolean; onClick?: () => void };
// ----------------------------------------------------------------------------
// Bouton de barre d'outils ; sans onClick, il est désactivé (présent pour l'aspect).
// ----------------------------------------------------------------------------
function Tool({ icon, label, title, disabled = false, arrow = false, small = false, onClick }: ToolProps) {
  return (
    <button type="button" className="xp-app__tool" disabled={disabled || onClick === undefined} title={title} aria-label={title} onClick={onClick}>
      <img className={small ? 'is-small' : undefined} src={icon} alt="" draggable={false} />
      {label !== undefined && <span>{label}</span>}
      {arrow && <i className="xp-app__arrow" aria-hidden="true" />}
    </button>
  );
}

// Marge du jeu autour de son plateau, rognée par la fenêtre : en dessous, le jeu réduirait
// son plateau pour tenir dans le cadre.
const GAME_MARGIN = 24;
// Intervalle de suivi du plateau du Démineur (menu déroulé, difficulté), en millisecondes.
const FIT_MS = 200;

// ----------------------------------------------------------------------------
// Fenêtre du Démineur (Minesweeper Infinite) : le jeu dans un cadre, sans navigateur.
// Quand sa page est lisible (même origine, donc sur le site en ligne), la fenêtre épouse
// le plateau et la barre de menus, s'agrandit le temps que le menu Game est déroulé et suit
// les changements de difficulté ; onResize reçoit l'écart en pixels. En mode « Fit to
// window », c'est le jeu qui remplit la fenêtre. Ailleurs, elle garde sa taille de départ.
// active est vrai quand la fenêtre se voit : hors champ ou réduite, l'ajustement s'arrête.
// ----------------------------------------------------------------------------
export function XpGameWindow({ app, active, onResize }: { app: XpWindowApp; active: boolean; onResize(dw: number, dh: number): void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef(0);
  const fitRef = useRef(onResize);
  // Ajustement de la fenêtre au plateau, prêt une fois la page du jeu chargée.
  const fitterRef = useRef<(() => void) | null>(null);
  fitRef.current = onResize;
  // Suivi du plateau toutes les FIT_MS tant que la fenêtre se voit ; arrêté sinon et au démontage.
  useEffect(() => {
    window.clearInterval(timerRef.current);
    const fit = fitterRef.current;
    if (!active || fit === null) return undefined;
    fit();
    timerRef.current = window.setInterval(fit, FIT_MS);
    return () => window.clearInterval(timerRef.current);
  }, [active]);
  function handleLoad(): void {
    const frame = frameRef.current;
    let doc: Document | null = null;
    try { doc = frame?.contentDocument ?? null; } catch { doc = null; }
    if (frame === null || doc === null) return;
    const page = doc;
    // Fond gris de Windows autour du plateau, au lieu du fond sombre de la page du jeu.
    page.documentElement.style.background = page.body.style.background = '#ece9d8';
    // Ligne cochée du menu Game : la coche est une image.
    const checked = (row: Element) => row.querySelector('.ms-menu__check img') !== null;
    const fit = () => {
      const rows = [...page.querySelectorAll('.ms-menu__panel--game .ms-menu__row')];
      if (rows.some((row) => checked(row) && row.textContent?.includes('Fit to window'))) return;
      // Le jeu réduit son plateau quand le cadre est trop petit : sa barre de menus fait alors
      // moins de 20 px (fois le zoom). On agrandit, puis on réajuste au tour suivant.
      const zoom = Number(rows.find((row) => checked(row) && row.hasAttribute('data-zoom'))?.getAttribute('data-zoom') ?? 1);
      const bar = page.querySelector<HTMLElement>('.ms-menu__topbar');
      if (bar !== null && bar.offsetHeight > 0 && bar.offsetHeight < 20 * zoom - 0.5) { fitRef.current(160, 160); return; }
      const parts = ['.ms-board', '.ms-menu__topbar', '.ms-menu__panel']
        .flatMap((selector) => [...page.querySelectorAll(selector)].map((element) => element.getBoundingClientRect()))
        .filter((rect) => rect.width > 0 && rect.height > 0);
      if (parts.length === 0) return;
      const width = Math.ceil(Math.max(...parts.map((rect) => rect.right)) - Math.min(...parts.map((rect) => rect.left)));
      const height = Math.ceil(Math.max(...parts.map((rect) => rect.bottom)) - Math.min(...parts.map((rect) => rect.top)));
      const dw = width - (frame.clientWidth - 2 * GAME_MARGIN);
      const dh = height - (frame.clientHeight - 2 * GAME_MARGIN);
      if (dw !== 0 || dh !== 0) fitRef.current(dw, dh);
    };
    fitterRef.current = fit;
    window.clearInterval(timerRef.current);
    if (!active) return;
    fit();
    timerRef.current = window.setInterval(fit, FIT_MS);
  }
  const outset = { left: -GAME_MARGIN, top: -GAME_MARGIN, width: `calc(100% + ${2 * GAME_MARGIN}px)`, height: `calc(100% + ${2 * GAME_MARGIN}px)` };
  return (
    <div className="xp-game">
      <iframe ref={frameRef} src={app.url} title={app.name} style={outset} onLoad={handleLoad} />
    </div>
  );
}

// Délai hors champ avant de suspendre une page d'Internet Explorer, en millisecondes : un
// coup d'œil ailleurs garde la démo en cours ; au-delà, son et calcul s'arrêtent.
const BROWSER_SUSPEND_MS = 5000;

// ----------------------------------------------------------------------------
// Internet Explorer 6 : barre de menus, boutons, barre d'adresse, page et barre d'état.
// Paramètres : active est vrai quand la fenêtre se voit. Une page d'une autre origine ne
// peut pas être mise en pause : après BROWSER_SUSPEND_MS hors champ, son cadre est retiré
// (son et calcul coupés), puis rechargé au retour.
// ----------------------------------------------------------------------------
export function XpBrowser({ app, labels, asset, active }: { app: XpBrowserApp; labels: Labels; asset: Asset; active: boolean }) {
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);
  const openInTab = () => window.open(app.url, '_blank', 'noopener');
  // Hors champ : suspend la page après le délai ; un retour avant son terme l'annule.
  useEffect(() => {
    if (active) return undefined;
    const timer = window.setTimeout(() => setSuspended(true), BROWSER_SUSPEND_MS);
    return () => window.clearTimeout(timer);
  }, [active]);
  // Retour à l'écran : la page suspendue est rechargée.
  useEffect(() => {
    if (active && suspended) { setSuspended(false); setLoading(true); }
  }, [active, suspended]);
  return (
    <div className="xp-app xp-browser">
      <MenuBar labels={labels} asset={asset} />
      <div className="xp-app__toolbar">
        <Tool icon={asset('back')} label={labels.back} title={labels.back} arrow disabled />
        <Tool icon={asset('forward')} title={labels.forward} arrow disabled />
        {/* Arrêter ne coupe que l'indicateur de chargement : une page d'une autre origine ne
            s'interrompt pas. Démarrage recharge la démo, sa seule page d'accueil. */}
        <Tool icon={asset('stop')} title={labels.stop} onClick={() => setLoading(false)} />
        <Tool icon={asset('refresh')} title={labels.refresh} onClick={() => { setLoading(true); setReload((n) => n + 1); }} />
        <Tool icon={asset('home')} title={labels.home} onClick={() => { setLoading(true); setReload((n) => n + 1); }} />
        <span className="xp-app__separator" />
        <Tool icon={asset('searchLarge')} label={labels.search} title={labels.search} small disabled />
        <Tool icon={asset('favorites')} label={labels.favorites} title={labels.favorites} small disabled />
        <Tool icon={asset('history')} title={labels.history} disabled />
      </div>
      <div className="xp-app__address">
        <span className="xp-app__address-title">{labels.address}</span>
        <span className="xp-app__address-field"><img src={asset('ie')} alt="" /><span>{app.url}</span></span>
        <button type="button" className="xp-app__go" title={labels.openInTab} onClick={openInTab}><img src={asset('go')} alt="" />{labels.go}</button>
        <span className="xp-app__address-sep" />
        <span className="xp-app__links">{labels.links}</span>
      </div>
      <div className="xp-browser__page">
        {suspended
          ? <div className="xp-browser__suspended" aria-hidden="true" />
          : <iframe key={reload} src={app.url} title={app.name} allow="fullscreen; autoplay; gamepad" onLoad={() => setLoading(false)} />}
      </div>
      <div className="xp-app__status">
        <span className="xp-app__status-main"><img src={asset('ie')} alt="" />{loading ? `${app.url}…` : labels.done}</span>
        <button type="button" className="xp-app__status-link" onClick={openInTab}>{labels.openInTab} ↗</button>
        <span className="xp-app__status-zone"><img src={asset('ie')} alt="" />{labels.internet}</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Lecteur Windows Media 9 : barre des tâches verticale, écran vidéo, commandes rondes.
// ----------------------------------------------------------------------------
// Paramètres : active est vrai quand la fenêtre se voit ; hors champ, la vidéo se met en
// pause et ne repart que sur une action de l'utilisateur.
export function XpPlayer({ app, labels, active }: { app: XpPlayerApp; labels: Labels; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Le double-clic sur le raccourci vaut geste utilisateur : la lecture démarre avec le son.
  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.volume = 0.8;
    void video.play().catch(() => setPlaying(false));
    return () => { video.pause(); };
  }, []);
  // Écran quitté ou fenêtre réduite : la vidéo s'arrête, son compris.
  useEffect(() => { if (!active) videoRef.current?.pause(); }, [active]);

  // Les commandes lisent la vidéo au moment du clic : au premier rendu, la référence est encore vide.
  const toggle = () => { const video = videoRef.current; if (video === null) return; if (video.paused) void video.play(); else video.pause(); };
  const stop = () => { const video = videoRef.current; if (video === null) return; video.pause(); video.currentTime = 0; };
  const tabs = [labels.nowPlaying, labels.mediaGuide, labels.rip, labels.library, labels.radio, labels.burn, labels.sync];
  return (
    <div className="xp-app xp-player">
      <nav className="xp-player__tabs" aria-hidden="true">
        {tabs.map((tab, index) => <span key={tab} className={index === 0 ? 'is-active' : undefined}>{tab}</span>)}
      </nav>
      <div className="xp-player__main">
        <div className="xp-player__info"><strong>{app.name}</strong><span>{formatTime(time)} / {formatTime(duration)}</span></div>
        <div className="xp-player__screen">
          <video ref={videoRef} src={app.video} poster={app.poster} playsInline preload="metadata" muted={muted}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
            onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onClick={toggle} onDoubleClick={() => { void videoRef.current?.requestFullscreen?.().catch(() => undefined); }} />
        </div>
        <div className="xp-player__controls">
          <input className="xp-player__seek" type="range" min={0} max={duration || 1} step={0.1} value={time} aria-label={labels.seek}
            onChange={(event) => { const video = videoRef.current; if (video !== null) video.currentTime = Number(event.currentTarget.value); }} />
          <div className="xp-player__buttons">
            <button type="button" className={`xp-player__play${playing ? ' is-playing' : ''}`} aria-label={playing ? labels.pause : labels.play} title={playing ? labels.pause : labels.play} onClick={toggle} />
            <button type="button" className="xp-player__small is-stop" aria-label={labels.stop} title={labels.stop} onClick={stop} />
            <button type="button" className="xp-player__small is-prev" aria-hidden="true" tabIndex={-1} disabled />
            <button type="button" className="xp-player__small is-next" aria-hidden="true" tabIndex={-1} disabled />
            <button type="button" className={`xp-player__small is-mute${muted ? ' is-on' : ''}`} aria-label={labels.mute} aria-pressed={muted} title={labels.mute} onClick={() => setMuted((m) => !m)} />
            <input className="xp-player__volume" type="range" min={0} max={1} step={0.05} value={volume} aria-label={labels.volume}
              onChange={(event) => { const v = Number(event.currentTarget.value); setVolume(v); const video = videoRef.current; if (video !== null) video.volume = v; }} />
            <button type="button" className="xp-player__small is-full" aria-label={labels.fullscreen} title={labels.fullscreen}
              onClick={() => { void videoRef.current?.requestFullscreen?.().catch(() => undefined); }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Durée en secondes au format « MM:SS » du Lecteur Windows Media ; 00:00 si inconnue.
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00';
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Emplacements de l'Explorateur.
export type XpPlace = 'computer' | 'documents' | 'recycle' | `folder:${string}`;

// ----------------------------------------------------------------------------
// Explorateur : volet de tâches bleu à gauche, icônes à droite, navigation avec historique.
// Paramètres : start est le premier emplacement ; onOpenApp lance un projet ; onTitle
// renomme la fenêtre selon l'emplacement courant.
// ----------------------------------------------------------------------------
export function XpExplorer({ start, catalog, labels, asset, onOpenApp, onTitle }: {
  start: XpPlace; catalog: XpCatalog; labels: Labels; asset: Asset; onOpenApp(id: string): void; onTitle(title: string, icon: string): void;
}) {
  const [history, setHistory] = useState<{ stack: XpPlace[]; index: number }>({ stack: [start], index: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const place = history.stack[history.index] ?? start;
  const go = (next: XpPlace) => {
    setSelected(null);
    setHistory(({ stack, index }) => ({ stack: [...stack.slice(0, index + 1), next], index: index + 1 }));
  };
  const move = (delta: number) => setHistory(({ stack, index }) => ({ stack, index: Math.max(0, Math.min(stack.length - 1, index + delta)) }));
  const folder = place.startsWith('folder:') ? catalog.folders.find((f) => `folder:${f.id}` === place) : undefined;
  const title = place === 'computer' ? labels.myComputer : place === 'documents' ? labels.myDocuments : place === 'recycle' ? labels.recycleBin : folder?.label ?? '';
  const icon = place === 'computer' ? asset('computerSmall') : place === 'documents' ? asset('documentsSmall') : place === 'recycle' ? asset('recycleSmall') : asset('folderSmall');
  const parent: XpPlace | null = place === 'documents' ? 'computer' : place.startsWith('folder:') ? 'documents' : null;
  useEffect(() => { onTitle(title, icon); }, [title, icon]);

  type Item = { id: string; label: string; image: string; poster?: boolean; open?: () => void };
  const groups: { title?: string; items: Item[] }[] = [];
  if (place === 'computer') {
    groups.push({ title: labels.storedFiles, items: [{ id: 'documents', label: labels.myDocuments, image: asset('folder'), open: () => go('documents') }] });
    groups.push({ title: labels.hardDisks, items: [{ id: 'c', label: labels.localDisk, image: asset('disk'), open: () => go('documents') }] });
    groups.push({ title: labels.removable, items: [{ id: 'd', label: labels.cdDrive, image: asset('cd') }] });
  } else if (place === 'documents') {
    groups.push({ items: catalog.folders.map((f) => ({ id: f.id, label: f.label, image: asset('folder'), open: () => go(`folder:${f.id}`) })) });
  } else if (folder !== undefined) {
    groups.push({ items: folder.appIds.flatMap((id) => {
      const app: XpApp | undefined = catalog.apps[id];
      return app === undefined ? [] : [{ id, label: app.name, image: app.icon, poster: true, open: () => onOpenApp(id) }];
    }) });
  }
  const count = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="xp-app xp-explorer">
      <MenuBar labels={labels} asset={asset} />
      <div className="xp-app__toolbar">
        <Tool icon={asset('back')} label={labels.back} title={labels.back} arrow disabled={history.index === 0} onClick={() => move(-1)} />
        <Tool icon={asset('forward')} title={labels.forward} arrow disabled={history.index >= history.stack.length - 1} onClick={() => move(1)} />
        <Tool icon={asset('up')} title={labels.up} small disabled={parent === null} onClick={parent === null ? undefined : () => go(parent)} />
        <span className="xp-app__separator" />
        <Tool icon={asset('searchLarge')} label={labels.search} title={labels.search} small disabled />
        <Tool icon={asset('folderSmall')} label={labels.folders} title={labels.folders} small disabled />
      </div>
      <div className="xp-app__address">
        <span className="xp-app__address-title">{labels.address}</span>
        <span className="xp-app__address-field"><img src={icon} alt="" /><span>{title}</span></span>
        <span className="xp-app__go is-static"><img src={asset('go')} alt="" />{labels.go}</span>
      </div>
      <div className="xp-explorer__content">
        <aside className="xp-explorer__tasks">
          <section className="xp-explorer__card">
            <h3>{place === 'computer' ? labels.systemTasks : labels.fileTasks}</h3>
            <ul>
              {(place === 'computer' ? [labels.viewSystemInfo, labels.addRemove] : [labels.makeFolder, labels.shareFolder]).map((task) => <li key={task}><span>{task}</span></li>)}
            </ul>
          </section>
          <section className="xp-explorer__card">
            <h3>{labels.otherPlaces}</h3>
            <ul>
              {place !== 'computer' && <li><button type="button" onClick={() => go('computer')}><img src={asset('computerSmall')} alt="" />{labels.myComputer}</button></li>}
              {place !== 'documents' && <li><button type="button" onClick={() => go('documents')}><img src={asset('documentsSmall')} alt="" />{labels.myDocuments}</button></li>}
              {place !== 'recycle' && <li><button type="button" onClick={() => go('recycle')}><img src={asset('recycleSmall')} alt="" />{labels.recycleBin}</button></li>}
            </ul>
          </section>
          <section className="xp-explorer__card">
            <h3>{labels.details}</h3>
            <p><strong>{title}</strong><br />{place === 'computer' || place === 'recycle' ? labels.systemFolder : labels.fileFolder}<br />{count} {labels.objects}</p>
          </section>
        </aside>
        <div className="xp-explorer__items" onPointerDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          {count === 0 && <p className="xp-explorer__empty">{labels.emptyFolder}</p>}
          {groups.map((group, index) => (
            <div key={group.title ?? index} className="xp-explorer__group">
              {group.title !== undefined && <h4>{group.title}</h4>}
              <div className={`xp-explorer__grid${group.title === undefined ? ' is-icons' : ''}`}>
                {group.items.map((item) => (
                  <button key={item.id} type="button" className="xp-explorer__item" aria-pressed={selected === item.id}
                    onClick={() => setSelected(item.id)} onDoubleClick={item.open} onKeyDown={(event) => { if (event.key === 'Enter') item.open?.(); }}>
                    <span className="xp-explorer__icon">
                      <img src={item.image} alt="" draggable={false} className={item.poster === true ? 'is-poster' : undefined} />
                      {item.poster === true && <img className="xp-explorer__arrow" src={svgUrl(SHORTCUT_SVG)} alt="" draggable={false} />}
                    </span>
                    <span className="xp-explorer__label">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
