// ============================================================================
// VirtualCubeWorker — Photon virtuel du cube L3D, hors du fil de rendu
// ----------------------------------------------------------------------------
// Fait tourner le vrai firmware du cube, compilé en WebAssembly dans le dépôt
// l3d-studio (firmware/emulator), et le relie au studio par le BroadcastChannel
// « l3d-virtual-cube » : le studio y poste ses requêtes HTTP, le worker les passe
// à la prise TCP virtuelle du firmware et renvoie la réponse. Le firmware ne
// démarre qu'à la première requête : jusque-là le cube reste éteint et ne coûte
// rien. Les couleurs des LED partent vers la page dans l'ordre (y, x, z), en RGB.
// Un firmware introuvable éteint le cube et répond une erreur au studio ; la requête
// suivante retente le démarrage.
// ============================================================================
import { EEPROM_SIZE, type PhotonSignal, type WorkerInit, type WorkerOut } from './virtual-cube-protocol.ts';

// Nom du canal partagé avec le studio, même origine karlos-fr.github.io.
const CHANNEL = 'l3d-virtual-cube';
// Arête du cube, en LED.
const N = 8;
// Cadence maximale des images envoyées à la scène.
const FRAME_MS = 33;

type Emulator = {
  HEAPU8: Uint8Array;
  cwrap(name: string, ret: null, args: [], options: { async: true }): () => Promise<void>;
  _emu_pixels(): number;
  _emu_show_count(): number;
  _emu_pixel_order_grb(): number;
  _emu_voxel_index(x: number, y: number, z: number): number;
  _emu_request_buffer(): number;
  _emu_request_submit(length: number): number;
  _emu_response_ready(): number;
  _emu_response_buffer(): number;
  _emu_response_length(): number;
  _emu_response_consume(): void;
  _emu_eeprom(): number;
  _emu_eeprom_take_dirty(): number;
  _emu_reset_requested(): number;
};
type StudioRequest = { kind: 'l3d-request'; id: string; method: string; path: string; contentType: string | null; body: ArrayBuffer | null };
type Pending = { request: StudioRequest; reply: (message: unknown) => void };

// Démarrage du vrai cube (Device OS en mode AUTOMATIC, sans fil système) : setup()
// ne s'exécute qu'une fois connecté au cloud. Le Photon virtuel rejoue la même
// séquence de la LED d'état ; seules ces durées de connexion sont choisies ici.
const BOOT_SEQUENCE: [PhotonSignal, number][] = [
  ['power-on', 300],
  ['network-connecting', 1600],
  ['cloud-connecting', 1000],
  ['cloud-handshake', 500],
];

const scope = self as unknown as { postMessage(message: WorkerOut, transfer?: Transferable[]): void; onmessage: ((event: MessageEvent<WorkerInit>) => void) | null };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let emulatorUrl = '';
let eeprom: Uint8Array | null = null;
let booting: Promise<Emulator> | null = null;
const queue: Pending[] = [];
let serving = false;
// Change à chaque démarrage et à chaque redémarrage : les boucles et les échanges d'une
// instance remplacée s'arrêtent.
let generation = 0;

// ----------------------------------------------------------------------------
// Démarre le firmware : EEPROM restaurée, setup(), puis loop() en continu.
// La boucle rend la main au moins toutes les 8 ms, comme Device OS entre deux loop().
// ----------------------------------------------------------------------------
async function boot(): Promise<Emulator> {
  const run = ++generation;
  const loading = (async () => {
    const module = await import(/* @vite-ignore */ emulatorUrl) as { default: () => Promise<Emulator> };
    return module.default();
  })();
  for (const [signal, ms] of BOOT_SEQUENCE) {
    scope.postMessage({ kind: 'led', signal });
    await sleep(ms);
  }
  const emulator = await loading;
  // Une EEPROM d'une autre taille écraserait le tas du WebAssembly : elle est ignorée.
  if (eeprom !== null && eeprom.length === EEPROM_SIZE) emulator.HEAPU8.set(eeprom, emulator._emu_eeprom());
  const setup = emulator.cwrap('emu_setup', null, [], { async: true });
  const tick = emulator.cwrap('emu_tick', null, [], { async: true });
  scope.postMessage({ kind: 'led', signal: 'cloud-connected' });
  await setup();
  scope.postMessage({ kind: 'status', running: true });
  void (async () => {
    let lastYield = performance.now();
    while (run === generation) {
      await tick();
      if (performance.now() - lastYield > 8) { await sleep(0); lastYield = performance.now(); }
      if (emulator._emu_reset_requested()) { restart(); return; }
    }
  })();
  void pump(emulator, run);
  return emulator;
}

// ----------------------------------------------------------------------------
// System.reset() : on repart d'une instance neuve, EEPROM conservée. La génération
// change tout de suite : l'échange en cours avec l'ancienne instance échoue aussitôt,
// et la boucle de service passe à la nouvelle instance sans être doublée.
// ----------------------------------------------------------------------------
function restart(): void {
  generation += 1;
  booting = null;
  scope.postMessage({ kind: 'led', signal: 'off' });
  void sleep(150).then(() => ensure()).then(() => serve(), () => undefined);
}

// ----------------------------------------------------------------------------
// Instance du firmware en marche, démarrée au besoin.
// Erreurs : si le module ne se charge pas, le cube s'éteint, la promesse rejette et la
// demande suivante retente le démarrage.
// ----------------------------------------------------------------------------
function ensure(): Promise<Emulator> {
  booting ??= boot().catch((error: unknown) => {
    booting = null;
    scope.postMessage({ kind: 'led', signal: 'off' });
    throw error;
  });
  return booting;
}

// ----------------------------------------------------------------------------
// Envoie les LED à la scène quand le firmware a rafraîchi la bande, et l'EEPROM
// à la page quand le firmware l'a modifiée.
// ----------------------------------------------------------------------------
async function pump(emulator: Emulator, run: number): Promise<void> {
  const index = new Int32Array(N * N * N);
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) for (let z = 0; z < N; z += 1) {
    index[(y * N + x) * N + z] = emulator._emu_voxel_index(x, y, z);
  }
  const grb = emulator._emu_pixel_order_grb() === 1;
  let lastShow = -1;
  while (run === generation) {
    const shows = emulator._emu_show_count();
    if (shows !== lastShow) {
      lastShow = shows;
      const base = emulator._emu_pixels();
      const heap = emulator.HEAPU8;
      const rgb = new Uint8Array(N * N * N * 3);
      for (let i = 0; i < index.length; i += 1) {
        const p = base + index[i]! * 3;
        rgb[i * 3] = grb ? heap[p + 1]! : heap[p]!;
        rgb[i * 3 + 1] = grb ? heap[p]! : heap[p + 1]!;
        rgb[i * 3 + 2] = heap[p + 2]!;
      }
      scope.postMessage({ kind: 'frame', rgb }, [rgb.buffer]);
    }
    if (emulator._emu_eeprom_take_dirty()) {
      const pointer = emulator._emu_eeprom();
      eeprom = emulator.HEAPU8.slice(pointer, pointer + EEPROM_SIZE);
      scope.postMessage({ kind: 'eeprom', bytes: eeprom.slice() });
    }
    await sleep(FRAME_MS);
  }
}

// ----------------------------------------------------------------------------
// Sert la file des requêtes une par une : la prise virtuelle n'a qu'un client. Chaque
// requête prend l'instance courante, qui a pu changer après un System.reset().
// Erreurs : firmware introuvable, toutes les requêtes en attente reçoivent une erreur.
// ----------------------------------------------------------------------------
async function serve(): Promise<void> {
  if (serving) return;
  serving = true;
  try {
    while (queue.length > 0) {
      const emulator = await ensure();
      const run = generation;
      const { request, reply } = queue.shift()!;
      reply(await transact(emulator, request, run));
    }
  } catch {
    for (const { request, reply } of queue.splice(0)) reply(failure(request.id, 'firmware indisponible'));
  } finally {
    serving = false;
  }
}

// ----------------------------------------------------------------------------
// Passe une requête HTTP du studio à la prise virtuelle et attend la réponse.
// Paramètres : run est la génération de l'instance ; si elle change (redémarrage),
// l'échange échoue aussitôt au lieu d'attendre une réponse qui ne viendra pas.
// Retour : réponse découpée, ou erreur (prise occupée, pas de réponse, redémarrage).
// ----------------------------------------------------------------------------
async function transact(emulator: Emulator, request: StudioRequest, run: number): Promise<unknown> {
  const body = request.body === null ? new Uint8Array(0) : new Uint8Array(request.body);
  const head = `${request.method} ${request.path} HTTP/1.1\r\nHost: cube-virtuel\r\n`
    + (request.method === 'POST' ? `Content-Type: ${request.contentType ?? 'text/plain'}\r\nContent-Length: ${body.length}\r\n` : '')
    + 'Connection: close\r\n\r\n';
  const headBytes = new TextEncoder().encode(head);
  const raw = new Uint8Array(headBytes.length + body.length);
  raw.set(headBytes);
  raw.set(body, headBytes.length);
  emulator.HEAPU8.set(raw, emulator._emu_request_buffer());
  const started = performance.now();
  while (!emulator._emu_request_submit(raw.length)) {
    if (run !== generation) return failure(request.id, 'cube redémarré');
    if (performance.now() - started > 4000) return failure(request.id, 'prise occupée');
    await sleep(2);
  }
  while (!emulator._emu_response_ready()) {
    if (run !== generation) return failure(request.id, 'cube redémarré');
    if (performance.now() - started > 4500) return failure(request.id, 'pas de réponse');
    await sleep(2);
  }
  const pointer = emulator._emu_response_buffer();
  const bytes = emulator.HEAPU8.slice(pointer, pointer + emulator._emu_response_length());
  emulator._emu_response_consume();
  return parseResponse(request.id, bytes);
}

// Découpe la réponse HTTP brute en statut, en-têtes et corps binaire.
function parseResponse(id: string, bytes: Uint8Array): unknown {
  let split = -1;
  for (let i = 0; i + 3 < bytes.length; i += 1) {
    if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) { split = i; break; }
  }
  if (split < 0) return failure(id, 'réponse HTTP illisible');
  const [statusLine = '', ...lines] = new TextDecoder().decode(bytes.subarray(0, split)).split('\r\n');
  const status = Number.parseInt(statusLine.split(' ')[1] ?? '', 10);
  const headers = lines.map((line) => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()] as [string, string];
  }).filter(([name]) => name.length > 0);
  const body = bytes.slice(split + 4).buffer;
  return { kind: 'l3d-response', id, status: Number.isFinite(status) ? status : 502, headers, body };
}

// Réponse d'erreur au studio pour la requête id.
function failure(id: string, message: string): unknown {
  return { kind: 'l3d-response', id, error: message };
}

// ----------------------------------------------------------------------------
// Canal du studio : « l3d-hello » sert à savoir qu'une chambre écoute.
// ----------------------------------------------------------------------------
const channel = new BroadcastChannel(CHANNEL);
channel.onmessage = (event: MessageEvent<{ kind?: string; id?: string }>) => {
  const message = event.data;
  if (message?.kind === 'l3d-hello') {
    channel.postMessage({ kind: 'l3d-here', id: message.id });
    return;
  }
  if (message?.kind !== 'l3d-request' || emulatorUrl === '') return;
  queue.push({ request: message as StudioRequest, reply: (response) => channel.postMessage(response) });
  void serve();
};

scope.onmessage = (event) => {
  if (event.data.kind !== 'init') return;
  emulatorUrl = event.data.emulatorUrl;
  eeprom = event.data.eeprom;
};
