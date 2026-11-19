// ============================================================================
// XpPower — Écrans d'allumage et d'extinction du PC de la chambre
// ----------------------------------------------------------------------------
// POST d'un BIOS Award v4.51PG (test mémoire qui compte, détection IDE, erreur CMOS),
// écran de démarrage de Windows XP avec sa barre de progression, écran d'accueil et
// écran « Windows s'arrête… ». Chaque écran occupe la résolution du bureau (1024 x 768)
// ; la page choisit lequel afficher et quand passer au suivant.
// ============================================================================
import { useEffect, useState } from 'react';
import type { XP_LABELS } from './xp-art.ts';

type Labels = (typeof XP_LABELS)['fr'] | (typeof XP_LABELS)['en'];

// Mémoire testée au démarrage, en kilo-octets (384 Mo).
const MEMORY_KB = 393216;

// ----------------------------------------------------------------------------
// Écran POST Award v4.51PG : en-tête, carte mère, processeur, test mémoire qui compte,
// détection IDE, puis erreurs disquette et CMOS ; il s'arrête sur « Press F1 to
// continue » (done passe à vrai) et la page attend F1 ou un clic.
// Le décompte part du moment où l'écran apparaît.
// ----------------------------------------------------------------------------
export function AwardBios({ onReady }: { onReady?: () => void }) {
  const [startedAt] = useState(() => performance.now());
  const elapsed = useElapsed(startedAt);
  const memory = Math.min(MEMORY_KB, Math.floor(Math.max(0, elapsed - 600) / 2200 * MEMORY_KB / 1024) * 1024);
  const memoryDone = memory >= MEMORY_KB;
  // Détection IDE ligne après ligne, puis les deux erreurs, puis l'invite F1.
  const ide = [
    '  Detecting IDE Primary Master  ... 86B_CD00',
    '  Detecting IDE Primary Slave   ... None',
    '  Detecting IDE Secondary Master... None',
    '  Detecting IDE Secondary Slave ... None',
  ];
  const after = elapsed - 3200;
  const shownIde = memoryDone ? Math.max(0, Math.min(ide.length, Math.floor(after / 500) + 1)) : 0;
  const errors = memoryDone && after > ide.length * 500 + 400;
  const halted = errors && after > ide.length * 500 + 1100;
  useEffect(() => { if (halted) onReady?.(); }, [halted]);
  const lines = [
    '  Award Modular BIOS v4.51PG, An Energy Star Ally',
    '  Copyright (C) 1984-98, Award Software, Inc.',
    '',
    'W6168MS V1.3 111700',
    '',
    'PENTIUM III-MMX CPU at 500 MHz          , Host Bus 100MHz',
    `Memory Test :  ${String(memory).padStart(6, ' ')}K${memoryDone ? ' OK' : ''}`,
    '',
    ...(memoryDone ? ['Award Plug and Play BIOS Extension v1.0A', 'Copyright (C) 1998, Award Software, Inc.', ...ide.slice(0, shownIde)] : []),
    ...(errors ? ['', 'Floppy disk(s) fail (40)', 'CMOS checksum error - Defaults loaded'] : []),
  ];
  return (
    <div className="xp-power xp-bios" aria-live="off">
      <svg className="xp-bios__award" viewBox="0 0 20 24" aria-hidden="true">
        <circle cx="10" cy="5" r="4.2" fill="#2f5bd8" />
        <path d="M3 21c0-6 3-10 7-10s7 4 7 10l-3 2-4-4-4 4z" fill="#2f5bd8" />
      </svg>
      <svg className="xp-bios__energy" viewBox="0 0 200 90" aria-hidden="true">
        <path d="M150 6l6 17h18l-14 11 5 18-15-11-15 11 5-18-14-11h18z" fill="none" stroke="#e6e300" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M8 50c20-34 112-40 150-16" fill="none" stroke="#e6e300" strokeWidth="2.2" />
        <text x="16" y="60" fill="none" stroke="#e6e300" strokeWidth="1.6" fontFamily="'Brush Script MT', 'Segoe Script', cursive" fontStyle="italic" fontSize="44">energy</text>
        <text x="12" y="84" fill="#3fae3f" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="12.5" letterSpacing="0.4">EPA POLLUTION PREVENTER</text>
      </svg>
      <pre className="xp-bios__text">{lines.join('\n')}</pre>
      <pre className="xp-bios__footer">
        {halted ? <>Press <b>F1</b> to continue, <b>DEL</b> to enter SETUP</> : <>Press <b>DEL</b> to enter SETUP</>}
        {'\n11/17/2000-i440ZX-W977-2A69KM4NC-00'}
      </pre>
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
