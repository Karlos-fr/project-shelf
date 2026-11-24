// ============================================================================
// VirtualCube — Lance le Photon virtuel et relaie ses LED vers le cube 3D
// ----------------------------------------------------------------------------
// Crée le worker du firmware, lui rend l'EEPROM gardée dans localStorage (modes,
// réglages, bytecode installé par le studio) et transmet chaque image des LED.
// Une EEPROM sauvegardée illisible ou de mauvaise taille est effacée ; un worker en
// erreur éteint le cube.
// ============================================================================
import { EEPROM_SIZE, type PhotonSignal, type WorkerInit, type WorkerOut, type WorkerPause } from './virtual-cube-protocol.ts';

// Clé localStorage de l'EEPROM du Photon virtuel, en base64.
const EEPROM_KEY = 'project-shelf:l3d-eeprom';

export type VirtualCube = {
  // Met le firmware en pause (onglet masqué) ou le relance là où il en était.
  setPaused(paused: boolean): void;
  dispose(): void;
};

// ----------------------------------------------------------------------------
// emulatorUrl : module l3d-emulator.mjs servi sous /room/l3d/.
// onFrame : 512 LED en RGB, ordre (y, x, z), à chaque rafraîchissement du firmware.
// onSignal : signal de la LED d'état du Photon, à chaque étape du démarrage.
// ----------------------------------------------------------------------------
export function startVirtualCube(emulatorUrl: string, onFrame: (rgb: Uint8Array) => void, onSignal: (signal: PhotonSignal) => void): VirtualCube {
  const worker = new Worker(new URL('./virtual-cube-worker.ts', import.meta.url), { type: 'module', name: 'l3d-virtual-cube' });
  worker.onmessage = (event: MessageEvent<WorkerOut>) => {
    const message = event.data;
    if (message.kind === 'frame') onFrame(message.rgb);
    else if (message.kind === 'led') onSignal(message.signal);
    else if (message.kind === 'eeprom') {
      try { localStorage.setItem(EEPROM_KEY, toBase64(message.bytes)); } catch { /* stockage indisponible */ }
    }
  };
  // Worker introuvable ou message illisible : le cube reste éteint.
  worker.onerror = () => onSignal('off');
  worker.onmessageerror = () => onSignal('off');
  let eeprom: Uint8Array | null = null;
  try {
    const saved = localStorage.getItem(EEPROM_KEY);
    if (saved !== null) {
      eeprom = decodeEeprom(saved);
      if (eeprom === null) localStorage.removeItem(EEPROM_KEY);
    }
  } catch { eeprom = null; }
  const init: WorkerInit = { kind: 'init', emulatorUrl: new URL(emulatorUrl, location.href).href, eeprom };
  worker.postMessage(init);
  return {
    setPaused(paused) { const message: WorkerPause = { kind: 'pause', paused }; worker.postMessage(message); },
    dispose: () => worker.terminate(),
  };
}

// ----------------------------------------------------------------------------
// Lit une EEPROM sauvegardée en base64.
// Retour : les octets s'ils font exactement EEPROM_SIZE, sinon null (valeur corrompue,
// tronquée ou trop longue, qui écraserait le tas du WebAssembly).
// ----------------------------------------------------------------------------
export function decodeEeprom(text: string): Uint8Array | null {
  try {
    const bytes = fromBase64(text);
    return bytes.length === EEPROM_SIZE ? bytes : null;
  } catch {
    return null;
  }
}

// Encode des octets en base64 pour localStorage.
function toBase64(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

// Décode du base64 en octets. Erreurs : lève si le texte n'est pas du base64.
function fromBase64(text: string): Uint8Array {
  const raw = atob(text);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}
