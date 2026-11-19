// ============================================================================
// ShelfModel — Meuble en noyer et objets d'époque, prêts à poser dans une scène
// ----------------------------------------------------------------------------
// Construit le meuble mouluré, les boîtes aux vraies jaquettes, les écrans vidéo et
// les plaques en laiton dans un groupe. Le groupe a pour origine le dessus de la
// tablette du milieu, au centre ; l'avant du meuble regarde vers +z. La scène qui
// l'accueille choisit la caméra, la lumière et l'objet actif.
// ============================================================================
import * as THREE from 'three/webgpu';
import { float, texture, uv } from 'three/tsl';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { layoutShelf, type ShelfBox, type ShelfObject } from './shelf-items.ts';
import {
  bullnose, composeBack, cornice, loadImage, plaqueTextures, printNormal, release, shrink, spineCanvas, woodNodeMaterial, worn,
  type PbrSet, type WoodOptions,
} from './shelf-materials.ts';

// Objet tel que la scène le reçoit : textes déjà localisés, médias déjà résolus.
export type ShelfSceneItem = {
  id: string;
  name: string;
  meta: string;
  object: ShelfObject;
  poster: string;
  video?: string;
  crossOrigin?: 'anonymous';
};

// Ressources communes fournies par la scène hôte.
export type ShelfEnv = {
  keep: <V extends { dispose(): void }>(value: V) => V;
  // Préfixe des jaquettes servies sous /shelf/, base de déploiement incluse.
  assetBase: string;
  // Préréglage léger : jaquettes réduites, pas de relief de vernis.
  lite: boolean;
  maxAniso: number;
  // Essence du meuble et réglages de teinte (noyer verni par défaut).
  wood: PbrSet;
  woodLook?: Pick<WoodOptions, 'tint' | 'brightness' | 'normalScale' | 'coat'>;
  dustTex: THREE.Texture;
  smudgeTex: THREE.Texture;
  // Appelé après chaque objet construit, pour une barre de chargement.
  onItem?: () => void;
};

// Dimensions du meuble en mètres : profondeur, hauteur d'un casier, épaisseur.
export const SHELF_DEPTH = 0.34;
export const SHELF_BAY = 0.44;
export const SHELF_BOARD = 0.03;
// Bas des montants, sous la tablette basse : utile pour poser ou accrocher le meuble.
export const SHELF_BOTTOM = -SHELF_BAY - SHELF_BOARD - 0.07;
export const SHELF_TOP = SHELF_BAY + SHELF_BOARD + 0.042;
// Largeur utile d'un écran 16:9, en mètres.
const SCREEN_WIDTH = 0.4;
const D = SHELF_DEPTH;
const H = SHELF_BAY;
const T = SHELF_BOARD;

type TVScreen = { group: THREE.Group; spill: THREE.PointLight; video?: HTMLVideoElement; playing: boolean; draw(): void; showPoster(): void };

export type PlacedItem = {
  root: THREE.Group;
  rest: { x: number; z: number; ry: number };
  isTV: boolean;
  tv?: TVScreen;
  // Plaque en laiton sous l'objet, absente quand le meuble est fourni par la scène.
  plaque?: THREE.Mesh;
  plaqueMaterial?: THREE.MeshPhysicalMaterial;
};

export type ShelfModel = {
  group: THREE.Group;
  placed: PlacedItem[];
  slots: number[];
  // Anime les objets vers leur pose ; spin fait pivoter l'objet zoomé. Retour : vrai tant que ça bouge.
  update(dt: number, active: number, zoomed: number, spin: number, damp: (a: number, b: number, k: number, dt: number) => number): boolean;
  playVideo(index: number, reducedMotion: boolean): Promise<boolean>;
  stopVideo(index: number): void;
  // Objets que le rayon de sélection doit tester (objets et plaques).
  pickTargets(): THREE.Object3D[];
  disposeVideos(): void;
};

// ----------------------------------------------------------------------------
// Construit le meuble et ses objets. width est la largeur intérieure, en mètres.
// Effets de bord : crée des éléments vidéo hors DOM pour les écrans.
// ----------------------------------------------------------------------------
// options.furniture : faux pour ne poser que les objets (la scène fournit son propre meuble).
// options.plaques : faux pour ne pas visser de plaque en laiton sous chaque objet.
export type ShelfModelOptions = { furniture?: boolean; plaques?: boolean };

export async function buildShelfModel(env: ShelfEnv, items: readonly ShelfSceneItem[], width = 2.0, options: ShelfModelOptions = {}): Promise<ShelfModel> {
  const { keep, assetBase, lite, maxAniso, wood: woodSet, woodLook, dustTex, smudgeTex } = env;
  const W = width;
  const group = new THREE.Group();
  const wood = (ru: number, rv: number, rotate = false, coat = 0.3, ox = 0, oy = 0) =>
    keep(woodNodeMaterial(woodSet, dustTex, { ru, rv, rotate, coat, ox, oy, ...woodLook, ...(woodLook?.coat === undefined ? {} : { coat: Math.min(coat, woodLook.coat) }) }));

  // --------------------------------------------------------------- meuble
  if (options.furniture !== false) {
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(keep(geometry), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const board = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, radius = 0.006) =>
      add(new RoundedBoxGeometry(w, h, d, 4, radius), material, x, y, z);
    const molding = (profile: THREE.Shape, length: number, material: THREE.Material, x: number, y: number, z: number) => {
      const geometry = new THREE.ExtrudeGeometry(profile, { depth: length, bevelEnabled: false, curveSegments: 18 });
      geometry.rotateY(-Math.PI / 2);
      geometry.translate(length / 2, 0, 0);
      geometry.computeVertexNormals();
      return add(geometry, material, x, y, z);
    };
    const shelfWood = (seed: number) => wood(0.6 * W / 2, 2.4, true, 0.22, seed * 0.37, seed * 0.11);
    const lowY = -H - T / 2 - 0.03;
    for (const [seed, y] of [[1, -T / 2], [2, lowY]] as const) {
      board(W, T, D - 0.012, shelfWood(seed), 0, y, -0.006, 0.004);
      molding(bullnose(T, 0.016), W, shelfWood(seed + 3), 0, y - T / 2, D / 2 - 0.012);
    }
    board(W + 2 * T + 0.02, T, D + 0.01, shelfWood(7), 0, H + T / 2, 0.005, 0.004);
    molding(cornice(), W + 2 * T + 0.07, shelfWood(8), 0, H + T, D / 2 + 0.005);
    // Montants : du dessus jusque sous la tablette basse.
    const sideTop = H + T;
    const sideH = sideTop - SHELF_BOTTOM;
    for (const side of [-1, 1]) {
      board(T, sideH, D, wood(0.3, 1.2, false, 0.15, side * 0.2), side * (W / 2 + T / 2), SHELF_BOTTOM + sideH / 2, 0, 0.004);
      board(0.05, sideH + 0.02, 0.022, wood(0.12, 1.4, false, 0.18, side * 0.31, 0.2), side * (W / 2 + T / 2 - 0.004), SHELF_BOTTOM + sideH / 2, D / 2 + 0.006, 0.006);
    }
    // Bandeau sous la tablette basse.
    board(W, 0.04, 0.02, wood(1.4 * W / 2, 0.12, true, 0.15, 0.5), 0, lowY - T / 2 - 0.02, D / 2 - 0.03, 0.004);
    // Fond en lames verticales à rainures en V, chacune avec son veinage.
    const slats = Math.max(4, Math.round(17 * W / 2));
    const backH = H + T - (lowY - T / 2) + 0.01;
    for (let i = 0; i < slats; i += 1) {
      const lw = W / slats;
      board(lw - 0.003, backH, 0.012, wood(0.18, 1.2, false, 0.1, (i * 0.618) % 1, (i * 0.37) % 1),
        -W / 2 + lw * (i + 0.5), lowY - T / 2 + backH / 2 - 0.005, -D / 2 - 0.006 + ((i * 7) % 3) * 0.0006, 0.0025);
    }

  }

  // --------------------------------------------------------------- objets
  const widths = items.map((item) => (item.object.kind === 'tv' ? SCREEN_WIDTH + 0.014 : item.object.size[0]));
  const slots = layoutShelf(widths, W);
  const placed: PlacedItem[] = [];
  for (const [index, item] of items.entries()) {
    const root = new THREE.Group();
    const isTV = item.object.kind === 'tv';
    let tv: TVScreen | undefined;
    if (item.object.kind === 'tv') {
      tv = await makeScreen(item);
      root.add(tv.group);
    } else {
      root.add(await makeBox(item.object, index));
    }
    const restRy = isTV ? (index % 2 === 0 ? 0.05 : -0.06) : [-0.03, 0.025, -0.05][index % 3] ?? 0;
    const restZ = isTV ? -0.04 : -0.03;
    root.position.set(slots[index] ?? 0, 0, restZ);
    root.rotation.y = restRy;
    root.traverse((node) => { node.userData.index = index; });
    group.add(root);
    const plaque = options.plaques === false ? undefined : makePlaque(item, index, slots[index] ?? 0);
    placed.push({ root, rest: { x: slots[index] ?? 0, z: restZ, ry: restRy }, isTV, tv, plaque: plaque?.plaque, plaqueMaterial: plaque?.material });
    env.onItem?.();
  }

  // --------------------------------------------------------------- fabrication
  async function makeBox(box: ShelfBox, index: number): Promise<THREE.Mesh> {
    const [w, h, d] = box.size;
    // En préréglage léger, la face avant suffit en 1024 px et le dos, jamais tourné vers l'utilisateur, en 512 px.
    const frontImage = shrink(await loadImage(`${assetBase}${box.front}`), lite ? 1024 : Infinity);
    const backImage = shrink(typeof box.back === 'string' ? await loadImage(`${assetBase}${box.back}`) : await composeBack(box.back, assetBase), lite ? 512 : Infinity);
    const spineImage = shrink(typeof box.spine === 'string' ? await loadImage(`${assetBase}${box.spine}`) : spineCanvas(box.spine), lite ? 768 : Infinity);
    const coat = box.kind === 'case' ? 0.45 : 0.2;
    // Albédo calibré : un papier blanc renvoie environ 80 % de la lumière.
    const paper = (source: CanvasImageSource & { width: number; height: number }, seed: number) => keep(new THREE.MeshPhysicalMaterial({
      map: keep(worn(source, seed)), color: 0xe6e6e6, normalMap: keep(printNormal(source)), normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.46, clearcoat: coat, clearcoatRoughness: 0.22,
      ...(lite ? {} : { clearcoatNormalMap: keep(printNormal(source, 1.2, 0.02, 700)), clearcoatNormalScale: new THREE.Vector2(0.3, 0.3) }),
    }));
    const front = paper(frontImage, 7 + index);
    const back = paper(backImage, 13 + index);
    const spine = paper(spineImage, 21 + index);
    release(frontImage, backImage, spineImage);
    const mesh = new THREE.Mesh(keep(new RoundedBoxGeometry(w, h, d, 3, box.kind === 'case' ? 0.003 : 0.0035)), [spine, spine, spine, spine, front, back]);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.y = h / 2;
    return mesh;
  }

  async function makeScreen(item: ShelfSceneItem): Promise<TVScreen> {
    const tvGroup = new THREE.Group();
    const shell = keep(new THREE.MeshPhysicalMaterial({ color: 0x111215, roughness: 0.38, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
    const aluminium = keep(new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.32, metalness: 0.9 }));
    const sh = SCREEN_WIDTH * 9 / 16;
    // L'écran est une toile 2D : l'affiche, puis les images de la vidéo, sous une vitre.
    const screenCanvas = Object.assign(document.createElement('canvas'), { width: 640, height: 360 });
    const screenContext = screenCanvas.getContext('2d');
    if (screenContext === null) throw new Error('Canvas 2D indisponible pour l’écran.');
    screenContext.fillStyle = '#050506';
    screenContext.fillRect(0, 0, 640, 360);
    const screenTexture = keep(new THREE.CanvasTexture(screenCanvas));
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    const glass = keep(new THREE.MeshPhysicalNodeMaterial({
      color: 0x020203, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
      emissive: 0xffffff, emissiveMap: screenTexture, emissiveIntensity: 1.15,
    }));
    // Traces de doigts sur la dalle : le reflet se brouille par endroits.
    glass.roughnessNode = float(0.04).add(texture(smudgeTex, uv().mul(1.3)).r.mul(0.3));
    const body = new THREE.Mesh(keep(new RoundedBoxGeometry(SCREEN_WIDTH + 0.014, sh + 0.014, 0.022, 3, 0.003)), shell);
    const screen = new THREE.Mesh(keep(new THREE.PlaneGeometry(SCREEN_WIDTH, sh)), glass);
    screen.position.z = 0.0112;
    const neck = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.008, 0.01, 0.05, 24)), aluminium);
    neck.position.set(0, -sh / 2 - 0.025, -0.004);
    const foot = new THREE.Mesh(keep(new RoundedBoxGeometry(0.16, 0.006, 0.075, 2, 0.002)), aluminium);
    foot.position.y = -sh / 2 - 0.05;
    for (const mesh of [body, neck, foot]) mesh.castShadow = mesh.receiveShadow = true;
    const inner = new THREE.Group();
    inner.add(body, screen, neck, foot);
    inner.position.y = sh / 2 + 0.053;
    tvGroup.add(inner);
    // La lumière de l'écran déborde sur le bois, teintée par l'image affichée.
    const spill = new THREE.PointLight(0xffffff, 0.12, 0.9, 2);
    spill.position.set(0, inner.position.y, 0.08);
    tvGroup.add(spill);
    const probe = Object.assign(document.createElement('canvas'), { width: 4, height: 4 }).getContext('2d', { willReadFrequently: true });
    const poster = await loadImage(item.poster, item.crossOrigin).catch(() => null);
    let frameCount = 0;
    const sampleSpill = () => {
      if (probe === null) return;
      try {
        probe.drawImage(screenCanvas, 0, 0, 4, 4);
        const data = probe.getImageData(0, 0, 4, 4).data;
        let r = 0; let g = 0; let b = 0;
        for (let k = 0; k < 64; k += 4) { r += data[k] ?? 0; g += data[k + 1] ?? 0; b += data[k + 2] ?? 0; }
        spill.color.setRGB(r / 4080, g / 4080, b / 4080, THREE.SRGBColorSpace);
      } catch {
        // Image non lisible (CORS refusé) : la lumière reste blanche.
      }
    };
    const tv: TVScreen = {
      group: tvGroup, spill, playing: false,
      showPoster() {
        if (poster !== null) screenContext.drawImage(poster, 0, 0, 640, 360);
        screenTexture.needsUpdate = true;
        sampleSpill();
      },
      draw() {
        const video = tv.video;
        if (video === undefined || video.readyState < 2) return;
        screenContext.drawImage(video, 0, 0, 640, 360);
        screenTexture.needsUpdate = true;
        frameCount += 1;
        if (frameCount % 4 === 0) sampleSpill();
      },
    };
    if (item.video !== undefined) {
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'none';
      if (item.crossOrigin !== undefined) video.crossOrigin = item.crossOrigin;
      video.src = item.video;
      tv.video = video;
    }
    tv.showPoster();
    return tv;
  }

  // Plaque en laiton gravé, vissée sur le chant de la tablette sous l'objet.
  function makePlaque(item: ShelfSceneItem, index: number, x: number): { plaque: THREE.Mesh; material: THREE.MeshPhysicalMaterial } {
    const { map, normal } = plaqueTextures(item.name, item.meta, maxAniso);
    keep(map); keep(normal);
    const material = keep(new THREE.MeshPhysicalMaterial({
      map, normalMap: normal, normalScale: new THREE.Vector2(0.8, 0.8), metalness: 0.85, roughness: 0.42,
      clearcoat: 0.4, clearcoatRoughness: 0.2, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0,
    }));
    const plaque = new THREE.Mesh(keep(new RoundedBoxGeometry(0.16, 0.026, 0.002, 2, 0.0008)), material);
    plaque.position.set(x, -T / 2, D / 2 + 0.0052);
    plaque.castShadow = plaque.receiveShadow = true;
    plaque.userData.index = index;
    const screwMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xb08a3c, metalness: 1, roughness: 0.35 }));
    for (const side of [-1, 1]) {
      const screw = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0012, 16)), screwMaterial);
      screw.rotation.set(Math.PI / 2, 0.6 * side, 0);
      screw.position.set(side * 0.073, 0, 0.0012);
      screw.userData.index = index;
      plaque.add(screw);
    }
    group.add(plaque);
    return { plaque, material };
  }

  return {
    group, placed, slots,
    update(dt, active, zoomed, spin, damp) {
      let busy = false;
      placed.forEach((item, index) => {
        const on = index === active;
        const { root } = item;
        // L'objet actif sort de l'étagère ; zoomé, il pivote avec la souris.
        const turn = index === zoomed ? spin : 0;
        const goalZ = on ? item.rest.z + (item.isTV ? 0.1 : 0.17) : item.rest.z;
        const goalY = on ? (item.isTV ? 0.006 : 0.02) : 0;
        const goalRy = on ? (item.isTV ? turn * 0.5 : index === zoomed ? turn * 1.3 : -0.5) : item.rest.ry;
        root.position.z = damp(root.position.z, goalZ, 7, dt);
        root.position.y = damp(root.position.y, goalY, 7, dt);
        root.rotation.y = damp(root.rotation.y, goalRy, 5, dt);
        root.rotation.x = damp(root.rotation.x, on && !item.isTV ? -0.04 : 0, 5, dt);
        if (Math.abs(root.position.z - goalZ) > 0.0005 || Math.abs(root.rotation.y - goalRy) > 0.0005) busy = true;
        if (item.tv !== undefined) {
          if (item.tv.playing) { item.tv.draw(); busy = true; }
          item.tv.spill.intensity = damp(item.tv.spill.intensity, on ? 0.5 : 0.12, 4, dt);
        }
        if (item.plaqueMaterial !== undefined) item.plaqueMaterial.emissiveIntensity = damp(item.plaqueMaterial.emissiveIntensity, on ? 0.12 : 0, 6, dt);
      });
      return busy;
    },
    async playVideo(index, reducedMotion) {
      const tv = placed[index]?.tv;
      if (tv?.video === undefined || reducedMotion) return false;
      tv.playing = true;
      try {
        await tv.video.play();
        return true;
      } catch {
        tv.playing = false;
        return false;
      }
    },
    stopVideo(index) {
      const tv = placed[index]?.tv;
      if (tv === undefined || !tv.playing) return;
      tv.playing = false;
      tv.video?.pause();
      tv.showPoster();
    },
    pickTargets() {
      return [...placed.map((item) => item.root), ...placed.flatMap((item) => (item.plaque === undefined ? [] : [item.plaque]))];
    },
    disposeVideos() {
      for (const item of placed) {
        item.tv?.video?.pause();
        item.tv?.video?.removeAttribute('src');
        item.tv?.video?.load();
      }
    },
  };
}
