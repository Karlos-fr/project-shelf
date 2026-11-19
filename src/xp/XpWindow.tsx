// ============================================================================
// XpWindow — Cadre de fenêtre Windows XP (thème Luna)
// ----------------------------------------------------------------------------
// Barre de titre bleue, icône, titre et boutons Réduire, Agrandir/Restaurer, Fermer.
// La fenêtre se déplace en tirant sa barre de titre ; un double-clic l'agrandit.
// Les styles reprennent ceux du clone winXP de ShizukuIchi (licence MIT).
// ============================================================================
import type { PointerEvent, ReactNode } from 'react';

export type XpWindowFrame = { x: number; y: number; w: number; h: number; z: number; minimized: boolean; maximized: boolean };

export type XpWindowProps = {
  title: string;
  icon: string;
  frame: XpWindowFrame;
  focused: boolean;
  labels: { minimize: string; maximize: string; restore: string; close: string };
  // Hauteur disponible au-dessus de la barre des tâches, pour l'état agrandi.
  area: { width: number; height: number };
  onFocus(): void;
  onMinimize(): void;
  onToggleMaximize(): void;
  onClose(): void;
  // Début d'un déplacement : la page suit le pointeur et met la position à jour.
  onDragStart(event: PointerEvent<HTMLElement>): void;
  children: ReactNode;
};

// ----------------------------------------------------------------------------
// Rend une fenêtre positionnée sur le bureau, masquée quand elle est réduite.
// ----------------------------------------------------------------------------
export default function XpWindow(props: XpWindowProps) {
  const { title, icon, frame, focused, labels, area } = props;
  const box = frame.maximized ? { x: 0, y: 0, w: area.width, h: area.height } : frame;
  return (
    <section className={`xp-window${focused ? ' is-focused' : ''}${frame.maximized ? ' is-maximized' : ''}`} role="dialog" aria-label={title}
      hidden={frame.minimized} style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h, zIndex: 10 + frame.z }}
      onPointerDownCapture={props.onFocus}>
      <div className="xp-window__title-bg" aria-hidden="true" />
      <header className="xp-window__title" onPointerDown={(event) => { if (!(event.target as HTMLElement).closest('button')) props.onDragStart(event); }}
        onDoubleClick={(event) => { if (!(event.target as HTMLElement).closest('button')) props.onToggleMaximize(); }}>
        <img src={icon} alt="" draggable={false} />
        <span className="xp-window__caption">{title}</span>
        <span className="xp-window__buttons">
          <button type="button" className="xp-window__button is-minimize" aria-label={labels.minimize} title={labels.minimize} onClick={props.onMinimize} />
          <button type="button" className={`xp-window__button ${frame.maximized ? 'is-restore' : 'is-maximize'}`}
            aria-label={frame.maximized ? labels.restore : labels.maximize} title={frame.maximized ? labels.restore : labels.maximize} onClick={props.onToggleMaximize} />
          <button type="button" className="xp-window__button is-close" aria-label={labels.close} title={labels.close} onClick={props.onClose} />
        </span>
      </header>
      <div className="xp-window__body">{props.children}</div>
    </section>
  );
}
