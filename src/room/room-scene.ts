// ============================================================================
// RoomScene — Chambre de la fin des années 90, en 3D temps réel
// ----------------------------------------------------------------------------
// Ce module client construit la pièce (murs, parquet, fenêtre ensoleillée, porte),
// le bureau en hêtre, la chaise paysanne paillée, l'étagère en pin avec les projets
// sortis en boîte, et les affiches (X-Files au-dessus du bureau, Alerte à Malibu à
// côté de l'étagère). La caméra passe d'un point de vue fixe à l'autre ; le
// composant React choisit la vue, l'objet actif et le zoom. Rien ne lit l'URL ni le
// DOM hors du canvas fourni.
// ============================================================================
import * as THREE from 'three/webgpu';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';
import { addRoomLights, setDaylight } from './room-lights.ts';
import { buildLedClock, CLOCK_DEPTH, CLOCK_SIZE } from './led-clock.ts';
import { daylightFor, PARIS, parisClock, solarElevation } from './daylight.ts';
import { buildRoomShell } from './room-shell.ts';
import { buildDesk } from './desk.ts';
import { buildChair } from './chair.ts';
import { BACK, DESK, RX } from './room-layout.ts';
import { meshAdder } from './room-mesh.ts';
import { buildPc, SCREEN_H, SCREEN_W, type PcEnv, type PcPower, type PcScreen } from './pc-model.ts';
import { BAYWATCH_POSTER, buildPoster, X_FILES_POSTER } from './poster.ts';
import { buildMagazineStack } from './magazines.ts';
import { buildL3dCube, POWER_JACK } from './l3d-cube.ts';
import { startVirtualCube } from './virtual-cube.ts';
import { buildLegoMoc } from './lego-moc.ts';
import { buildOutlet } from './outlet.ts';
import { buildShelfModel, type ShelfSceneItem } from '../shelf/shelf-model.ts';
import { pixelRatioFor } from './render-quality.ts';
import { mergeStatic } from './merge-static.ts';
import { buildPineRack, RACK_DEPTH, RACK_LEVELS, RACK_WIDTH } from './pine-rack.ts';
import { blotchTexture, loadPbrSet, woodNodeMaterial, type PbrSet, type WoodOptions } from '../shelf/shelf-materials.ts';

export type RoomView = 'overview' | 'desk' | 'shelf' | 'screen' | 'poster' | 'baywatch' | 'clock' | 'cube' | 'lego';
// Zone cliquable : un meuble qui mène à une vue.
export type RoomZone = 'desk' | 'shelf' | 'screen' | 'power' | 'switch' | 'poster' | 'baywatch' | 'clock' | 'cube' | 'lego';
export type RoomHit = { zone: RoomZone | null; index: number };
// Coins de la dalle du CRT dans le canvas, en pixels CSS : haut gauche, haut droit, bas droit, bas gauche.
export type ScreenQuad = [[number, number], [number, number], [number, number], [number, number]];

export type RoomSceneOptions = {
  canvas: HTMLCanvasElement;
  // Projets de l'étagère : seulement ceux qui ont eu un support physique.
  items: readonly ShelfSceneItem[];
  // Contenu du bureau façon XP peint sur l'écran 3D du PC.
  pc: Pick<PcEnv, 'locale' | 'labels' | 'asset'>;
  // Préfixes des fichiers servis sous /room/ et /shelf/, base de déploiement incluse.
  roomBase: string;
  shelfBase: string;
  reducedMotion: boolean;
  // Avancement du chargement, de 0 à 1 : textures, boîtes puis premier rendu.
  onProgress?: (fraction: number) => void;
  // Mesure (?fps dans l'URL) : redessine à chaque image, même quand rien ne bouge.
  continuous?: boolean;
  // Décalage de l'heure de Paris, en millisecondes, pour l'horloge et le jour de la fenêtre
  // (paramètre ?heure=HH:MM de la page) ; 0 ou absent : l'heure réelle.
  clockOffset?: number;
};

// La chambre ne tourne qu'en WebGPU : le repli WebGL de Three.js compile ses shaders
// un par un sur le fil principal et met plus d'une minute à charger la scène.
export class WebGpuUnavailableError extends Error {
  constructor() { super('WebGPU indisponible'); this.name = 'WebGpuUnavailableError'; }
}

export type RoomScene = {
  // Moteur et carte graphique utilisés, par exemple « WebGPU · nvidia pascal ».
  gpu: string;
  // Nombre d'images dessinées depuis le chargement, pour le compteur de FPS.
  frames(): number;
  // Appels de dessin de la dernière image (ombres comprises), pour la mesure ?draws.
  drawCalls(): number;
  setView(view: RoomView): void;
  setActive(index: number): void;
  setZoom(index: number): void;
  // Vues du cube et de l'île LEGO : fait pivoter la caméra autour de l'objet, en radians (borné à ± 60° et ± 40°).
  orbitView(delta: number): void;
  // Position du pointeur dans [-1, 1] sur chaque axe : incline la boîte zoomée.
  setPointer(x: number, y: number): void;
  // Tourne le regard depuis la position de la caméra, en radians (gauche, haut) : tour complet
  // depuis la vue d'ensemble, borné ailleurs.
  look(yaw: number, pitch: number): void;
  // Interrupteur de la porte : allume ou éteint l'ampoule du plafond.
  toggleLight(): void;
  pick(clientX: number, clientY: number): RoomHit;
  // Suit la dalle du CRT : listener reçoit ses coins projetés dans le canvas (null quand elle
  // ne fait pas face à la caméra), tout de suite puis dans l'image même où la caméra bouge ou
  // le cadre change de taille. Rien n'est calculé tant que rien ne bouge. null le retire.
  onScreenQuad(listener: ((quad: ScreenQuad | null) => void) | null): void;
  // Interface HTML placée sous le canvas, sur la dalle : la vitre n'y ajoute plus que ses reflets,
  // et tout objet devant l'écran le cache au pixel près.
  setScreenOverlay(on: boolean): void;
  setPower(state: PcPower): void;
  setScreen(phase: PcScreen): void;
  pressPower(): void;
  resize(): void;
  setRunning(running: boolean): void;
  dispose(): void;
};

// --------------------------------------------------------------- points de vue (mètres)
// Le plan de la pièce (murs, fenêtre, porte, bureau) est dans room-layout.ts.
// Affiche collée à la pâte à fixe au mur du fond, au-dessus du bureau.
const POSTER = { x: -0.32, y: 1.64 };
// Horloge à LED au mur du fond, entre l'affiche X-Files et la fenêtre (centre, en mètres).
const CLOCK = { x: 0.3, y: 1.86 };
// Affiche d'Alerte à Malibu au mur de gauche, entre l'étagère et le mur d'entrée.
const BAYWATCH = { y: 1.5, z: 0.52 };
// Point de vue au milieu de la pièce, d'où l'on voit la porte en se retournant.
const ROOM_EYE = new THREE.Vector3(0.4, 1.5, 0.1);
// Étagère en pin posée au sol contre le mur de gauche : les boîtes sont au 4e niveau, à hauteur des yeux.
const SHELF = { x: -RX + RACK_DEPTH / 2 + 0.01, y: RACK_LEVELS[3], z: -0.3, width: RACK_WIDTH - 0.04 };

// Centre du cube à LED, posé au milieu du niveau sous les boîtes ; la vue du cube tourne autour.
const CUBE_CENTER = { y: RACK_LEVELS[2] + 0.125 };
// Débattement de la caméra de part et d'autre de la face avant du cube ou de l'île.
const CUBE_ORBIT_MAX = THREE.MathUtils.degToRad(60);
// Autour de l'île, au-delà de 40°, le cube ou un montant de l'étagère passe devant elle.
const LEGO_ORBIT_MAX = THREE.MathUtils.degToRad(40);

type Pose = { position: THREE.Vector3; target: THREE.Vector3; fov: number };
const pose = (p: [number, number, number], t: [number, number, number], fov: number): Pose =>
  ({ position: new THREE.Vector3(...p), target: new THREE.Vector3(...t), fov });
const VIEWS: Record<RoomView, Pose> = {
  overview: pose([1.5, 1.55, 1.6], [-0.55, 0.88, -0.85], 52),
  desk: pose([-0.12, 1.36, 0.02], [-0.16, 0.9, -1.3], 42),
  poster: pose([POSTER.x + 0.04, POSTER.y, BACK + 1.75], [POSTER.x, POSTER.y, BACK], 40),
  baywatch: pose([-RX + 1.4, BAYWATCH.y, BAYWATCH.z + 0.03], [-RX, BAYWATCH.y, BAYWATCH.z], 40),
  clock: pose([CLOCK.x - 0.05, CLOCK.y - 0.08, BACK + 0.95], [CLOCK.x, CLOCK.y, BACK], 28),
  // Calculée à la volée face à la dalle ; cette pose ne sert que de repli.
  screen: pose([-0.1, 0.98, -0.5], [-0.1, 0.98, -1.2], 30),
  shelf: pose([0.05, SHELF.y - 0.02, SHELF.z], [SHELF.x, SHELF.y - 0.12, SHELF.z], 44),
  // Calculée à la volée autour du cube ; cette pose ne sert que de repli.
  cube: pose([SHELF.x + 0.7, CUBE_CENTER.y + 0.05, SHELF.z], [SHELF.x, CUBE_CENTER.y, SHELF.z], 34),
  // Calculée à la volée autour de l'île ; cette pose ne sert que de repli.
  lego: pose([SHELF.x + 0.6, RACK_LEVELS[2] + 0.25, SHELF.z + 0.27], [SHELF.x, RACK_LEVELS[2] + 0.06, SHELF.z + 0.27], 34),
};

// ----------------------------------------------------------------------------
// Crée la chambre, charge textures et jaquettes puis démarre la boucle de rendu.
// Retour : contrôleur de scène ; rejette si aucun moteur graphique n'est disponible.
// ----------------------------------------------------------------------------
export async function createRoomScene(options: RoomSceneOptions): Promise<RoomScene> {
  const { canvas, items, roomBase, shelfBase, reducedMotion } = options;
  // Poids de chaque étape : HDRI, trois jeux de textures, trois images par boîte, premier rendu.
  const expected = 1 + 3 * 3 + items.length * 3 + 2 + 4;
  let done = 0;
  const report = (weight: number) => { done += weight; options.onProgress?.(Math.min(1, done / expected)); };
  const tick = <V>(weight: number) => (value: V): V => { report(weight); return value; };
  const gpuApi = (navigator as Navigator & { gpu?: { requestAdapter(options?: { powerPreference?: string }): Promise<{ info?: { vendor?: string; architecture?: string } } | null> } }).gpu;
  const adapter = await gpuApi?.requestAdapter({ powerPreference: 'high-performance' }).catch(() => null);
  if (adapter === null || adapter === undefined) throw new WebGpuUnavailableError();
  const gpu = ['WebGPU', [adapter.info?.vendor, adapter.info?.architecture].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  const renderer = new THREE.WebGPURenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  await renderer.init();
  if ((renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend !== true) { renderer.dispose(); throw new WebGpuUnavailableError(); }
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  const maxAniso = renderer.getMaxAnisotropy();
  THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0b0d);
  const camera = new THREE.PerspectiveCamera(VIEWS.overview.fov, 1, 0.03, 30);
  const loader = new THREE.TextureLoader();
  const disposables: { dispose(): void }[] = [];
  const keep = <V extends { dispose(): void }>(value: V): V => { disposables.push(value); return value; };
  await document.fonts.load('900 64px "Mona Sans Variable"').catch(() => undefined);

  // --------------------------------------------------------------- textures
  const [hdr, beech, oak, plaster] = await Promise.all([
    new HDRLoader().loadAsync(`${shelfBase}room.hdr`).then(tick(1)),
    loadPbrSet(loader, roomBase, 'beech', maxAniso).then(tick(3)),
    loadPbrSet(loader, roomBase, 'floor', maxAniso).then(tick(3)),
    loadPbrSet(loader, roomBase, 'wall', maxAniso).then(tick(3)),
  ]);
  keep(hdr);
  for (const set of [beech, oak, plaster]) { keep(set.diff); keep(set.nor); keep(set.arm); }
  const dustTex = keep(blotchTexture(1024, 17, 140, 9000));
  const smudgeTex = keep(blotchTexture(512, 29, 60, 0));
  const pbr = (set: PbrSet, opts: WoodOptions) => keep(woodNodeMaterial(set, dustTex, opts));
  // Objets chargés à part (images, maillages, boîtes) : tous lancés d'un coup, chacun attendu
  // seulement là où il prend place, pour que téléchargements et décodages se chevauchent.
  const magazinesLoad = buildMagazineStack(keep, roomBase, maxAniso);
  const posterLoad = buildPoster(keep, roomBase, X_FILES_POSTER, maxAniso);
  const baywatchLoad = buildPoster(keep, roomBase, BAYWATCH_POSTER, maxAniso);
  const pcLoad = buildPc({ keep, maxAniso, smudgeTex, ...options.pc });
  const islandLoad = buildLegoMoc(keep, `${roomBase}moc/ile-du-tresor.bin`).catch(() => null);
  const modelLoad = buildShelfModel({ keep, assetBase: shelfBase, lite: false, maxAniso, wood: beech, dustTex, smudgeTex, onItem: () => report(3) }, items, SHELF.width, { furniture: false, plaques: false });
  // Un échec reste signalé à l'attente ; il ne doit pas l'être en plus comme rejet non traité.
  for (const load of [magazinesLoad, posterLoad, baywatchLoad, pcLoad, modelLoad]) load.catch(() => undefined);

  // --------------------------------------------------------------- lumière
  // Jour par la fenêtre, ciel, ambiance et ampoule du plafond (room-lights.ts).
  const lights = addRoomLights(scene, hdr);
  const { sun, bulbLight } = lights;

  // --------------------------------------------------------------- pièce
  const add = meshAdder(keep);
  // Murs, sol, plafond, porte, interrupteur, fenêtre et suspension (room-shell.ts).
  const { room, lightSwitch, bulbGlass, setSky } = buildRoomShell(keep, pbr, oak, plaster);
  scene.add(room);
  // Heure de Paris (décalée par ?heure) et jour de la fenêtre, posés avant le premier rendu.
  const clockNow = () => new Date(Date.now() + (options.clockOffset ?? 0));
  let shownDay = -1;
  // ----------------------------------------------------------------------------
  // Règle soleil, ciel, ambiance et paysage selon la hauteur du soleil sur Paris à date.
  // Retour : vrai si la part de jour a changé de façon visible (reflets de l'écran à refaire).
  // ----------------------------------------------------------------------------
  const applyDaylight = (date: Date): boolean => {
    const state = daylightFor(solarElevation(date, PARIS.lat, PARIS.lon));
    setDaylight(lights, scene, state);
    setSky(state);
    const visible = Math.abs(state.day - shownDay) > 0.02;
    if (visible) shownDay = state.day;
    return visible;
  };
  applyDaylight(clockNow());

  // --------------------------------------------------------------- bureau en hêtre
  // Hêtre clair verni, comme la chaise et l'étagère : des meubles blonds des années 90 (desk.ts).
  const desk = buildDesk(keep, pbr, beech);
  desk.position.set(DESK.x, 0, DESK.z);
  desk.userData.zone = 'desk';
  scene.add(desk);

  // Pile de magazines d'époque au coin droit du bureau, derrière le tapis de souris.
  const magazines = await magazinesLoad;
  magazines.position.set(0.5, DESK.h, -0.15);
  magazines.rotation.y = -0.12;
  desk.add(magazines);

  // --------------------------------------------------------------- chaise paysanne
  const chair = buildChair(keep, pbr, beech, maxAniso);
  chair.position.set(DESK.x + 0.18, 0, DESK.z + 0.62);
  chair.rotation.y = 0.32;
  chair.userData.zone = 'desk';
  scene.add(chair);

  // --------------------------------------------------------------- affiche
  const poster = await posterLoad;
  poster.position.set(POSTER.x, POSTER.y, BACK + 0.0005);
  poster.userData.zone = 'poster';
  scene.add(poster);
  // Alerte à Malibu au mur de gauche, tournée vers la pièce.
  const baywatch = await baywatchLoad;
  baywatch.position.set(-RX + 0.0005, BAYWATCH.y, BAYWATCH.z);
  baywatch.rotation.y = Math.PI / 2;
  baywatch.userData.zone = 'baywatch';
  scene.add(baywatch);
  // Horloge murale à LED bleues, à l'heure de Paris, et son fil d'alimentation qui descend
  // le long du mur jusque derrière le bureau.
  const clock = buildLedClock(keep, maxAniso);
  clock.group.position.set(CLOCK.x, CLOCK.y, BACK);
  clock.group.userData.zone = 'clock';
  scene.add(clock.group);
  const clockCable = new THREE.CatmullRomCurve3([
    [CLOCK.x + 0.06, CLOCK.y - CLOCK_SIZE / 2 + 0.01, BACK + CLOCK_DEPTH * 0.3],
    [CLOCK.x + 0.065, CLOCK.y - CLOCK_SIZE / 2 - 0.03, BACK + 0.006],
    [CLOCK.x + 0.07, 1.2, BACK + 0.004],
    [CLOCK.x + 0.08, DESK.h - 0.05, BACK + 0.004],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  add(scene, new THREE.TubeGeometry(clockCable, 40, 0.002, 6, false), keep(new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })), 0, 0, 0);
  clock.group.updateMatrixWorld(true);
  // Volume de l'horloge : son changement de seconde ne demande un rendu que si elle est dans le champ.
  const clockBounds = new THREE.Box3().setFromObject(clock.group);
  clock.show(parisClock(clockNow()));
  // Seconde affichée par l'horloge, pour ne la repeindre qu'une fois par seconde.
  let clockSecond = -1;

  // --------------------------------------------------------------- ordinateur
  const pc = await pcLoad;
  // Pièces immobiles du PC fusionnées par matériau (câbles, grille, boutons, façades).
  mergeStatic(pc.group, { keep: (geometry) => { keep(geometry); }, minShadowSize: 0.003 });
  pc.group.position.set(DESK.x, DESK.h, DESK.z);
  pc.group.userData.zone = 'desk';
  scene.add(pc.group);
  report(2);

  // --------------------------------------------------------------- étagère
  // Rayonnage en pin brut à lattes ; les boîtes, sans plaque, sont posées sur un niveau.
  const rack = buildPineRack(keep, beech, dustTex);
  rack.position.set(SHELF.x, 0, SHELF.z);
  rack.rotation.y = Math.PI / 2;
  rack.userData.zone = 'shelf';
  scene.add(rack);
  // Cube à LED L3D 8 x 8 x 8 sur le niveau sous les boîtes, LED et Photon éteints.
  const cube = buildL3dCube(keep);
  cube.group.position.set(SHELF.x, RACK_LEVELS[2], SHELF.z);
  cube.group.rotation.y = Math.PI / 2;
  cube.group.userData.zone = 'cube';
  scene.add(cube.group);
  // Le vrai firmware du cube, en WebAssembly : il s'éveille quand le studio L3D lui parle.
  const virtualCube = startVirtualCube(`${roomBase}l3d/l3d-emulator.mjs`, (rgb) => cube.setFrame(rgb), (signal) => cube.setSignal(signal));
  // MOC LEGO « Île du Trésor Oublié » à l'échelle 1, à côté du cube, face à la pièce.
  // Facultative : sans son fichier, la chambre s'affiche sans elle.
  const island = await islandLoad;
  // Boîte englobante de l'île : la vue LEGO la cadre et tourne autour de son centre.
  let islandFrame: { center: THREE.Vector3; width: number; height: number; bounds: THREE.Box3 } | null = null;
  if (island !== null) {
    island.position.set(SHELF.x, RACK_LEVELS[2], SHELF.z + 0.27);
    island.rotation.y = Math.PI / 2;
    island.userData.zone = 'lego';
    scene.add(island);
    island.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(island);
    const size = bounds.getSize(new THREE.Vector3());
    islandFrame = { center: bounds.getCenter(new THREE.Vector3()), width: Math.max(size.x, size.z), height: size.y, bounds };
  }
  // Prise murale à côté de l'étagère, et câble noir : il sort de la prise jack à l'arrière, descend
  // entre l'étagère et le mur, longe la plinthe puis remonte jusqu'à la fiche.
  const outlet = buildOutlet(keep);
  outlet.group.position.set(-RX, 0.3, 0.38);
  outlet.group.rotation.y = Math.PI / 2;
  scene.add(outlet.group);
  outlet.group.updateMatrixWorld(true);
  const plug = outlet.group.localToWorld(outlet.cableStart.clone());
  cube.group.updateMatrixWorld(true);
  const jack = cube.group.localToWorld(POWER_JACK.clone());
  // Volume du cube : ses LED ne demandent un rendu que s'il est dans le champ.
  const cubeBounds = new THREE.Box3().setFromObject(cube.group);
  const cablePath = new THREE.CatmullRomCurve3([
    [jack.x - 0.004, jack.y, jack.z],
    [jack.x - 0.02, jack.y - 0.004, jack.z + 0.01],
    [-RX + 0.04, RACK_LEVELS[2] + 0.012, SHELF.z + 0.03],
    [-RX + 0.006, RACK_LEVELS[2] - 0.08, SHELF.z + 0.06],
    [-RX + 0.006, 0.45, SHELF.z + 0.13],
    [-RX + 0.007, 0.12, SHELF.z + 0.2],
    [-RX + 0.021, 0.006, SHELF.z + 0.32],
    [-RX + 0.021, 0.006, 0.28],
    [-RX + 0.024, 0.07, 0.36],
    [plug.x + 0.006, plug.y - 0.08, plug.z],
    [plug.x, plug.y, plug.z],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  add(scene, new THREE.TubeGeometry(cablePath, 220, 0.0028, 8, false), keep(new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 })), 0, 0, 0);
  const model = await modelLoad;
  model.group.position.set(SHELF.x, SHELF.y, SHELF.z);
  model.group.rotation.y = Math.PI / 2;
  model.group.userData.zone = 'shelf';
  scene.add(model.group);

  // --------------------------------------------------------------- état et boucle
  let view: RoomView = 'overview';
  let active = -1;
  let zoomed = -1;
  let running = true;
  let awakeUntil = 0;
  // Angle visé autour du cube et angle affiché, qui le rejoint en douceur.
  let orbit = 0;
  let orbitShown = 0;
  // Regard tourné au doigt (lacet, tangage), visé puis affiché avec amortissement.
  const gaze = { yaw: 0, pitch: 0, yawShown: 0, pitchShown: 0 };
  let lightOn = true;
  const gazeAim = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const sway = new THREE.Vector2();
  const timer = new THREE.Timer();
  // Transition de caméra : pose de départ, pose visée et avancement de 0 à 1.
  const current: Pose = { position: VIEWS.overview.position.clone(), target: VIEWS.overview.target.clone(), fov: VIEWS.overview.fov };
  let from: Pose = clonePose(current);
  let goal: Pose = clonePose(current);
  let progress = 1;
  let drawn = 0;
  // Appels de dessin de la dernière image dessinée.
  let lastDrawCalls = 0;
  const wake = (ms = 1600) => { awakeUntil = Math.max(awakeUntil, performance.now() + ms); };
  const damp = (a: number, b: number, k: number, dt: number) => (reducedMotion ? b : a + (b - a) * (1 - Math.exp(-k * dt)));
  // Boîte de l'étagère privée d'ombre pendant qu'elle est sortie (-1 : aucune).
  let shadowless = -1;
  const castShadows = (index: number, on: boolean) => {
    model.placed[index]?.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (!on) { object.userData.castShadow ??= object.castShadow; object.castShadow = false; }
      else object.castShadow = object.userData.castShadow === true;
    });
  };
  // Pose de la caméra à l'image précédente, pour savoir si elle bouge.
  const lastView = new THREE.Matrix4();
  // Champ de la caméra, recalculé quand elle bouge, et matrice de travail pour le calculer.
  const frustum = new THREE.Frustum();
  const frustumMatrix = new THREE.Matrix4();
  // Taille du canvas en pixels CSS, relue seulement au redimensionnement.
  const viewSize = new THREE.Vector2(1, 1);
  // Suivi de la dalle par l'interface HTML : écouteur, et besoin d'un nouveau calcul.
  let quadListener: ((quad: ScreenQuad | null) => void) | null = null;
  let quadDirty = true;
  const scratch = new THREE.Vector3();

  // Pose visée : la vue courante, ou une boîte de l'étagère vue de face.
  function goalPose(): Pose {
    if (view === 'shelf' && zoomed >= 0) {
      const item = model.placed[zoomed];
      if (item !== undefined) {
        const center = model.group.localToWorld(new THREE.Vector3(item.rest.x, 0.15, item.rest.z + 0.17));
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(model.group.quaternion);
        return { position: center.clone().addScaledVector(normal, 0.86).add(new THREE.Vector3(0, 0.05, 0)), target: center, fov: 34 };
      }
    }
    const subject = view === 'cube'
      ? { center: new THREE.Vector3(SHELF.x, CUBE_CENTER.y, SHELF.z), width: 0.26, height: 0.3, nearest: 0.55, lift: 0.08 }
      : view === 'lego' && islandFrame !== null
        ? { center: islandFrame.center, width: islandFrame.width, height: islandFrame.height, nearest: 0.3, lift: 0.45 }
        : null;
    if (subject !== null) {
      // L'objet entier occupe environ 70 % du cadre, quel que soit le format ; la caméra
      // le regarde un peu d'en haut et tourne autour de son centre.
      const fov = 34;
      const half = Math.tan(THREE.MathUtils.degToRad(fov / 2));
      const distance = Math.max(subject.nearest, subject.height / 0.7 / 2 / half, subject.width / 0.7 / 2 / (half * camera.aspect));
      const position = subject.center.clone().add(new THREE.Vector3(Math.cos(orbitShown) * distance, 0.05 + distance * subject.lift, -Math.sin(orbitShown) * distance));
      return { position, target: subject.center, fov };
    }
    if (view === 'screen') {
      // Recul tel que la dalle remplisse 84 % de la hauteur ou de la largeur du cadre.
      scene.updateMatrixWorld(true);
      const center = pc.screenCenter();
      const normal = pc.screenNormal();
      const fov = 30;
      const half = Math.tan(THREE.MathUtils.degToRad(fov / 2));
      const fill = 0.84;
      const distance = Math.max(SCREEN_H / 2 / fill / half, SCREEN_W / 2 / fill / (half * camera.aspect));
      return { position: center.clone().addScaledVector(normal, distance), target: center, fov };
    }
    return clonePose(VIEWS[view]);
  }
  function retarget(): void {
    from = clonePose(current);
    goal = goalPose();
    progress = reducedMotion ? 1 : 0;
    wake(3000);
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // Taille gardée pour projeter la dalle sans relire la mise en page à chaque image.
    viewSize.set(rect.width, rect.height);
    quadDirty = true;
    // Grand cadre très dense : nombre de pixels plafonné (render-quality.ts).
    renderer.setPixelRatio(pixelRatioFor(rect.width, rect.height, window.devicePixelRatio));
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    // Face à l'écran, le cadrage dépend du format : il se recale sans transition.
    if (view === 'screen' && progress >= 1) { goal = goalPose(); from = clonePose(goal); }
    wake();
  }

  function frame(): void {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    let busy = false;
    if (progress < 1) {
      progress = Math.min(1, progress + dt / 1.5);
      busy = true;
    }
    // Courbe douce en entrée et en sortie, avec un léger arc vers le haut pendant le trajet.
    const e = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
    current.position.lerpVectors(from.position, goal.position, e);
    current.position.y += Math.sin(Math.PI * e) * 0.08 * from.position.distanceTo(goal.position);
    current.target.lerpVectors(from.target, goal.target, e);
    current.fov = from.fov + (goal.fov - from.fov) * e;
    // La souris ne fait plus qu'incliner la boîte zoomée ; elle ne déplace pas la caméra.
    sway.x = damp(sway.x, zoomed >= 0 ? pointer.x : 0, 2.5, dt);
    sway.y = damp(sway.y, zoomed >= 0 ? pointer.y : 0, 2.5, dt);
    // Arrivé à moins d'un seuil invisible, l'amortissement se cale sur sa cible : sinon la
    // valeur s'en approche sans fin et la scène redessine des écarts imperceptibles.
    if (Math.abs(sway.x - (zoomed >= 0 ? pointer.x : 0)) > 0.002 || Math.abs(sway.y - (zoomed >= 0 ? pointer.y : 0)) > 0.002) busy = true;
    else sway.set(zoomed >= 0 ? pointer.x : 0, zoomed >= 0 ? pointer.y : 0);
    // Autour du cube et de l'île, le glissé fait tourner la caméra.
    const orbiting = view === 'cube' || view === 'lego';
    if (orbiting) {
      orbitShown = damp(orbitShown, orbit, 8, dt);
      if (Math.abs(orbitShown - orbit) > 0.0005) busy = true; else orbitShown = orbit;
      if (progress >= 1) goal = goalPose();
    }
    // Caméra fixe : la souris ne la déplace pas (reflets et arêtes fines glissaient avec elle).
    camera.position.copy(current.position);
    // Vue d'ensemble : plus on se retourne, plus la tête s'avance vers le milieu de la pièce,
    // sinon le coin où elle se tient ne montre que le mur d'en face.
    if (view === 'overview') {
      const turn = Math.min(1, Math.abs(Math.atan2(Math.sin(gaze.yawShown), Math.cos(gaze.yawShown))) / (Math.PI / 2));
      camera.position.lerp(ROOM_EYE, turn * turn * (3 - 2 * turn));
    }
    gaze.yawShown = damp(gaze.yawShown, gaze.yaw, 10, dt);
    gaze.pitchShown = damp(gaze.pitchShown, gaze.pitch, 10, dt);
    if (Math.abs(gaze.yawShown - gaze.yaw) > 0.0005 || Math.abs(gaze.pitchShown - gaze.pitch) > 0.0005) busy = true;
    else { gaze.yawShown = gaze.yaw; gaze.pitchShown = gaze.pitch; }
    gazeAim.subVectors(current.target, camera.position).applyAxisAngle(THREE.Object3D.DEFAULT_UP, gaze.yawShown);
    gazeAim.applyAxisAngle(scratch.crossVectors(gazeAim, THREE.Object3D.DEFAULT_UP).normalize(), gaze.pitchShown);
    camera.lookAt(gazeAim.add(camera.position));
    camera.updateMatrixWorld();
    const moving = !lastView.equals(camera.matrixWorld);
    lastView.copy(camera.matrixWorld);
    if (camera.fov !== current.fov) { camera.fov = current.fov; camera.updateProjectionMatrix(); }
    // La dalle suit la caméra dans l'image même où elle bouge : l'interface HTML posée dessus
    // n'a pas une image de retard, et rien n'est recalculé caméra immobile.
    if ((moving || quadDirty) && quadListener !== null) { quadDirty = false; quadListener(projectScreen()); }
    if (moving) frustum.setFromProjectionMatrix(frustumMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

    const boxesMoving = model.update(dt, active, zoomed, zoomed >= 0 ? sway.x : 0, damp);
    if (boxesMoving) busy = true;
    // La boîte sortie ne porte pas d'ombre : les cartes d'ombre (soleil, six faces de l'ampoule)
    // ne sont recalculées qu'à sa sortie et à son retour, jamais à chaque image d'un mouvement.
    if (active !== shadowless && (active >= 0 || !boxesMoving)) {
      if (shadowless >= 0) castShadows(shadowless, true);
      if (active >= 0) castShadows(active, false);
      shadowless = active;
      sun.shadow.needsUpdate = true;
      bulbLight.shadow.needsUpdate = true;
      busy = true;
    }
    if (pc.update(performance.now())) busy = true;
    // Images du Photon virtuel reçues depuis le dernier rendu : appliquées tout de suite, mais
    // elles ne justifient un rendu que si le cube est dans le champ.
    const cubeChanged = cube.update(performance.now()) && frustum.intersectsBox(cubeBounds);
    // Horloge et jour de la fenêtre : une seconde nouvelle repeint l'affichage (rendu seulement
    // si l'horloge se voit) ; chaque minute, la lumière suit la hauteur du soleil.
    let clockChanged = false;
    const second = Math.floor(clockNow().getTime() / 1000);
    if (second !== clockSecond) {
      clockSecond = second;
      const date = new Date(second * 1000);
      clockChanged = clock.show(parisClock(date)) && frustum.intersectsBox(clockBounds);
      if (second % 60 === 0 && applyDaylight(date)) { captureReflection(); busy = true; }
    }
    if (busy || moving || performance.now() < awakeUntil || cubeChanged || clockChanged || options.continuous === true) {
      renderer.render(scene, camera);
      drawn += 1;
      // Lu tout de suite : la boucle d'animation remet le compteur à zéro à chaque tour.
      lastDrawCalls = renderer.info.render.drawCalls;
    }
  }

  resize();
  // Le premier rendu compile tous les shaders : c'est la dernière étape de la barre.
  renderer.render(scene, camera);
  // La vitre du moniteur reflète la chambre, pas le salon du HDRI : une photo en cubemap prise
  // juste devant l'écran, refaite seulement quand l'ampoule s'allume ou s'éteint, ou quand le
  // jour de la fenêtre change de façon visible.
  const reflection = keep(new THREE.CubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }));
  const reflectionCamera = new THREE.CubeCamera(0.03, 12, reflection);
  reflectionCamera.position.copy(pc.screenCenter()).addScaledVector(pc.screenNormal(), 0.03);
  scene.add(reflectionCamera);
  const captureReflection = () => reflectionCamera.update(renderer, scene);
  captureReflection();
  scene.remove(reflectionCamera);
  const sceneLights: THREE.Light[] = [];
  scene.traverse((object) => { if (object instanceof THREE.Light) sceneLights.push(object); });
  pc.setReflection(reflection.texture, sceneLights);
  report(4);
  wake(5000);
  renderer.setAnimationLoop(frame);


  // --------------------------------------------------------------- contrôleur
  const raycaster = new THREE.Raycaster();
  const islandHit = new THREE.Vector3();
  const quadRay = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  const zoneOf = (object: THREE.Object3D | null): RoomZone | null => {
    for (let node = object; node !== null; node = node.parent) {
      const zone = node.userData.zone as RoomZone | undefined;
      if (zone !== undefined) return zone;
    }
    return null;
  };
  // ----------------------------------------------------------------------------
  // Coins de la dalle du CRT projetés dans le canvas, en pixels CSS.
  // Retour : null si la dalle tourne le dos à la caméra ou passe derrière elle.
  // ----------------------------------------------------------------------------
  function projectScreen(): ScreenQuad | null {
    const center = pc.screenCenter();
    if (pc.screenNormal().dot(quadRay.subVectors(camera.position, center)) <= 0) return null;
    const points = pc.screenCorners().map((corner) => corner.project(camera));
    if (points.some((p) => p.z < -1 || p.z > 1)) return null;
    return points.map((p) => [(p.x + 1) / 2 * viewSize.x, (1 - p.y) / 2 * viewSize.y]) as ScreenQuad;
  }

  return {
    gpu,
    frames: () => drawn,
    drawCalls: () => lastDrawCalls,
    setView(next) {
      if (next === view) return;
      view = next;
      if (view !== 'shelf') { active = -1; zoomed = -1; }
      if (view === 'cube' || view === 'lego') { orbit = 0; orbitShown = 0; }
      // Le regard revient au centre par le plus court chemin, même après plusieurs tours.
      gaze.yawShown = Math.atan2(Math.sin(gaze.yawShown), Math.cos(gaze.yawShown));
      gaze.yaw = 0; gaze.pitch = 0;
      retarget();
    },
    setActive(index) { if (index !== active) { active = index; wake(); } },
    setZoom(index) { if (index !== zoomed) { zoomed = index; retarget(); } },
    orbitView(delta) {
      const limit = view === 'lego' ? LEGO_ORBIT_MAX : CUBE_ORBIT_MAX;
      orbit = Math.max(-limit, Math.min(limit, orbit + delta));
      wake();
    },
    look(yaw, pitch) {
      const around = view === 'overview';
      gaze.yaw = around ? gaze.yaw + yaw : Math.max(-0.75, Math.min(0.75, gaze.yaw + yaw));
      gaze.pitch = Math.max(around ? -0.6 : -0.35, Math.min(around ? 0.6 : 0.35, gaze.pitch + pitch));
      wake();
    },
    toggleLight() {
      lightOn = !lightOn;
      bulbLight.intensity = lightOn ? 6 : 0;
      bulbGlass.emissiveIntensity = lightOn ? 6 : 0;
      lightSwitch.setOn(lightOn);
      // La vitre du moniteur reflète la pièce telle qu'elle est éclairée maintenant.
      captureReflection();
      wake();
    },
    setPointer(x, y) { pointer.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))); if (zoomed >= 0) wake(900); },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      // Les boîtes d'abord : le volume de clic de l'étagère passe devant elles.
      // Puis le cube, sinon c'est le volume de l'étagère qui le couvre.
      const item = raycaster.intersectObjects(model.pickTargets(), true)[0] ?? raycaster.intersectObject(cube.group, true)[0];
      // L'île LEGO est petite et ajourée : toute sa boîte englobante est cliquable.
      const onIsland = islandFrame === null ? null : raycaster.ray.intersectBox(islandFrame.bounds, islandHit);
      if (onIsland !== null && onIsland.distanceTo(raycaster.ray.origin) < (item?.distance ?? Infinity)) return { zone: 'lego', index: -1 };
      const hit = item ?? raycaster.intersectObjects([pc.group, desk, chair, rack, cube.group, model.group, poster, baywatch, clock.group, room], true)[0];
      const index = hit?.object.userData.index;
      return { zone: zoneOf(hit?.object ?? null), index: typeof index === 'number' ? index : -1 };
    },
    onScreenQuad(listener) {
      quadListener = listener;
      if (listener !== null) listener(projectScreen());
    },
    setScreenOverlay(on) { pc.setOverlay(on); wake(); },
    setPower(state) { pc.setPower(state); wake(); },
    setScreen(phase) { pc.setScreen(phase); wake(); },
    pressPower() { pc.pressPower(); wake(600); },
    resize,
    setRunning(next) {
      if (next === running) return;
      running = next;
      renderer.setAnimationLoop(next ? frame : null);
      // Onglet masqué : le firmware du cube s'arrête aussi, il reprend où il en était.
      virtualCube.setPaused(!next);
      if (next) wake();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      virtualCube.dispose();
      model.disposeVideos();
      for (const value of disposables) value.dispose();
      renderer.dispose();
    },
  };
}

function clonePose(value: Pose): Pose {
  return { position: value.position.clone(), target: value.target.clone(), fov: value.fov };
}
