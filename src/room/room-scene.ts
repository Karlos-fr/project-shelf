// ============================================================================
// RoomScene — Chambre de la fin des années 90, en 3D temps réel
// ----------------------------------------------------------------------------
// Ce module client construit la pièce (murs, parquet, fenêtre ensoleillée, rideaux),
// le bureau en pin, la chaise paysanne en hêtre paillée et l'étagère en noyer avec
// les projets sortis en boîte. La caméra passe d'un point de vue fixe à l'autre ; le
// composant React choisit la vue, l'objet actif et le zoom. Rien ne lit l'URL ni le
// DOM hors du canvas fourni.
// ============================================================================
import * as THREE from 'three/webgpu';
import { texture, uv } from 'three/tsl';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';
import { buildPc, SCREEN_H, SCREEN_W, type PcEnv, type PcPower, type PcScreen } from './pc-model.ts';
import { buildPoster, POSTER_FILE } from './poster.ts';
import { buildMagazineStack } from './magazines.ts';
import { buildL3dCube, POWER_JACK } from './l3d-cube.ts';
import { startVirtualCube } from './virtual-cube.ts';
import { buildLegoMoc } from './lego-moc.ts';
import { buildOutlet } from './outlet.ts';
import { buildShelfModel, type ShelfSceneItem } from '../shelf/shelf-model.ts';
import { buildPineRack, RACK_DEPTH, RACK_LEVELS, RACK_WIDTH } from './pine-rack.ts';
import { blotchTexture, canvas2d, loadPbrSet, printNormal, seeded, woodNodeMaterial, type PbrSet, type WoodOptions } from '../shelf/shelf-materials.ts';

export type RoomView = 'overview' | 'desk' | 'shelf' | 'screen' | 'poster' | 'cube' | 'lego';
// Zone cliquable : un meuble qui mène à une vue.
export type RoomZone = 'desk' | 'shelf' | 'screen' | 'power' | 'poster' | 'cube' | 'lego';
export type RoomHit = { zone: RoomZone | null; index: number };

export type RoomSceneOptions = {
  canvas: HTMLCanvasElement;
  // Projets de l'étagère : seulement ceux qui ont eu un support physique.
  items: readonly ShelfSceneItem[];
  // Contenu du bureau façon XP peint sur l'écran 3D du PC.
  pc: Pick<PcEnv, 'labels' | 'projects' | 'asset'>;
  // Préfixes des fichiers servis sous /room/ et /shelf/, base de déploiement incluse.
  roomBase: string;
  shelfBase: string;
  reducedMotion: boolean;
  // Avancement du chargement, de 0 à 1 : textures, boîtes puis premier rendu.
  onProgress?: (fraction: number) => void;
  // Mesure (?fps dans l'URL) : redessine à chaque image, même quand rien ne bouge.
  continuous?: boolean;
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
  setView(view: RoomView): void;
  setActive(index: number): void;
  setZoom(index: number): void;
  // Vues du cube et de l'île LEGO : fait pivoter la caméra autour de l'objet, en radians (borné à ± 60° et ± 40°).
  orbitView(delta: number): void;
  // Position du pointeur dans [-1, 1] sur chaque axe : incline la boîte zoomée.
  setPointer(x: number, y: number): void;
  // Au doigt : tourne le regard depuis la position de la caméra, en radians (gauche, haut), borné.
  look(yaw: number, pitch: number): void;
  pick(clientX: number, clientY: number): RoomHit;
  // Rectangle de la dalle du CRT dans le canvas, en pixels CSS, une fois la caméra arrivée.
  screenRect(): { left: number; top: number; width: number; height: number } | null;
  setPower(state: PcPower): void;
  setScreen(phase: PcScreen): void;
  pressPower(): void;
  resize(): void;
  setRunning(running: boolean): void;
  dispose(): void;
};

// --------------------------------------------------------------- plan de la pièce (mètres)
// Murs intérieurs : x de -RX à +RX, z de BACK à FRONT, plafond à RH.
const RX = 1.9;
const BACK = -1.6;
const FRONT = 1.8;
const RH = 2.5;
const WALL = 0.15;
// Fenêtre du mur du fond.
const WIN = { x: 1.05, w: 0.95, y0: 0.95, y1: 2.2 };
// Teinte du hêtre clair (placage de frêne Poly Haven réchauffé), commune aux trois meubles.
const BEECH = { tint: 0xf7dcc0, brightness: 1.25, normalScale: 0.9 } as const;
// Bureau en hêtre contre le mur du fond.
const DESK = { x: -0.15, z: BACK + 0.38, w: 1.4, d: 0.7, h: 0.74 };
// Affiche collée à la pâte à fixe au mur du fond, au-dessus du bureau.
const POSTER = { x: -0.32, y: 1.64 };
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
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  await renderer.init();
  if ((renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend !== true) { renderer.dispose(); throw new WebGpuUnavailableError(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
  const posterLoad = buildPoster(keep, `${roomBase}${POSTER_FILE}`, maxAniso);
  const pcLoad = buildPc({ keep, maxAniso, smudgeTex, ...options.pc });
  const islandLoad = buildLegoMoc(keep, `${roomBase}moc/ile-du-tresor.bin`).catch(() => null);
  const modelLoad = buildShelfModel({ keep, assetBase: shelfBase, lite: false, maxAniso, wood: beech, dustTex, smudgeTex, onItem: () => report(3) }, items, SHELF.width, { furniture: false, plaques: false });
  // Un échec reste signalé à l'attente ; il ne doit pas l'être en plus comme rejet non traité.
  for (const load of [magazinesLoad, posterLoad, pcLoad, modelLoad]) load.catch(() => undefined);

  // --------------------------------------------------------------- lumière
  // Le HDRI d'un vrai salon (Poly Haven, CC0) donne reflets et lumière ambiante, atténués :
  // la pièce est close, l'essentiel du jour entre par la fenêtre.
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr;
  scene.environmentIntensity = 0.3;
  scene.environmentRotation = new THREE.Euler(0, 2.2, 0);
  // Soleil de fin d'après-midi par la fenêtre : les murs portent ombre, seule l'ouverture laisse passer.
  const sun = new THREE.DirectionalLight(0xffeedd, 7);
  // Le faisceau traverse la fenêtre et tombe sur le parquet entre le bureau et l'étagère.
  sun.target.position.set(-0.45, 0, -0.35);
  sun.position.copy(sun.target.position).add(new THREE.Vector3(1.5, 1.575, -1.25).multiplyScalar(3));
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(4096);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  // Rayon 0 : le PCF de Three.js en WebGPU fait tourner ses échantillons selon un bruit par
  // pixel, qui dessinait une trame crépitante ; à 0, seul le filtrage bilinéaire matériel adoucit le bord.
  sun.shadow.radius = 3;
  sun.shadow.blurSamples = 8;
  // La pièce est immobile : la carte d'ombre (4096²) n'est recalculée que quand une boîte bouge.
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  Object.assign(sun.shadow.camera, { left: -3.8, right: 3.8, top: 3.8, bottom: -3.8, near: 0.5, far: 12 });
  scene.add(sun, sun.target);
  // Ciel vu par la fenêtre : une lumière surfacique douce et froide, sans ombre.
  const skyLight = new THREE.RectAreaLight(0xdce8ff, 5, WIN.w, WIN.y1 - WIN.y0);
  skyLight.position.set(WIN.x, (WIN.y0 + WIN.y1) / 2, BACK - 0.02);
  skyLight.lookAt(WIN.x, (WIN.y0 + WIN.y1) / 2, 0);
  scene.add(skyLight);
  // Ambiance : ciel neutre en haut, rebond clair du parquet en bas ; ce rebond éclaire
  // aussi le plafond, qui sinon paraissait presque noir.
  scene.add(new THREE.HemisphereLight(0xeef1f5, 0xb3a897, 0.8));
  // Ampoule nue au bout de son fil, au milieu du plafond : ombres franches comme une vraie
  // ampoule (rayon 0, sans bruit), carte recalculée seulement quand une boîte bouge.
  const BULB = new THREE.Vector3(0, RH - 0.55, (BACK + FRONT) / 2);
  const bulbLight = new THREE.PointLight(0xffd9a8, 6, 0, 2);
  bulbLight.position.copy(BULB);
  bulbLight.castShadow = true;
  bulbLight.shadow.mapSize.setScalar(2048);
  bulbLight.shadow.radius = 0;
  bulbLight.shadow.bias = -0.002;
  bulbLight.shadow.normalBias = 0;
  Object.assign(bulbLight.shadow.camera, { near: 0.08, far: 6 });
  bulbLight.shadow.autoUpdate = false;
  bulbLight.shadow.needsUpdate = true;
  scene.add(bulbLight);

  // --------------------------------------------------------------- pièce
  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x: number, y: number, z: number, shadows = true): THREE.Mesh => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = shadows;
    parent.add(mesh);
    return mesh;
  };
  const room = new THREE.Group();
  scene.add(room);
  // Parquet en chêne verni, lames de 1,2 m de motif.
  const floorW = 2 * RX + 2 * WALL;
  const floorD = FRONT - BACK + 2 * WALL;
  const floor = add(room, new THREE.BoxGeometry(floorW, 0.04, floorD), pbr(oak, { ru: floorW / 1.2, rv: floorD / 1.2, coat: 0.35, coatRoughness: 0.25, tint: 0xf2ece4, brightness: 1.0, dust: 0.04, normalScale: 1.4 }), 0, -0.02, (BACK + FRONT) / 2);
  floor.castShadow = false;
  // Murs en plâtre peint crème : chaque pan est une boîte épaisse qui arrête le soleil.
  const paint = (w: number, h: number) => pbr(plaster, { ru: w / 3, rv: h / 3, coat: 0, tint: 0xf1f1ee, brightness: 1.5, dust: 0, normalScale: 0.8 });
  const wallBox = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
    const w = x1 - x0; const h = y1 - y0; const d = z1 - z0;
    return add(room, new THREE.BoxGeometry(w, h, d), paint(Math.max(w, d), h), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  };
  const bz0 = BACK - WALL;
  wallBox(-RX - WALL, WIN.x - WIN.w / 2, 0, RH, bz0, BACK);
  wallBox(WIN.x + WIN.w / 2, RX + WALL, 0, RH, bz0, BACK);
  wallBox(WIN.x - WIN.w / 2, WIN.x + WIN.w / 2, 0, WIN.y0, bz0, BACK);
  wallBox(WIN.x - WIN.w / 2, WIN.x + WIN.w / 2, WIN.y1, RH, bz0, BACK);
  wallBox(-RX - WALL, -RX, 0, RH, bz0, FRONT + WALL);
  wallBox(RX, RX + WALL, 0, RH, bz0, FRONT + WALL);
  wallBox(-RX, RX, 0, RH, FRONT, FRONT + WALL);
  // Plafond peint en blanc, plus clair que les murs.
  const ceiling = wallBox(-RX - WALL, RX + WALL, RH, RH + 0.12, bz0, FRONT + WALL);
  ceiling.material = pbr(plaster, { ru: 1.4, rv: 1.2, coat: 0, tint: 0xffffff, brightness: 1.75, dust: 0, normalScale: 0.5 });
  // Plinthes peintes en blanc cassé.
  const trimPaint = keep(new THREE.MeshPhysicalMaterial({ color: 0xece6da, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4 }));
  const skirting = (w: number, d: number, x: number, z: number) => add(room, new RoundedBoxGeometry(w, 0.08, d, 2, 0.004), trimPaint, x, 0.04, z);
  skirting(WIN.x - WIN.w / 2 + RX, 0.016, (WIN.x - WIN.w / 2 - RX) / 2, BACK + 0.008);
  skirting(RX - WIN.x - WIN.w / 2, 0.016, (RX + WIN.x + WIN.w / 2) / 2, BACK + 0.008);
  skirting(WIN.w, 0.016, WIN.x, BACK + 0.008);
  skirting(0.016, FRONT - BACK, -RX + 0.008, (BACK + FRONT) / 2);
  skirting(0.016, FRONT - BACK, RX - 0.008, (BACK + FRONT) / 2);

  // --------------------------------------------------------------- fenêtre
  // Croisée à deux battants et petits bois, en retrait dans l'embrasure.
  const frameZ = BACK - WALL + 0.05;
  const winH = WIN.y1 - WIN.y0;
  const winY = (WIN.y0 + WIN.y1) / 2;
  const bar = (w: number, h: number, x: number, y: number, depth = 0.05) => add(room, new RoundedBoxGeometry(w, h, depth, 2, 0.006), trimPaint, x, y, frameZ);
  bar(WIN.w, 0.06, WIN.x, WIN.y1 - 0.03);
  bar(WIN.w, 0.06, WIN.x, WIN.y0 + 0.03);
  bar(0.06, winH, WIN.x - WIN.w / 2 + 0.03, winY);
  bar(0.06, winH, WIN.x + WIN.w / 2 - 0.03, winY);
  bar(0.07, winH - 0.1, WIN.x, winY, 0.055);
  for (const side of [-1, 1]) {
    const cx = WIN.x + side * WIN.w / 4;
    for (const k of [1, 2]) bar(WIN.w / 2 - 0.09, 0.025, cx, WIN.y0 + 0.06 + k * (winH - 0.12) / 3, 0.03);
  }
  const glass = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false }));
  add(room, new THREE.PlaneGeometry(WIN.w - 0.1, winH - 0.1), glass, WIN.x, winY, frameZ - 0.004, false);
  // Appui de fenêtre intérieur.
  add(room, new RoundedBoxGeometry(WIN.w + 0.12, 0.03, WALL + 0.06, 3, 0.008), trimPaint, WIN.x, WIN.y0 - 0.015, BACK - WALL / 2 + 0.03);
  // Dehors : ciel d'après-midi et collines au loin, assez lumineux pour fleurir légèrement.
  const outside = keep(new THREE.CanvasTexture(landscapeCanvas()));
  outside.colorSpace = THREE.SRGBColorSpace;
  const outsideMaterial = keep(new THREE.MeshBasicNodeMaterial());
  outsideMaterial.colorNode = texture(outside, uv()).rgb.mul(1.9);
  add(room, new THREE.PlaneGeometry(9, 4.5), outsideMaterial, WIN.x + 0.6, 1.4, BACK - 3.2, false);

  // Suspension : fil textile, douille en bakélite et ampoule allumée (elle n'arrête pas sa propre lumière).
  const cordMaterial = keep(new THREE.MeshStandardNodeMaterial({ color: 0x1c1a18, roughness: 0.8 }));
  add(room, new THREE.CylinderGeometry(0.004, 0.004, RH - BULB.y - 0.06, 8), cordMaterial, BULB.x, (RH + BULB.y + 0.06) / 2, BULB.z, false);
  add(room, new THREE.CylinderGeometry(0.035, 0.035, 0.015, 24), cordMaterial, BULB.x, RH - 0.0075, BULB.z, false);
  add(room, new THREE.CylinderGeometry(0.018, 0.02, 0.05, 20), keep(new THREE.MeshStandardNodeMaterial({ color: 0x2a2622, roughness: 0.45 })), BULB.x, BULB.y + 0.055, BULB.z, false);
  const bulbGlass = keep(new THREE.MeshStandardNodeMaterial({ color: 0xfff4e0, emissive: 0xffd9a8, emissiveIntensity: 6, roughness: 0.3 }));
  const bulb = add(room, new THREE.SphereGeometry(0.03, 24, 16), bulbGlass, BULB.x, BULB.y, BULB.z, false);
  bulb.scale.set(1, 1.25, 1);

  // --------------------------------------------------------------- bureau en hêtre
  // Hêtre clair verni, comme la chaise et l'étagère : des meubles blonds des années 90.
  const deskWood = (ru: number, rv: number, rotate = false, ox = 0) =>
    pbr(beech, { ru, rv, rotate, ox, oy: ox * 0.7, ...BEECH, coat: 0.45, coatRoughness: 0.22, dust: 0.1 });
  const desk = new THREE.Group();
  desk.position.set(DESK.x, 0, DESK.z);
  desk.userData.zone = 'desk';
  scene.add(desk);
  const { w: dw, d: dd, h: dh } = DESK;
  add(desk, new RoundedBoxGeometry(dw, 0.03, dd, 3, 0.006), deskWood(dw, dd), 0, dh - 0.015, 0);
  // Caisson à trois tiroirs à gauche, flanc plein à droite, voile de fond.
  const cw = 0.42;
  const cx = -dw / 2 + cw / 2 + 0.02;
  const carcass = dh - 0.03;
  for (const sx of [cx - cw / 2 + 0.01, cx + cw / 2 - 0.01]) add(desk, new RoundedBoxGeometry(0.02, carcass, dd - 0.04, 2, 0.003), deskWood(0.9, 0.4, true, sx), sx, carcass / 2, -0.01);
  add(desk, new RoundedBoxGeometry(0.03, carcass, dd - 0.04, 2, 0.004), deskWood(0.9, 0.4, true, 0.3), dw / 2 - 0.04, carcass / 2, -0.01);
  const spanL = cx + cw / 2;
  const spanR = dw / 2 - 0.055;
  add(desk, new RoundedBoxGeometry(spanR - spanL, 0.34, 0.015, 2, 0.003), deskWood(1.2, 0.5, false, 0.6), (spanL + spanR) / 2, dh - 0.03 - 0.17, -dd / 2 + 0.03);
  add(desk, new RoundedBoxGeometry(spanR - spanL, 0.06, 0.02, 2, 0.003), deskWood(1.3, 0.1, false, 0.2), (spanL + spanR) / 2, dh - 0.06, dd / 2 - 0.04);
  add(desk, new RoundedBoxGeometry(cw, 0.06, dd - 0.04, 2, 0.003), deskWood(0.6, 0.3, false, 0.9), cx, 0.03, -0.01);
  const knobMaterial = deskWood(0.2, 0.2, true, 0.4);
  const drawerH = (carcass - 0.08) / 3;
  for (let k = 0; k < 3; k += 1) {
    const y = 0.07 + drawerH * (k + 0.5);
    add(desk, new RoundedBoxGeometry(cw - 0.03, drawerH - 0.012, 0.022, 3, 0.005), deskWood(0.6, 0.3, false, k * 0.31), cx, y, dd / 2 - 0.03);
    const knob = add(desk, new THREE.LatheGeometry(knobProfile(), 24), knobMaterial, cx, y, dd / 2 - 0.019);
    knob.rotation.x = Math.PI / 2;
  }

  // Pile de magazines d'époque au coin droit du bureau, derrière le tapis de souris.
  const magazines = await magazinesLoad;
  magazines.position.set(0.5, dh, -0.15);
  magazines.rotation.y = -0.12;
  desk.add(magazines);

  // --------------------------------------------------------------- chaise paysanne
  const chair = new THREE.Group();
  chair.position.set(DESK.x + 0.18, 0, DESK.z + 0.62);
  chair.rotation.y = 0.32;
  chair.userData.zone = 'desk';
  scene.add(chair);
  buildChair(chair);

  // --------------------------------------------------------------- affiche
  const poster = await posterLoad;
  poster.position.set(POSTER.x, POSTER.y, BACK + 0.0005);
  poster.userData.zone = 'poster';
  scene.add(poster);

  // --------------------------------------------------------------- ordinateur
  const pc = await pcLoad;
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
  const wake = (ms = 1600) => { awakeUntil = Math.max(awakeUntil, performance.now() + ms); };
  const damp = (a: number, b: number, k: number, dt: number) => (reducedMotion ? b : a + (b - a) * (1 - Math.exp(-k * dt)));
  // Pose de la caméra à l'image précédente, pour savoir si elle bouge.
  const lastView = new THREE.Matrix4();
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
    if (Math.abs(sway.x - (zoomed >= 0 ? pointer.x : 0)) > 0.002) busy = true;
    // Autour du cube et de l'île, le glissé fait tourner la caméra.
    const orbiting = view === 'cube' || view === 'lego';
    if (orbiting) {
      orbitShown = damp(orbitShown, orbit, 8, dt);
      if (Math.abs(orbitShown - orbit) > 0.0005) busy = true; else orbitShown = orbit;
      if (progress >= 1) goal = goalPose();
    }
    // Caméra fixe : la souris ne la déplace pas (reflets et arêtes fines glissaient avec elle).
    camera.position.copy(current.position);
    gaze.yawShown = damp(gaze.yawShown, gaze.yaw, 10, dt);
    gaze.pitchShown = damp(gaze.pitchShown, gaze.pitch, 10, dt);
    if (Math.abs(gaze.yawShown - gaze.yaw) > 0.0005 || Math.abs(gaze.pitchShown - gaze.pitch) > 0.0005) busy = true;
    gazeAim.subVectors(current.target, camera.position).applyAxisAngle(THREE.Object3D.DEFAULT_UP, gaze.yawShown);
    gazeAim.applyAxisAngle(scratch.crossVectors(gazeAim, THREE.Object3D.DEFAULT_UP).normalize(), gaze.pitchShown);
    camera.lookAt(gazeAim.add(camera.position));
    camera.updateMatrixWorld();
    const moving = !lastView.equals(camera.matrixWorld);
    lastView.copy(camera.matrixWorld);
    if (camera.fov !== current.fov) { camera.fov = current.fov; camera.updateProjectionMatrix(); }

    if (model.update(dt, active, zoomed, zoomed >= 0 ? sway.x : 0, damp)) { busy = true; sun.shadow.needsUpdate = true; bulbLight.shadow.needsUpdate = true; }
    if (pc.update(performance.now())) busy = true;
    // Images du Photon virtuel reçues depuis le dernier rendu.
    const cubeChanged = cube.update(performance.now());
    if (busy || moving || performance.now() < awakeUntil || cubeChanged || options.continuous === true) {
      renderer.render(scene, camera);
      drawn += 1;
    }
  }

  resize();
  // Le premier rendu compile tous les shaders : c'est la dernière étape de la barre.
  renderer.render(scene, camera);
  report(4);
  wake(5000);
  renderer.setAnimationLoop(frame);

  // --------------------------------------------------------------- fabrication
  function buildChair(parent: THREE.Group): void {
    // Hêtre clair et ciré ; les pièces tournées suivent le fil du bois.
    const beechWood = (seed: number) => pbr(beech, { ru: 0.5, rv: 0.12, rotate: true, ox: seed * 0.23, oy: seed * 0.17, coat: 0.25, coatRoughness: 0.35, ...BEECH, dust: 0.05 });
    const seatY = 0.45;
    // Pieds avant tournés.
    for (const side of [-1, 1]) {
      add(parent, new THREE.LatheGeometry(legProfile(seatY), 28), beechWood(side + 2), side * 0.2, 0, -0.17);
    }
    // Pieds arrière prolongés en montants, légèrement inclinés vers l'arrière.
    const tilt = 0.09;
    const backTop = 0.97;
    for (const side of [-1, 1]) {
      const post = add(parent, new THREE.LatheGeometry(postProfile(backTop), 28), beechWood(side + 5), side * 0.165, 0, 0.17);
      post.rotation.x = tilt;
    }
    const backZ = (y: number) => 0.17 + Math.tan(tilt) * y;
    // Traverses rondes sous l'assise et barreaux bas.
    const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number, seed: number) => {
      const length = a.distanceTo(b);
      const mesh = add(parent, new THREE.CylinderGeometry(r, r, length, 18), beechWood(seed), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    };
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    rod(v(-0.2, seatY - 0.02, -0.17), v(0.2, seatY - 0.02, -0.17), 0.013, 1);
    rod(v(-0.165, seatY - 0.02, backZ(seatY - 0.02)), v(0.165, seatY - 0.02, backZ(seatY - 0.02)), 0.013, 2);
    for (const side of [-1, 1]) {
      rod(v(side * 0.2, seatY - 0.02, -0.17), v(side * 0.165, seatY - 0.02, backZ(seatY - 0.02)), 0.013, 3 + side);
      rod(v(side * 0.2, 0.16, -0.17), v(side * 0.165, 0.16, backZ(0.16)), 0.011, 6 + side);
      rod(v(side * 0.2, 0.27, -0.17), v(side * 0.165, 0.27, backZ(0.27)), 0.011, 8 + side);
    }
    rod(v(-0.2, 0.2, -0.17), v(0.2, 0.2, -0.17), 0.011, 11);
    rod(v(-0.165, 0.2, backZ(0.2)), v(0.165, 0.2, backZ(0.2)), 0.011, 12);
    // Dossier à trois barrettes cintrées.
    for (const [k, y] of [0.63, 0.75, 0.87].entries()) {
      const geometry = new THREE.BoxGeometry(0.33, 0.045, 0.012, 24, 1, 1);
      const position = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i += 1) position.setZ(i, position.getZ(i) + (position.getX(i) ** 2) * 0.35);
      geometry.computeVertexNormals();
      const slat = add(parent, geometry, beechWood(14 + k), 0, y, backZ(y) - 0.02);
      slat.rotation.x = tilt;
    }
    // Assise paillée : quatre triangles de cordes torsadées qui convergent au centre.
    const rushCanvas = rushSeatCanvas(1024);
    const rushMap = keep(new THREE.CanvasTexture(rushCanvas));
    rushMap.colorSpace = THREE.SRGBColorSpace;
    rushMap.anisotropy = maxAniso;
    const rushNormal = keep(printNormal(rushCanvas, 5, 0.04, 1024));
    for (const map of [rushMap, rushNormal]) { map.repeat.set(1 / 0.44, 1 / 0.38); map.offset.set(0.5, 0.5); }
    const seat = new THREE.Shape([v(-0.22, 0.19, 0), v(0.22, 0.19, 0), v(0.18, -0.19, 0), v(-0.18, -0.19, 0)].map((p) => new THREE.Vector2(p.x, p.y)));
    const seatGeometry = new THREE.ExtrudeGeometry(seat, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4 });
    seatGeometry.rotateX(-Math.PI / 2);
    add(parent, seatGeometry, keep(new THREE.MeshPhysicalMaterial({ map: rushMap, normalMap: rushNormal, normalScale: new THREE.Vector2(1, 1), roughness: 0.78, sheen: 0.4, sheenColor: new THREE.Color(0xffe6a8) })), 0, seatY - 0.012, 0.0);
  }

  // --------------------------------------------------------------- contrôleur
  const raycaster = new THREE.Raycaster();
  const islandHit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  const zoneOf = (object: THREE.Object3D | null): RoomZone | null => {
    for (let node = object; node !== null; node = node.parent) {
      const zone = node.userData.zone as RoomZone | undefined;
      if (zone !== undefined) return zone;
    }
    return null;
  };
  return {
    gpu,
    frames: () => drawn,
    setView(next) {
      if (next === view) return;
      view = next;
      if (view !== 'shelf') { active = -1; zoomed = -1; }
      if (view === 'cube' || view === 'lego') { orbit = 0; orbitShown = 0; }
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
      gaze.yaw = Math.max(-0.75, Math.min(0.75, gaze.yaw + yaw));
      gaze.pitch = Math.max(-0.35, Math.min(0.35, gaze.pitch + pitch));
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
      const hit = item ?? raycaster.intersectObjects([pc.group, desk, chair, rack, cube.group, model.group, poster, room], true)[0];
      const index = hit?.object.userData.index;
      return { zone: zoneOf(hit?.object ?? null), index: typeof index === 'number' ? index : -1 };
    },
    screenRect() {
      if (view !== 'screen' || progress < 1) return null;
      const rect = canvas.getBoundingClientRect();
      const points = pc.screenCorners().map((corner) => corner.project(camera));
      const xs = points.map((p) => (p.x + 1) / 2 * rect.width);
      const ys = points.map((p) => (1 - p.y) / 2 * rect.height);
      const left = Math.min(...xs); const top = Math.min(...ys);
      return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
    },
    setPower(state) { pc.setPower(state); wake(); },
    setScreen(phase) { pc.setScreen(phase); wake(); },
    pressPower() { pc.pressPower(); wake(600); },
    resize,
    setRunning(next) {
      if (next === running) return;
      running = next;
      renderer.setAnimationLoop(next ? frame : null);
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

// ============================================================================
// Profils tournés et matières dessinées
// ============================================================================

// Pied avant : sabot, fût galbé, bague, puis tenon sous l'assise.
function legProfile(height: number): THREE.Vector2[] {
  const p = (r: number, y: number) => new THREE.Vector2(r, y);
  return [p(0.001, 0), p(0.017, 0), p(0.019, 0.01), p(0.016, 0.04), p(0.015, 0.12), p(0.018, 0.2), p(0.02, 0.3),
    p(0.024, 0.33), p(0.02, 0.345), p(0.021, 0.4), p(0.019, height - 0.01), p(0.001, height)];
}

// Montant arrière : comme le pied avant, prolongé jusqu'au chapeau du dossier.
function postProfile(height: number): THREE.Vector2[] {
  const p = (r: number, y: number) => new THREE.Vector2(r, y);
  return [p(0.001, 0), p(0.017, 0), p(0.019, 0.01), p(0.016, 0.04), p(0.016, 0.3), p(0.02, 0.33), p(0.017, 0.345),
    p(0.016, 0.6), p(0.017, height - 0.06), p(0.021, height - 0.04), p(0.016, height - 0.02), p(0.012, height - 0.004), p(0.001, height)];
}

// Bouton de tiroir tourné, posé sur l'axe y.
function knobProfile(): THREE.Vector2[] {
  const p = (r: number, y: number) => new THREE.Vector2(r, y);
  return [p(0.001, 0), p(0.009, 0), p(0.006, 0.008), p(0.007, 0.014), p(0.015, 0.02), p(0.016, 0.026), p(0.012, 0.032), p(0.001, 0.034)];
}

// ----------------------------------------------------------------------------
// Paille tressée vue de dessus : quatre triangles de cordes parallèles à chaque bord,
// avec torsades, teintes de paille et joints sombres. Retour : toile carrée.
// ----------------------------------------------------------------------------
function rushSeatCanvas(size: number): HTMLCanvasElement {
  const [canvas, context] = canvas2d(size, size);
  const rand = seeded(41);
  const half = size / 2;
  const step = size / 64;
  const tones = ['#c9a35a', '#b98f47', '#d4b06a', '#a87f3c', '#c29a50'];
  for (let side = 0; side < 4; side += 1) {
    context.save();
    context.translate(half, half);
    context.rotate((side * Math.PI) / 2);
    context.translate(-half, -half);
    // Triangle du bord haut : du coin gauche au coin droit, pointe au centre.
    context.beginPath();
    context.moveTo(0, 0); context.lineTo(size, 0); context.lineTo(half, half); context.closePath();
    context.clip();
    context.fillStyle = '#5a4120';
    context.fillRect(0, 0, size, half);
    for (let y = 0; y < half; y += step) {
      context.fillStyle = tones[Math.floor(rand() * tones.length)] ?? '#c9a35a';
      context.fillRect(0, y + step * 0.08, size, step * 0.84);
      // Torsades : courts traits obliques plus sombres et reflets.
      for (let x = 0; x < size; x += step * 0.9) {
        context.globalAlpha = 0.35 + rand() * 0.25;
        context.strokeStyle = '#6e5026';
        context.lineWidth = step * 0.12;
        context.beginPath(); context.moveTo(x, y + step * 0.1); context.lineTo(x + step * 0.5, y + step * 0.9); context.stroke();
        context.globalAlpha = 0.25;
        context.strokeStyle = '#f2dc9a';
        context.lineWidth = step * 0.08;
        context.beginPath(); context.moveTo(x + step * 0.3, y + step * 0.15); context.lineTo(x + step * 0.7, y + step * 0.8); context.stroke();
      }
      context.globalAlpha = 1;
    }
    context.restore();
  }
  // Diagonales : les cordes se croisent et laissent un sillon sombre.
  context.strokeStyle = 'rgba(60,40,16,0.7)';
  context.lineWidth = step * 0.25;
  context.beginPath(); context.moveTo(0, 0); context.lineTo(size, size); context.moveTo(size, 0); context.lineTo(0, size); context.stroke();
  return canvas;
}

// Ciel d'après-midi, collines et bosquets flous, vus par la fenêtre.
function landscapeCanvas(): HTMLCanvasElement {
  const [canvas, context] = canvas2d(1024, 512);
  const sky = context.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#7fa9d8'); sky.addColorStop(0.55, '#cfe0ee'); sky.addColorStop(0.72, '#f3eee2'); sky.addColorStop(1, '#f3eee2');
  context.fillStyle = sky;
  context.fillRect(0, 0, 1024, 512);
  const rand = seeded(5);
  context.filter = 'blur(6px)';
  for (let i = 0; i < 14; i += 1) {
    context.globalAlpha = 0.5;
    context.fillStyle = '#ffffff';
    context.beginPath(); context.ellipse(rand() * 1024, 40 + rand() * 160, 60 + rand() * 120, 14 + rand() * 20, 0, 0, Math.PI * 2); context.fill();
  }
  context.globalAlpha = 1;
  context.filter = 'blur(3px)';
  context.fillStyle = '#8fa98a';
  context.beginPath(); context.moveTo(0, 360);
  for (let x = 0; x <= 1024; x += 32) context.lineTo(x, 340 + Math.sin(x * 0.006) * 24 + Math.sin(x * 0.021) * 8);
  context.lineTo(1024, 512); context.lineTo(0, 512); context.fill();
  context.fillStyle = '#5f7f55';
  for (let i = 0; i < 30; i += 1) {
    const x = rand() * 1024; const r = 18 + rand() * 30;
    context.beginPath(); context.arc(x, 372 + rand() * 30 - r * 0.3, r, 0, Math.PI * 2); context.fill();
  }
  context.fillStyle = '#6f8c5e';
  context.fillRect(0, 400, 1024, 112);
  context.filter = 'none';
  return canvas;
}
