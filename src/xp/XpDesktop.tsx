// ============================================================================
// XpDesktop — Bureau Windows XP affiché sur l'écran du PC de la chambre
// ----------------------------------------------------------------------------
// Interface HTML à la résolution d'époque (1024 x 768), mise à l'échelle par la page
// pour couvrir exactement la dalle du moniteur. Elle reprend le fond Bliss et les
// icônes d'origine de XP : une icône par projet, les icônes système, le menu Démarrer
// et une barre des tâches qui liste les fenêtres ouvertes. Un double-clic (ou Entrée)
// sur un projet ouvre sa démo dans Internet Explorer ou sa vidéo dans le Lecteur
// Windows Media, ou dans sa propre fenêtre pour un jeu de bureau comme le Démineur ;
// le Poste de travail et Mes documents s'ouvrent dans l'Explorateur.
// ============================================================================
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import type { Locale } from '../domain/locale.ts';
import type { XpCatalog } from './xp-apps.ts';
import { SHORTCUT_SVG, svgUrl, XP_HEIGHT, XP_LABELS, XP_TASKBAR, XP_USER, XP_WIDTH, xpAsset, type XpFile } from './xp-art.ts';
import XpWindow, { type XpWindowFrame } from './XpWindow.tsx';
import { XpBrowser, XpExplorer, XpGameWindow, XpPlayer, type XpPlace } from './XpPrograms.tsx';
import './xp-windows.css';

export type XpDesktopProps = {
  locale: Locale;
  catalog: XpCatalog;
  base: string;
  // Vrai quand on regarde l'écran : hors champ, les vidéos se mettent en pause et les pages
  // d'Internet Explorer sont suspendues (voir XpPrograms).
  active: boolean;
  // Menu Démarrer → Arrêter l'ordinateur.
  onTurnOff: () => void;
};

type Icon = { id: string; label: string; image: string; shortcut: boolean; open: () => void };
type Win = { id: string; appId?: string; place?: XpPlace; title: string; icon: string; frame: XpWindowFrame };

// Surface utile au-dessus de la barre des tâches.
const AREA = { width: XP_WIDTH, height: XP_HEIGHT - XP_TASKBAR };

// ----------------------------------------------------------------------------
// Rend le bureau. La taille est fixe ; le parent applique la mise à l'échelle.
// ----------------------------------------------------------------------------
export default function XpDesktop({ locale, catalog, base, active, onTurnOff }: XpDesktopProps) {
  const labels = XP_LABELS[locale];
  const rootRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [windows, setWindows] = useState<Win[]>([]);
  const [dragging, setDragging] = useState(false);
  const asset = (name: XpFile) => xpAsset(base, name);

  useEffect(() => {
    rootRef.current?.focus();
    const timer = window.setInterval(() => setClock(formatClock(new Date())), 15000);
    return () => window.clearInterval(timer);
  }, []);

  // --------------------------------------------------------------- fenêtres
  const topZ = () => windows.reduce((max, win) => Math.max(max, win.frame.z), 0);
  const focused = windows.filter((win) => !win.frame.minimized).sort((a, b) => b.frame.z - a.frame.z)[0]?.id ?? null;
  // Modifie le cadre d'une fenêtre ; sans écart réel, la liste reste la même (aucun rendu).
  const update = (id: string, change: (frame: XpWindowFrame) => Partial<XpWindowFrame>) =>
    setWindows((list) => {
      let changed = false;
      const next = list.map((win) => {
        if (win.id !== id) return win;
        const patch = change(win.frame);
        if (!(Object.keys(patch) as (keyof XpWindowFrame)[]).some((key) => patch[key] !== win.frame[key])) return win;
        changed = true;
        return { ...win, frame: { ...win.frame, ...patch } };
      });
      return changed ? next : list;
    });
  const focus = (id: string) => update(id, (frame) => (frame.z === topZ() && !frame.minimized ? {} : { z: topZ() + 1, minimized: false }));
  function open(win: Omit<Win, 'frame'>, size: { w: number; h: number }): void {
    setStartOpen(false);
    if (windows.some((existing) => existing.id === win.id)) { focus(win.id); return; }
    // Fenêtres en cascade, comme à l'époque.
    const step = (windows.length % 8) * 26;
    const frame: XpWindowFrame = {
      x: Math.min(AREA.width - size.w, 90 + step), y: Math.min(AREA.height - size.h, 24 + step),
      w: size.w, h: size.h, z: topZ() + 1, minimized: false, maximized: false,
    };
    setWindows((list) => [...list, { ...win, frame }]);
  }
  function openApp(appId: string): void {
    const app = catalog.apps[appId];
    if (app === undefined) return;
    if (app.kind === 'browser') open({ id: `app:${appId}`, appId, title: `${app.name} - ${labels.ieTitle}`, icon: asset('ie') }, { w: 900, h: 640 });
    // Fenêtre au format du plateau débutant du Démineur ; elle s'ajuste ensuite au jeu.
    else if (app.kind === 'window') open({ id: `app:${appId}`, appId, title: app.name, icon: app.icon }, { w: 170, h: 254 });
    else open({ id: `app:${appId}`, appId, title: `${app.name} - ${labels.player}`, icon: asset('playerSmall') }, { w: 680, h: 500 });
  }
  function openPlace(place: XpPlace): void {
    open({ id: `place:${place}`, place, title: '', icon: asset('folderSmall') }, { w: 740, h: 520 });
  }
  const close = (id: string) => setWindows((list) => list.filter((win) => win.id !== id));
  function toggleTask(id: string): void {
    const win = windows.find((w) => w.id === id);
    if (win === undefined) return;
    if (id === focused) update(id, () => ({ minimized: true }));
    else focus(id);
  }
  // Déplacement : le pointeur est suivi en pixels d'écran, ramenés à l'échelle du bureau.
  function dragStart(id: string, event: PointerEvent<HTMLElement>): void {
    const win = windows.find((w) => w.id === id);
    const root = rootRef.current;
    if (win === undefined || root === null || win.frame.maximized || event.button !== 0) return;
    const scale = root.getBoundingClientRect().width / XP_WIDTH;
    const startX = event.clientX; const startY = event.clientY;
    const { x, y, w } = win.frame;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setDragging(true);
    const move = (e: globalThis.PointerEvent) => update(id, () => ({
      x: Math.max(80 - w, Math.min(AREA.width - 80, x + (e.clientX - startX) / scale)),
      y: Math.max(0, Math.min(AREA.height - 26, y + (e.clientY - startY) / scale)),
    }));
    const end = () => {
      setDragging(false);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }
  const setTitle = (id: string, title: string, icon: string) =>
    setWindows((list) => list.map((win) => (win.id === id && (win.title !== title || win.icon !== icon) ? { ...win, title, icon } : win)));

  // --------------------------------------------------------------- icônes
  const system: Icon[] = [
    { id: 'computer', label: labels.myComputer, image: asset('computer'), shortcut: false, open: () => openPlace('computer') },
    { id: 'documents', label: labels.myDocuments, image: asset('documents'), shortcut: false, open: () => openPlace('documents') },
  ];
  const shortcuts: Icon[] = catalog.order.flatMap((id) => {
    const app = catalog.apps[id];
    return app === undefined ? [] : [{ id, label: app.name, image: app.icon, shortcut: true, open: () => openApp(id) }];
  });
  const recycle: Icon = { id: 'recycle', label: labels.recycleBin, image: asset('recycle'), shortcut: false, open: () => openPlace('recycle') };

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape' && startOpen) {
      setStartOpen(false);
      event.stopPropagation();
    }
  }
  function handleBackground(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) { setSelected(null); setStartOpen(false); }
  }

  const renderIcon = (icon: Icon) => (
    <button key={icon.id} type="button" className="xp-icon" aria-pressed={selected === icon.id}
      title={icon.shortcut ? `${labels.shortcut} ${icon.label}` : icon.label}
      onClick={() => { setSelected(icon.id); setStartOpen(false); }} onDoubleClick={icon.open}
      onKeyDown={(event) => { if (event.key === 'Enter') icon.open(); }}>
      <span className="xp-icon__image">
        <img src={icon.image} alt="" draggable={false} className={icon.shortcut ? 'is-poster' : undefined} />
        {icon.shortcut && <img className="xp-icon__arrow" src={svgUrl(SHORTCUT_SVG)} alt="" draggable={false} />}
      </span>
      <span className="xp-icon__label">{icon.label}</span>
    </button>
  );
  const place = (name: XpFile, label: string, strong = false, onClick?: () => void) => (
    <li><button type="button" role="menuitem" disabled={onClick === undefined} onClick={onClick}><img src={asset(name)} alt="" />{strong ? <strong>{label}</strong> : <span>{label}</span>}</button></li>
  );
  const windowLabels = { minimize: labels.minimize, maximize: labels.maximize, restore: labels.restore, close: labels.close };

  return (
    <div ref={rootRef} className={`xp${dragging ? ' is-dragging' : ''}`} style={{ width: XP_WIDTH, height: XP_HEIGHT, backgroundImage: `url(${asset('wallpaper')})` }}
      role="region" aria-label={labels.desktop} tabIndex={-1} onKeyDown={handleKeyDown} onPointerDown={handleBackground}>
      <div className="xp__icons" onPointerDown={handleBackground}>{[...system, ...shortcuts].map(renderIcon)}</div>
      <div className="xp__recycle">{renderIcon(recycle)}</div>
      {windows.map((win) => {
        const app = win.appId === undefined ? undefined : catalog.apps[win.appId];
        // Un programme ne tourne que s'il se voit : écran regardé et fenêtre non réduite.
        const live = active && !win.frame.minimized;
        return (
          <XpWindow key={win.id} title={win.title} icon={win.icon} frame={win.frame} focused={win.id === focused} labels={windowLabels} area={AREA}
            onFocus={() => focus(win.id)} onMinimize={() => update(win.id, () => ({ minimized: true }))}
            onToggleMaximize={() => update(win.id, (frame) => ({ maximized: !frame.maximized }))} onClose={() => close(win.id)}
            onDragStart={(event) => dragStart(win.id, event)}>
            {app?.kind === 'browser' && <XpBrowser app={app} labels={labels} asset={asset} active={live} />}
            {app?.kind === 'player' && <XpPlayer app={app} labels={labels} active={live} />}
            {app?.kind === 'window' && (
              <XpGameWindow app={app} active={live} onResize={(dw, dh) => update(win.id, (frame) => {
                const w = Math.min(AREA.width, frame.w + dw);
                const h = Math.min(AREA.height, frame.h + dh);
                return { w, h, x: Math.max(0, Math.min(frame.x, AREA.width - w)), y: Math.max(0, Math.min(frame.y, AREA.height - h)) };
              })} />
            )}
            {win.place !== undefined && (
              <XpExplorer start={win.place} catalog={catalog} labels={labels} asset={asset} onOpenApp={openApp}
                onTitle={(title, icon) => setTitle(win.id, title, icon)} />
            )}
          </XpWindow>
        );
      })}
      {startOpen && (
        <div className="xp-start-menu" role="menu" aria-label={labels.start}>
          <div className="xp-start-menu__user">
            <img src={asset('user')} alt="" />
            <strong>{XP_USER}</strong>
          </div>
          <div className="xp-start-menu__body">
            <ul className="xp-start-menu__programs">
              {shortcuts.slice(0, 7).flatMap((icon, index) => [
                ...(index === 2 ? [<li key="pinned-rule" className="xp-start-menu__rule" aria-hidden="true" />] : []),
                <li key={icon.id}>
                  <button type="button" role="menuitem" onClick={icon.open}>
                    <img src={icon.image} alt="" className="is-poster" />
                    <span>{icon.label}</span>
                  </button>
                </li>,
              ])}
              <li className="xp-start-menu__rule xp-start-menu__all-rule" aria-hidden="true" />
              <li className="xp-start-menu__all"><button type="button" role="menuitem" onClick={() => openPlace('documents')}><span>{labels.allPrograms}</span><img src={asset('allPrograms')} alt="" /></button></li>
            </ul>
            <ul className="xp-start-menu__places">
              {place('documents', labels.myDocuments, true, () => openPlace('documents'))}
              {place('pictures', labels.myPictures, true)}
              {place('music', labels.myMusic, true)}
              {place('computer', labels.myComputer, true, () => openPlace('computer'))}
              <li className="xp-start-menu__rule" aria-hidden="true" />
              {place('controlPanel', labels.controlPanel)}
              <li className="xp-start-menu__rule" aria-hidden="true" />
              {place('help', labels.help)}
              {place('search', labels.search)}
              {place('run', labels.run)}
            </ul>
          </div>
          <div className="xp-start-menu__footer">
            <button type="button" role="menuitem" disabled><img src={asset('logOff')} alt="" />{labels.logOff}</button>
            <button type="button" role="menuitem" onClick={() => { setStartOpen(false); onTurnOff(); }}><img src={asset('turnOff')} alt="" />{labels.turnOff}</button>
          </div>
        </div>
      )}
      <div className="xp-taskbar">
        <button type="button" className="xp-start" aria-haspopup="menu" aria-expanded={startOpen}
          onClick={() => setStartOpen((isOpen) => !isOpen)}>
          <img src={asset('flag')} alt="" draggable={false} />
          <span>{labels.start}</span>
        </button>
        <div className="xp-taskbar__tasks">
          {windows.map((win) => (
            <button key={win.id} type="button" className={`xp-task${win.id === focused ? ' is-focused' : ''}`} title={win.title} onClick={() => toggleTask(win.id)}>
              <img src={win.icon} alt="" draggable={false} />
              <span>{win.title}</span>
            </button>
          ))}
        </div>
        <div className="xp-tray"><time>{clock}</time></div>
      </div>
    </div>
  );
}

function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
