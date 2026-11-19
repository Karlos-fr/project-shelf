// ============================================================================
// XpPower — Écrans d'allumage et d'extinction du PC de la chambre
// ----------------------------------------------------------------------------
// POST d'un BIOS Award de 1999 (test mémoire qui compte, détection des disques IDE),
// écran de démarrage de Windows XP avec sa barre de progression, écran d'accueil et
// écran « Windows s'arrête… ». Chaque écran occupe la résolution du bureau (1024 x 768)
// ; la page choisit lequel afficher et quand passer au suivant.
// ============================================================================
import { useEffect, useState } from 'react';
import type { XP_LABELS } from './xp-art.ts';

type Labels = (typeof XP_LABELS)['fr'] | (typeof XP_LABELS)['en'];

// Mémoire testée au démarrage, en kilo-octets (128 Mo).
const MEMORY_KB = 131072;

// ----------------------------------------------------------------------------
// Écran POST Award : en-tête, processeur, test mémoire animé, puis détection IDE.
// Le décompte part du moment où l'écran apparaît.
// ----------------------------------------------------------------------------
export function AwardBios() {
  const [startedAt] = useState(() => performance.now());
  const elapsed = useElapsed(startedAt);
  const memory = Math.min(MEMORY_KB, Math.floor(Math.max(0, elapsed - 700) / 1800 * MEMORY_KB / 1024) * 1024);
  const memoryDone = memory >= MEMORY_KB;
  // Lignes de détection IDE, l'une après l'autre une fois la mémoire testée.
  const ide: [string, string][] = [
    ['Primary Master  ', 'QUANTUM FIREBALL CR13.0A'],
    ['Primary Slave   ', 'None'],
    ['Secondary Master', 'ATAPI CD-ROM 48X'],
    ['Secondary Slave ', 'None'],
  ];
  const ideStart = 2900;
  const shownIde = memoryDone ? Math.max(0, Math.min(ide.length, Math.floor((elapsed - ideStart) / 450) + 1)) : 0;
  return (
    <div className="xp-power xp-bios" aria-live="off">
      <div className="xp-bios__energy" aria-hidden="true"><span>energy</span><b>★</b></div>
      <div className="xp-bios__award" aria-hidden="true"><i /></div>
      <pre className="xp-bios__text">{[
        '     Award Modular BIOS v4.51PG, An Energy Star Ally',
        '     Copyright (C) 1984-99, Award Software, Inc.',
        '',
        'P2B-F Intel 440BX AGPset ACPI BIOS Revision 1009',
        '',
        'Intel Pentium III 500MHz Processor',
        `Memory Test :  ${String(memory).padStart(6, ' ')}K${memoryDone ? ' OK' : ''}`,
        '',
        ...(memoryDone ? [
          'Award Plug and Play BIOS Extension  v1.0A',
          'Copyright (C) 1999, Award Software, Inc.',
          ...ide.slice(0, shownIde).map(([port, drive]) => `   Detecting IDE ${port} ... ${drive}`),
        ] : []),
      ].join('\n')}</pre>
      <pre className="xp-bios__footer">{'Press DEL to enter SETUP\n08/12/1999-i440BX-W977-2A69KA4AC-00'}</pre>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Démarrage de Windows XP : logo au centre et trois blocs bleus qui défilent.
// ----------------------------------------------------------------------------
export function XpBoot({ logo }: { logo: string }) {
  return (
    <div className="xp-power xp-boot">
      <div className="xp-boot__logo">
        <img src={logo} alt="" draggable={false} />
        <span className="xp-boot__brand"><small>Microsoft<sup>®</sup></small><strong>Windows</strong><em>xp</em></span>
      </div>
      <div className="xp-boot__bar" role="progressbar" aria-label="Windows XP"><span /></div>
      <footer className="xp-boot__footer"><span>Copyright © Microsoft Corporation</span><strong>Microsoft<sup>®</sup></strong></footer>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Écran bleu à bandeaux de l'accueil et de l'arrêt : « Bienvenue » ou « Windows s'arrête… ».
// ----------------------------------------------------------------------------
export function XpSplash({ logo, labels, mode }: { logo: string; labels: Labels; mode: 'welcome' | 'shutdown' }) {
  return (
    <div className={`xp-power xp-splash is-${mode}`}>
      <div className="xp-splash__band" />
      <div className="xp-splash__middle">
        {mode === 'welcome' ? (
          <span className="xp-splash__welcome">{labels.welcome}</span>
        ) : (
          <div className="xp-splash__shutdown">
            <span className="xp-boot__logo is-small">
              <img src={logo} alt="" draggable={false} />
              <span className="xp-boot__brand"><small>Microsoft<sup>®</sup></small><strong>Windows</strong><em>xp</em></span>
            </span>
            <span>{labels.shuttingDown}</span>
          </div>
        )}
      </div>
      <div className="xp-splash__band is-bottom" />
    </div>
  );
}

// Temps écoulé depuis startedAt, rafraîchi à chaque image tant que l'écran est monté.
function useElapsed(startedAt: number): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    let frame = 0;
    const tick = () => { setNow(performance.now()); frame = window.requestAnimationFrame(tick); };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return now - startedAt;
}
