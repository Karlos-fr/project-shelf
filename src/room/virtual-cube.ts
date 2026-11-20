// ============================================================================
// VirtualCube — Lance le Photon virtuel et relaie ses LED vers le cube 3D
// ----------------------------------------------------------------------------
// Crée le worker du firmware, lui rend l'EEPROM gardée dans localStorage (modes,
// réglages, bytecode installé par le studio) et transmet chaque image des LED.
// ============================================================================
import type { PhotonSignal, WorkerInit, WorkerOut } from './virtual-cube-worker.ts';

const EEPROM_KEY = 'project-shelf:l3d-eeprom';

export type VirtualCube = { dispose(): void };

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
  let eeprom: Uint8Array | null = null;
  try {
    const saved = localStorage.getItem(EEPROM_KEY);
    if (saved !== null) eeprom = fromBase64(saved);
  } catch { eeprom = null; }
  const init: WorkerInit = { kind: 'init', emulatorUrl: new URL(emulatorUrl, location.href).href, eeprom };
  worker.postMessage(init);
  return { dispose: () => worker.terminate() };
}

function toBase64(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function fromBase64(text: string): Uint8Array {
  const raw = atob(text);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}
