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
// Durée de l'écran du BIOS de la carte graphique, avant celui de la carte mère.
const VGA_MS = 1600;
// Détection IDE : délai avant la réponse de chaque canal ; un canal vide attend son délai d'expiration.
const IDE: readonly [string, string, number][] = [
  ['  Detecting IDE Primary Master  ...', ' 86B_CD00', 700],
  ['  Detecting IDE Primary Slave   ...', ' None', 1500],
  ['  Detecting IDE Secondary Master...', ' None', 1300],
  ['  Detecting IDE Secondary Slave ...', ' None', 1500],
];

// ----------------------------------------------------------------------------
// Démarrage animé : BIOS vidéo, puis POST Award v4.51PG ligne par ligne (carte mère,
// processeur, test mémoire qui compte, détection IDE avec attentes, erreurs disquette
// et CMOS), bip du haut-parleur, curseur clignotant, et arrêt sur « Press F1 to
// continue » : onReady est appelé à ce moment, la page attend alors F1 ou un clic.
// ----------------------------------------------------------------------------
export function AwardBios({ onReady }: { onReady?: () => void }) {
  const [startedAt] = useState(() => performance.now());
  const elapsed = useElapsed(startedAt);
  const t = elapsed - VGA_MS;
  // Bip court du haut-parleur quand le POST de la carte mère commence.
  useEffect(() => {
    const timer = window.setTimeout(beep, VGA_MS + 150);
    return () => window.clearTimeout(timer);
  }, []);

  // Calendrier du POST, en millisecondes après la fin de l'écran vidéo.
  const memStart = 1000;
  const memEnd = 3200;
  const pnpAt = 3900;
  let cursor = 4300;
  const ide = IDE.map(([label, answer, wait]) => {
    const shown = cursor; const answered = cursor + wait;
    cursor = answered + 180;
    return { label, answer, shown, answered };
  });
  const floppyAt = cursor + 700;
  const cmosAt = floppyAt + 450;
  const haltAt = cmosAt + 350;
  const halted = t >= haltAt;
  useEffect(() => { if (halted) onReady?.(); }, [halted]);
  const blink = Math.floor(elapsed / 480) % 2 === 0;

  if (t < 0) {
    // Écran du BIOS de la carte graphique, comme sur tous les PC de l'époque.
    return (
      <div className="xp-power xp-bios" aria-live="off">
        <pre className="xp-bios__text">{[
          'RIVA TNT2 Model 64/Model 64 Pro VGA BIOS',
          'Version 2.05.13.05.02',
          'Copyright (C) 1996-1999 NVIDIA Corp.',
          '32.0 MB RAM',
          '',
          blink ? '_' : ' ',
        ].join('\n')}</pre>
      </div>
    );
  }
  const memory = Math.min(MEMORY_KB, Math.max(0, Math.floor((t - memStart) / (memEnd - memStart) * MEMORY_KB / 1024)) * 1024);
  const lines: string[] = [
    '  Award Modular BIOS v4.51PG, An Energy Star Ally',
    '  Copyright (C) 1984-98, Award Software, Inc.',
    '',
  ];
  if (t >= 350) lines.push('W6168MS V1.3 111700', '');
  if (t >= 700) lines.push('PENTIUM III-MMX CPU at 500 MHz          , Host Bus 100MHz');
  if (t >= memStart) lines.push(`Memory Test :  ${String(memory).padStart(6, ' ')}K${t >= memEnd + 200 ? ' OK' : ''}`, '');
  if (t >= pnpAt) lines.push('Award Plug and Play BIOS Extension v1.0A', 'Copyright (C) 1998, Award Software, Inc.');
  for (const line of ide) if (t >= line.shown) lines.push(line.label + (t >= line.answered ? line.answer : ''));
  if (t >= floppyAt) lines.push('', 'Floppy disk(s) fail (40)');
  if (t >= cmosAt) lines.push('CMOS checksum error - Defaults loaded');
  // Le curseur clignote au bout de la dernière ligne écrite.
  const text = lines.join('\n') + (blink ? '_' : ' ');
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
      <pre className="xp-bios__text">{text}</pre>
      <pre className="xp-bios__footer">
        {halted ? <>Press <b>F1</b> to continue, <b>DEL</b> to enter SETUP</> : <>Press <b>DEL</b> to enter SETUP</>}
        {'\n11/17/2000-i440ZX-W977-2A69KM4NC-00'}
      </pre>
    </div>
  );
}

// Bip du haut-parleur du PC : onde carrée courte, volume modéré. Silencieux si l'audio est bloqué.
function beep(): void {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass === undefined) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.16);
    oscillator.onended = () => { void context.close(); };
  } catch {
    // Pas de son : le démarrage continue en silence.
  }
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
