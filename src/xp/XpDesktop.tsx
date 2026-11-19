// ============================================================================
// XpDesktop — Bureau Windows XP affiché sur l'écran du PC de la chambre
// ----------------------------------------------------------------------------
// Interface HTML à la résolution d'époque (1024 x 768), mise à l'échelle par la page
// pour couvrir exactement la dalle du moniteur. Elle reprend le fond Bliss et les
// icônes d'origine de XP : une icône par projet, les icônes système, la barre des
// tâches avec son horloge et le menu Démarrer. Un double-clic (ou Entrée) sur un
// projet ouvre sa fiche dans un nouvel onglet.
// ============================================================================
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { Locale } from '../domain/locale.ts';
import type { ProjectSummary } from '../domain/project.ts';
import { assetUrl, formatRoute, type RouteState } from '../domain/routes.ts';
import { SHORTCUT_SVG, svgUrl, XP_HEIGHT, XP_LABELS, XP_USER, XP_WIDTH, xpAsset } from './xp-art.ts';

export type XpDesktopProps = {
  locale: Locale;
  projects: readonly ProjectSummary[];
  base: string;
  // Menu Démarrer → Arrêter l'ordinateur.
  onTurnOff: () => void;
};

type Icon = { id: string; label: string; image: string; shortcut: boolean; href?: string };

// ----------------------------------------------------------------------------
// Rend le bureau. La taille est fixe ; le parent applique la mise à l'échelle.
// ----------------------------------------------------------------------------
export default function XpDesktop({ locale, projects, base, onTurnOff }: XpDesktopProps) {
  const labels = XP_LABELS[locale];
  const rootRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const route: RouteState = { locale, projectId: null, categories: [], sort: 'updated', q: '' };
  const asset = (name: Parameters<typeof xpAsset>[1]) => xpAsset(base, name);

  useEffect(() => {
    rootRef.current?.focus();
    const timer = window.setInterval(() => setClock(formatClock(new Date())), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const system: Icon[] = [
    { id: 'computer', label: labels.myComputer, image: asset('computer'), shortcut: false },
    { id: 'documents', label: labels.myDocuments, image: asset('documents'), shortcut: false },
  ];
  const shortcuts: Icon[] = projects.map((project) => ({
    id: project.id, label: project.name, image: assetUrl(project.preview.poster, base), shortcut: true,
    href: formatRoute({ ...route, projectId: project.id }, base),
  }));
  const recycle: Icon = { id: 'recycle', label: labels.recycleBin, image: asset('recycle'), shortcut: false };

  function open(icon: Icon): void {
    setStartOpen(false);
    if (icon.href !== undefined) window.open(icon.href, '_blank', 'noopener');
  }
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
      onClick={() => { setSelected(icon.id); setStartOpen(false); }} onDoubleClick={() => open(icon)}
      onKeyDown={(event) => { if (event.key === 'Enter') open(icon); }}>
      <span className="xp-icon__image">
        <img src={icon.image} alt="" draggable={false} className={icon.shortcut ? 'is-poster' : undefined} />
        {icon.shortcut && <img className="xp-icon__arrow" src={svgUrl(SHORTCUT_SVG)} alt="" draggable={false} />}
      </span>
      <span className="xp-icon__label">{icon.label}</span>
    </button>
  );
  const place = (name: Parameters<typeof xpAsset>[1], label: string, strong = false) => (
    <li><button type="button" role="menuitem" disabled><img src={asset(name)} alt="" />{strong ? <strong>{label}</strong> : <span>{label}</span>}</button></li>
  );

  return (
    <div ref={rootRef} className="xp" style={{ width: XP_WIDTH, height: XP_HEIGHT, backgroundImage: `url(${asset('wallpaper')})` }}
      role="region" aria-label={labels.desktop} tabIndex={-1} onKeyDown={handleKeyDown} onPointerDown={handleBackground}>
      <div className="xp__icons" onPointerDown={handleBackground}>{[...system, ...shortcuts].map(renderIcon)}</div>
      <div className="xp__recycle">{renderIcon(recycle)}</div>
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
                  <button type="button" role="menuitem" onClick={() => open(icon)}>
                    <img src={icon.image} alt="" className="is-poster" />
                    <span>{icon.label}</span>
                  </button>
                </li>,
              ])}
              <li className="xp-start-menu__rule xp-start-menu__all-rule" aria-hidden="true" />
              <li className="xp-start-menu__all"><button type="button" role="menuitem" disabled><span>{labels.allPrograms}</span><img src={asset('allPrograms')} alt="" /></button></li>
            </ul>
            <ul className="xp-start-menu__places">
              {place('documents', labels.myDocuments, true)}
              {place('pictures', labels.myPictures, true)}
              {place('music', labels.myMusic, true)}
              {place('computer', labels.myComputer, true)}
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
          onClick={() => setStartOpen((open) => !open)}>
          <img src={asset('flag')} alt="" draggable={false} />
          <span>{labels.start}</span>
        </button>
        <div className="xp-taskbar__tasks" />
        <div className="xp-tray"><time>{clock}</time></div>
      </div>
    </div>
  );
}

function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
