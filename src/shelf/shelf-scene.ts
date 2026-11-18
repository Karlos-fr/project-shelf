// ============================================================================
// ShelfScene — Rendu temps réel de l'étagère en noyer et de ses objets d'époque
// ----------------------------------------------------------------------------
// Ce module client construit la scène Three.js (WebGPU, repli WebGL 2 identique) :
// meuble mouluré, boîtes aux vraies jaquettes, écrans vidéo, soleil par une fenêtre
// hors champ et pipeline façon moteur de jeu (SSGI, SSR, ombres de contact, rayons,
// TRAA, netteté). Il ne lit pas le DOM hors du canvas fourni et ne gère ni URL ni
// focus : le composant React pilote l'objet actif, le zoom et la lecture vidéo.
// ============================================================================
import * as THREE from 'three/webgpu';
import {
  builtinShadowContext, color, convertToTexture, diffuseColor, float, materialColor, materialRoughness, metalness, mix, mrt,
  normalView, normalWorld, output, packNormalToRGB, pass, roughness, sample, screenUV, smoothstep, texture, unpackRGBToNormal,
  uniform, uv, vec2, vec3, vec4, velocity,
} from 'three/tsl';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { sss } from 'three/addons/tsl/display/SSSNode.js';
import { godrays } from 'three/addons/tsl/display/GodraysNode.js';
import { bilateralBlur } from 'three/addons/tsl/display/BilateralBlurNode.js';
import { depthAwareBlend } from 'three/addons/tsl/display/depthAwareBlend.js';
import { sharpen } from 'three/addons/tsl/display/SharpenNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';
import { layoutShelf, type ShelfBox, type ShelfObject, type ShelfSpine } from './shelf-items.ts';

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

export type ShelfSceneOptions = {
  canvas: HTMLCanvasElement;
  items: readonly ShelfSceneItem[];
  // Préfixe des fichiers de /shelf/ (jaquettes, placage, HDRI), base de déploiement incluse.
  assetBase: string;
  // Téléphone ou petit écran : effets coûteux désactivés, comme un préréglage graphique.
  small: boolean;
  reducedMotion: boolean;
  forceWebGL?: boolean;
};

export type ShelfScene = {
  backend: 'webgpu' | 'webgl';
  setActive(index: number): void;
  setZoom(index: number): void;
  // Position horizontale du pointeur dans [-1, 1] ; fait pivoter l'objet zoomé.
  setPointer(x: number): void;
  playVideo(index: number): Promise<boolean>;
  stopVideo(index: number): void;
  pick(clientX: number, clientY: number): number;
  resize(): void;
  setRunning(running: boolean): void;
  dispose(): void;
};

// Dimensions intérieures du meuble en mètres : largeur, profondeur, hauteur, épaisseur.
const W = 2.0;
const D = 0.34;
const H = 0.44;
const T = 0.03;
// Diagonale utile d'un écran 16:9, en mètres.
const SCREEN_WIDTH = 0.4;

// ----------------------------------------------------------------------------
// Crée la scène, charge tous les médias puis démarre la boucle de rendu.
// Paramètres : options décrit le canvas, les objets et le préréglage graphique.
// Retour : contrôleur de scène ; rejette si aucun moteur graphique n'est disponible.
// Effets de bord : crée des éléments vidéo hors DOM et une boucle d'animation.
// ----------------------------------------------------------------------------
export async function createShelfScene(options: ShelfSceneOptions): Promise<ShelfScene> {
  const { canvas, items, assetBase, small, reducedMotion } = options;
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, forceWebGL: options.forceWebGL === true });
  await renderer.init();
  const backend: 'webgpu' | 'webgl' = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true ? 'webgpu' : 'webgl';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // Courbe Neutral : couleurs fidèles des jaquettes, hautes lumières adoucies.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const maxAniso = renderer.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0b0d);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 30);
  const loader = new THREE.TextureLoader();
  const disposables: { dispose(): void }[] = [];
  const keep = <V extends { dispose(): void }>(value: V): V => { disposables.push(value); return value; };
  await document.fonts.load('900 64px "Mona Sans Variable"').catch(() => undefined);

  // --------------------------------------------------------------- éclairage
  // HDRI d'un vrai salon (Poly Haven, CC0) pour les reflets et la lumière ambiante.
  const hdr = keep(await new HDRLoader().loadAsync(`${assetBase}room.hdr`));
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr;
  scene.environmentIntensity = 1;
  scene.environmentRotation = new THREE.Euler(0, 1.2, 0);
  // Soleil blanc par une fenêtre hors champ : lumière principale, ombres douces et rayons.
  const sun = new THREE.DirectionalLight(0xffffff, 3.4);
  sun.position.set(-2.9, 1.15, 1.7);
  sun.target.position.set(0.05, 0.18, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.008;
  sun.shadow.radius = 7;
  sun.shadow.intensity = 0.7;
  Object.assign(sun.shadow.camera, { left: -1.7, right: 1.7, top: 1.3, bottom: -1.3, near: 0.3, far: 7 });
  scene.add(sun, sun.target);
  // L'encadrement de fenêtre n'existe que dans l'ombre (calque 1) : il borne le faisceau sur le mur.
  {
    const frame = new THREE.Shape([new THREE.Vector2(-3, -3), new THREE.Vector2(3, -3), new THREE.Vector2(3, 3), new THREE.Vector2(-3, 3)]);
    frame.holes.push(new THREE.Path([new THREE.Vector2(-1.1, -1), new THREE.Vector2(1.1, -1), new THREE.Vector2(1.1, 1), new THREE.Vector2(-1.1, 1)]));
    const win = new THREE.Mesh(keep(new THREE.ShapeGeometry(frame)), keep(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
    const toSun = sun.position.clone().sub(sun.target.position).normalize();
    win.position.copy(sun.target.position).addScaledVector(toSun, 1.6);
    win.lookAt(sun.position);
    win.castShadow = true;
    win.layers.set(1);
    sun.shadow.camera.layers.enable(1);
    scene.add(win);
  }
  // Lampe d'accent sans ombre qui suit l'objet sorti.
  const lamp = new THREE.SpotLight(0xffffff, 1.5, 5, 0.45, 0.9, 1.6);
  lamp.position.set(-0.6, 1.4, 1.5);
  lamp.target.position.set(0, 0.15, 0);
  scene.add(lamp, lamp.target);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.3);
  rim.position.set(2, 1.2, -1);
  scene.add(rim);

  // --------------------------------------------------------------- matières
  const dustTex = keep(blotchTexture(1024, 17, 140, 9000));
  const smudgeTex = keep(blotchTexture(512, 29, 60, 0));
  const woodSrc = await Promise.all(['wood_diff', 'wood_nor', 'wood_arm'].map((name) => loader.loadAsync(`${assetBase}${name}.jpg`)));
  woodSrc.forEach((t) => keep(t));
  // Placage de noyer verni (Poly Haven, CC0) ; chaque pièce décale son veinage.
  function woodMaterial(ru: number, rv: number, rotate = false, coat = 0.3, ox = 0, oy = 0): THREE.MeshPhysicalNodeMaterial {
    const [map, normalMap, arm] = woodSrc.map((source) => {
      const t = keep(source.clone());
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(ru, rv);
      t.offset.set(ox, oy);
      if (rotate) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
      t.anisotropy = maxAniso;
      t.needsUpdate = true;
      return t;
    }) as [THREE.Texture, THREE.Texture, THREE.Texture];
    map.colorSpace = THREE.SRGBColorSpace;
    const material = keep(new THREE.MeshPhysicalNodeMaterial({
      map, normalMap, normalScale: new THREE.Vector2(2.2, 2.2), roughnessMap: arm, aoMap: arm, roughness: 1, metalness: 0,
      clearcoat: coat, clearcoatRoughness: 0.32, specularIntensity: 0.5, color: 0xd2c8c0,
    }));
    // Une fine poussière se dépose sur les faces tournées vers le haut et mate le vernis.
    const dust = normalWorld.y.smoothstep(0.7, 1).mul(texture(dustTex, uv().mul(vec2(5, 1.4))).r.smoothstep(0.15, 0.9)).mul(0.32);
    material.colorNode = mix(materialColor, color(0x9a9186), dust);
    material.roughnessNode = mix(materialRoughness, float(0.95), dust);
    return material;
  }

  // --------------------------------------------------------------- meuble
  const shelf = new THREE.Group();
  scene.add(shelf);
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    shelf.add(mesh);
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
  const shelfWood = (seed: number) => woodMaterial(0.6, 2.4, true, 0.22, seed * 0.37, seed * 0.11);
  for (const [seed, y] of [[1, -T / 2], [2, -H - T / 2 - 0.03]] as const) {
    board(W, T, D - 0.012, shelfWood(seed), 0, y, -0.006, 0.004);
    molding(bullnose(T, 0.016), W, shelfWood(seed + 3), 0, y - T / 2, D / 2 - 0.012);
  }
  board(W + 2 * T + 0.02, T, D + 0.01, shelfWood(7), 0, H + T / 2, 0.005, 0.004);
  molding(cornice(), W + 2 * T + 0.07, shelfWood(8), 0, H + T, D / 2 + 0.005);
  for (const side of [-1, 1]) {
    board(T, 2 * H + 0.06 + 2 * T, D, woodMaterial(0.3, 1.2, false, 0.15, side * 0.2), side * (W / 2 + T / 2), 0.02 - 0.03 - T / 2, 0, 0.004);
    board(0.05, 2 * H + 0.1 + 2 * T, 0.022, woodMaterial(0.12, 1.4, false, 0.18, side * 0.31, 0.2), side * (W / 2 + T / 2 - 0.004), 0.02 - 0.03 - T / 2, D / 2 + 0.006, 0.006);
  }
  board(W, 0.06, 0.02, woodMaterial(1.4, 0.12, true, 0.15, 0.5), 0, -2 * H - 0.08, D / 2 - 0.03, 0.004);
  // Fond en lames verticales à rainures en V, chacune avec son veinage.
  for (let i = 0; i < 17; i += 1) {
    const lw = W / 17;
    board(lw - 0.003, 2 * H + 0.12, 0.012, woodMaterial(0.18, 1.2, false, 0.1, (i * 0.618) % 1, (i * 0.37) % 1),
      -W / 2 + lw * (i + 0.5), -H / 2 - 0.02, -D / 2 - 0.006 + ((i * 7) % 3) * 0.0006, 0.0025);
  }
  // Mur peint au relief de plâtre, qui reçoit l'ombre du meuble.
  const plaster = keep(new THREE.CanvasTexture(fiberCanvas(512, 11)));
  plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping;
  plaster.repeat.set(10, 5);
  const wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(14, 7)), keep(new THREE.MeshStandardMaterial({ color: 0x26211d, roughness: 0.95, bumpMap: plaster, bumpScale: 2 })));
  wall.position.set(0, 0.6, -D / 2 - 0.02);
  wall.receiveShadow = true;
  scene.add(wall);

  // --------------------------------------------------------------- objets
  const widths = items.map((item) => (item.object.kind === 'tv' ? SCREEN_WIDTH + 0.014 : item.object.size[0]));
  const slots = layoutShelf(widths, W);
  type Placed = {
    root: THREE.Group;
    rest: { x: number; z: number; ry: number };
    isTV: boolean;
    tv?: TVScreen;
    plaque: THREE.Mesh;
    plaqueMaterial: THREE.MeshPhysicalMaterial;
  };
  const placed: Placed[] = [];
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
    scene.add(root);
    const { plaque, material } = makePlaque(item, index, slots[index] ?? 0);
    placed.push({ root, rest: { x: slots[index] ?? 0, z: restZ, ry: restRy }, isTV, tv, plaque, plaqueMaterial: material });
  }

  // --------------------------------------------------------------- pipeline de rendu
  const pipeline = new THREE.RenderPipeline(renderer);
  const prePass = pass(scene, camera);
  prePass.transparent = false;
  prePass.setMRT(mrt({ output: packNormalToRGB(normalView), velocity }));
  prePass.getTexture('output').type = THREE.UnsignedByteType;
  const preNormal = sample((st) => unpackRGBToNormal(prePass.getTextureNode().sample(st)));
  const preDepth = prePass.getTextureNode('depth');
  const preVelocity = prePass.getTextureNode('velocity');
  // Ombres de contact : les boîtes touchent vraiment la planche.
  const contact = sss(preDepth, camera, sun);
  contact.resolutionScale = 0.5;
  contact.maxDistance.value = 0.04;
  contact.thickness.value = 0.004;
  contact.useTemporalFiltering = true;
  const scenePass = pass(scene, camera);
  scenePass.contextNode = builtinShadowContext(contact.getTextureNode().sample(screenUV).r, sun);
  scenePass.setMRT(mrt({ output, diffuseColor, metalrough: vec2(metalness, roughness) }));
  scenePass.getTexture('diffuseColor').type = THREE.UnsignedByteType;
  scenePass.getTexture('metalrough').type = THREE.UnsignedByteType;
  const beauty = scenePass.getTextureNode('output');
  let lit: THREE.Node<'vec4'> = beauty;
  if (!small) {
    // Lumière indirecte : le soleil rebondit sur le bois et éclaire les boîtes voisines.
    const gi = ssgi(beauty, preDepth, preNormal, camera);
    gi.resolutionScale = 0.5;
    gi.sliceCount.value = 2;
    gi.stepCount.value = 10;
    gi.radius.value = 1;
    gi.thickness.value = 0.05;
    gi.giIntensity.value = 2.2;
    const albedo = scenePass.getTextureNode('diffuseColor');
    lit = vec4(beauty.rgb.mul(gi.getAONode()).add(albedo.rgb.mul(gi.getGINode().rgb)), beauty.a);
    // Réflexions du vernis et de la vitre des écrans.
    const metalRough = scenePass.getTextureNode('metalrough');
    const reflections = ssr(convertToTexture(lit), preDepth, preNormal, { metalnessNode: metalRough.r, roughnessNode: metalRough.g, reflectNonMetals: true, camera });
    reflections.resolutionScale = 0.5;
    reflections.maxDistance.value = 0.6;
    reflections.thickness.value = 0.015;
    reflections.intensity.value = 0.55;
    lit = vec4(lit.rgb.add(reflections.rgb), 1);
    // Rayons de soleil dans la poussière.
    const rays = godrays(preDepth, camera, sun);
    rays.density.value = 0.35;
    rays.maxDensity.value = 0.22;
    rays.raymarchSteps.value = 48;
    lit = depthAwareBlend(convertToTexture(lit), bilateralBlur(rays.getTextureNode()).getTextureNode(), preDepth, camera,
      { blendColor: color(0xffffff), edgeRadius: 2, edgeStrength: 2 });
  }
  // TRAA puis netteté adaptative : jaquettes nettes, sans profondeur de champ.
  const clean = sharpen(traa(lit, preDepth, preVelocity, camera), 0.15);
  const glow = bloom(clean, 0.18, 0.3, 1.15);
  // Balance des blancs : le HDRI et le rebond sur le noyer tirent vers l'orange.
  const balanced = clean.rgb.add(glow.rgb).mul(vec3(0.93, 1.0, 1.1));
  const vignette = smoothstep(float(0.95), float(0.25), uv().sub(0.5).length());
  pipeline.outputNode = film(vec4(balanced.mul(vignette.mul(0.4).add(0.6)), 1), uniform(0.05));

  // --------------------------------------------------------------- état et boucle
  let active = -1;
  let zoomed = -1;
  let pointerX = 0;
  let mobile = false;
  let viewWidth = 2.2;
  let camX = 0;
  let camW = -1;
  let lookY = 0.17;
  let awakeUntil = 0;
  let running = true;
  const timer = new THREE.Timer();
  const target = new THREE.Vector3();
  const wake = (ms = 1600) => { awakeUntil = Math.max(awakeUntil, performance.now() + ms); };
  const damp = (a: number, b: number, k: number, dt: number) => (reducedMotion ? b : a + (b - a) * (1 - Math.exp(-k * dt)));

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    mobile = rect.width < 720;
    camera.fov = mobile ? 30 : 24;
    viewWidth = mobile ? 0.95 : 2.2;
    if (camW < 0) camW = viewWidth;
    camera.updateProjectionMatrix();
    wake();
  }

  function frame(): void {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    let busy = false;
    // Caméra : vue d'ensemble, suivi de l'objet actif sur téléphone, travelling vers l'objet zoomé.
    const isZoomed = zoomed >= 0;
    const goalX = isZoomed ? slots[zoomed] ?? 0 : mobile ? slots[Math.max(active, 0)] ?? 0 : 0;
    const goalW = isZoomed ? (mobile ? 0.66 : 1.25) : viewWidth;
    camX = damp(camX, goalX, 3.2, dt);
    camW = damp(camW, goalW, 3.2, dt);
    lookY = damp(lookY, isZoomed ? 0.12 : 0.17, 3.2, dt);
    if (Math.abs(camW - goalW) > 0.002 || Math.abs(camX - goalX) > 0.002) busy = true;
    const distance = camW / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(camera.aspect, 3);
    const lookX = isZoomed || mobile ? camX : 0;
    camera.position.set(lookX, isZoomed ? 0.17 : 0.3, distance);
    camera.lookAt(lookX, lookY, 0);

    placed.forEach((item, index) => {
      const on = index === active;
      const { root } = item;
      // L'objet actif sort de l'étagère ; zoomé, il pivote avec la souris.
      const spin = index === zoomed && !mobile ? pointerX : 0;
      const goalZ = on ? item.rest.z + (item.isTV ? 0.1 : 0.17) : item.rest.z;
      const goalY = on ? (item.isTV ? 0.006 : 0.02) : 0;
      const goalRy = on ? (item.isTV ? spin * 0.5 : index === zoomed ? spin * 1.3 : -0.5) : item.rest.ry;
      root.position.z = damp(root.position.z, goalZ, 7, dt);
      root.position.y = damp(root.position.y, goalY, 7, dt);
      root.rotation.y = damp(root.rotation.y, goalRy, 5, dt);
      root.rotation.x = damp(root.rotation.x, on && !item.isTV ? -0.04 : 0, 5, dt);
      if (Math.abs(root.position.z - goalZ) > 0.0005 || Math.abs(root.rotation.y - goalRy) > 0.0005) busy = true;
      if (item.tv !== undefined) {
        if (item.tv.playing) { item.tv.draw(); busy = true; }
        item.tv.spill.intensity = damp(item.tv.spill.intensity, on ? 0.5 : 0.12, 4, dt);
      }
      item.plaqueMaterial.emissiveIntensity = damp(item.plaqueMaterial.emissiveIntensity, on ? 0.12 : 0, 6, dt);
    });
    // La lampe d'accent pivote vers l'objet sorti.
    const lit = active >= 0 ? placed[active]?.root.position : undefined;
    target.set(lit?.x ?? 0, lit !== undefined ? 0.14 : 0.16, lit?.z ?? 0);
    lamp.target.position.lerp(target, reducedMotion ? 1 : 1 - Math.exp(-3 * dt));
    lamp.intensity = damp(lamp.intensity, lit !== undefined ? 3 : 1.5, 3, dt);
    lamp.position.x = damp(lamp.position.x, (lit?.x ?? 0) - 0.6, 1.5, dt);
    if (busy || performance.now() < awakeUntil) pipeline.render();
  }

  resize();
  wake(4000);
  renderer.setAnimationLoop(frame);

  // --------------------------------------------------------------- fabrication des objets
  async function makeBox(box: ShelfBox, index: number): Promise<THREE.Mesh> {
    const [w, h, d] = box.size;
    const frontImage = await loadImage(`${assetBase}${box.front}`);
    const backImage = typeof box.back === 'string' ? await loadImage(`${assetBase}${box.back}`) : await composeBack(box.back, assetBase);
    const spineImage = typeof box.spine === 'string' ? await loadImage(`${assetBase}${box.spine}`) : spineCanvas(box.spine);
    const coat = box.kind === 'case' ? 0.45 : 0.2;
    // Albédo calibré : un papier blanc renvoie environ 80 % de la lumière.
    const paper = (source: CanvasImageSource & { width: number; height: number }, seed: number) => keep(new THREE.MeshPhysicalMaterial({
      map: keep(worn(source, seed)), color: 0xe6e6e6, normalMap: keep(printNormal(source)), normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.46, clearcoat: coat, clearcoatRoughness: 0.22,
      clearcoatNormalMap: keep(printNormal(source, 1.2, 0.02, 700)), clearcoatNormalScale: new THREE.Vector2(0.3, 0.3),
    }));
    const front = paper(frontImage, 7 + index);
    const back = paper(backImage, 13 + index);
    const spine = paper(spineImage, 21 + index);
    const mesh = new THREE.Mesh(keep(new RoundedBoxGeometry(w, h, d, 3, box.kind === 'case' ? 0.003 : 0.0035)), [spine, spine, spine, spine, front, back]);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.y = h / 2;
    return mesh;
  }

  type TVScreen = { group: THREE.Group; spill: THREE.PointLight; video?: HTMLVideoElement; playing: boolean; draw(): void; showPoster(): void };
  async function makeScreen(item: ShelfSceneItem): Promise<TVScreen> {
    const group = new THREE.Group();
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
    group.add(inner);
    // La lumière de l'écran déborde sur le bois, teintée par l'image affichée.
    const spill = new THREE.PointLight(0xffffff, 0.12, 0.9, 2);
    spill.position.set(0, inner.position.y, 0.08);
    group.add(spill);
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
      group, spill, playing: false,
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
    scene.add(plaque);
    return { plaque, material };
  }

  // --------------------------------------------------------------- contrôleur
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  return {
    backend,
    setActive(index) { if (index !== active) { active = index; wake(); } },
    setZoom(index) { if (index !== zoomed) { zoomed = index; wake(3500); } },
    setPointer(x) { pointerX = Math.max(-1, Math.min(1, x)); wake(900); },
    async playVideo(index) {
      const tv = placed[index]?.tv;
      if (tv?.video === undefined || reducedMotion) return false;
      tv.playing = true;
      wake();
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
      wake();
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects([...placed.map((item) => item.root), ...placed.map((item) => item.plaque)], true)[0];
      const index = hit?.object.userData.index;
      return typeof index === 'number' ? index : -1;
    },
    resize,
    setRunning(next) {
      if (next === running) return;
      running = next;
      renderer.setAnimationLoop(next ? frame : null);
      if (next) wake();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      for (const item of placed) {
        item.tv?.video?.pause();
        item.tv?.video?.removeAttribute('src');
        item.tv?.video?.load();
      }
      for (const value of disposables) value.dispose();
      pipeline.dispose();
      renderer.dispose();
    },
  };
}

// ============================================================================
// Matières procédurales : relief, usure, poussière et plaques
// ============================================================================

// ----------------------------------------------------------------------------
// Charge une image ; crossOrigin est requis pour lire les pixels d'un média distant.
// ----------------------------------------------------------------------------
function loadImage(src: string, crossOrigin?: 'anonymous'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin !== undefined) image.crossOrigin = crossOrigin;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image illisible : ${src}`));
    image.src = src;
  });
}

// Générateur pseudo-aléatoire déterministe : une même graine donne la même matière.
function seeded(seed: number): () => number {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

function canvas2d(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) throw new Error('Canvas 2D indisponible.');
  return [canvas, context];
}

// Grain fibreux du plâtre : bruit fin et quelques fibres orientées.
function fiberCanvas(size: number, seed: number): HTMLCanvasElement {
  const [canvas, context] = canvas2d(size, size);
  const image = context.createImageData(size, size);
  const rand = seeded(seed);
  for (let i = 0; i < size * size; i += 1) { const v = 118 + rand() * 20; image.data.set([v, v, v, 255], i * 4); }
  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.07;
  context.strokeStyle = '#fff';
  for (let i = 0; i < 900; i += 1) {
    const x = rand() * size; const y = rand() * size; const a = rand() * Math.PI;
    context.lineWidth = 0.5 + rand();
    context.beginPath(); context.moveTo(x, y); context.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); context.stroke();
  }
  return canvas;
}

// Poussière déposée et traces de doigts : taches douces et grains.
function blotchTexture(size: number, seed: number, blobs: number, specks: number): THREE.CanvasTexture {
  const [canvas, context] = canvas2d(size, size);
  context.fillStyle = '#000';
  context.fillRect(0, 0, size, size);
  const rand = seeded(seed);
  for (let i = 0; i < blobs; i += 1) {
    const x = rand() * size; const y = rand() * size; const radius = size * (0.03 + rand() * 0.12);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255,255,255,${0.25 + rand() * 0.5})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  context.fillStyle = '#fff';
  for (let i = 0; i < specks; i += 1) { context.globalAlpha = 0.3 + rand() * 0.7; const s = 0.5 + rand() * 1.5; context.fillRect(rand() * size, rand() * size, s, s); }
  const result = new THREE.CanvasTexture(canvas);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  return result;
}

// Usure des arêtes : le carton blanchit le long des bords.
function worn(source: CanvasImageSource & { width: number; height: number }, seed: number): THREE.CanvasTexture {
  const [canvas, context] = canvas2d(source.width, source.height);
  const { width: w, height: h } = canvas;
  context.drawImage(source, 0, 0, w, h);
  const rand = seeded(seed);
  const band = Math.max(w, h) * 0.005;
  context.fillStyle = '#efe7da';
  for (let i = 0; i < 500; i += 1) {
    const side = i % 4; const t = rand(); const d = Math.pow(rand(), 3) * band; const s = 0.6 + rand() * 1.8;
    const x = side === 0 ? t * w : side === 1 ? w - d : side === 2 ? t * w : d;
    const y = side === 0 ? d : side === 1 ? t * h : side === 2 ? h - d : t * h;
    context.globalAlpha = 0.15 + rand() * 0.45;
    context.fillRect(x, y, s, s);
  }
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.anisotropy = 16;
  return result;
}

// ----------------------------------------------------------------------------
// Relief tiré de l'image : l'encre forme un léger bossage, le papier garde son grain.
// Retour : normal map au format OpenGL, en espace linéaire.
// ----------------------------------------------------------------------------
function printNormal(source: CanvasImageSource & { width: number; height: number }, strength = 2.2, tooth = 0.05, maxWidth = 1400): THREE.CanvasTexture {
  const w = Math.min(source.width, maxWidth);
  const h = Math.round(source.height * w / source.width);
  const [canvas, context] = canvas2d(w, h);
  context.drawImage(source, 0, 0, w, h);
  const image = context.getImageData(0, 0, w, h);
  const data = image.data;
  const luminance = new Float32Array(w * h);
  for (let k = 0; k < w * h; k += 1) luminance[k] = ((data[k * 4] ?? 0) * 0.299 + (data[k * 4 + 1] ?? 0) * 0.587 + (data[k * 4 + 2] ?? 0) * 0.114) / 255;
  const rand = seeded(9);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = (luminance[y * w + Math.min(x + 1, w - 1)] ?? 0) - (luminance[y * w + Math.max(x - 1, 0)] ?? 0);
      const dy = (luminance[Math.min(y + 1, h - 1) * w + x] ?? 0) - (luminance[Math.max(y - 1, 0) * w + x] ?? 0);
      const nx = dx * strength + (rand() - 0.5) * tooth;
      const ny = -dy * strength + (rand() - 0.5) * tooth;
      const inverse = 1 / Math.hypot(nx, ny, 1);
      const k = (y * w + x) * 4;
      data[k] = (nx * inverse * 0.5 + 0.5) * 255;
      data[k + 1] = (ny * inverse * 0.5 + 0.5) * 255;
      data[k + 2] = (inverse * 0.5 + 0.5) * 255;
      data[k + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const result = new THREE.CanvasTexture(canvas);
  result.anisotropy = 16;
  return result;
}

function spineCanvas(spine: ShelfSpine): HTMLCanvasElement {
  const [canvas, context] = canvas2d(256, 1200);
  context.fillStyle = spine.background;
  context.fillRect(0, 0, 256, 1200);
  context.save();
  context.translate(128, 600);
  context.rotate(-Math.PI / 2);
  context.fillStyle = spine.ink;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 120px "Mona Sans Variable", sans-serif';
  context.fillText(spine.title, 0, -16);
  context.font = '600 34px "Mona Sans Variable", sans-serif';
  context.globalAlpha = 0.85;
  context.fillText(spine.subtitle, 0, 66);
  context.restore();
  return canvas;
}

// Dos reconstitué avec de vraies captures du jeu, quand le scan du dos manque.
async function composeBack(back: Exclude<ShelfBox['back'], string>, assetBase: string): Promise<HTMLCanvasElement> {
  const [canvas, context] = canvas2d(790, 1024);
  context.fillStyle = back.background;
  context.fillRect(0, 0, 790, 1024);
  context.fillStyle = back.ink;
  context.font = '900 96px "Mona Sans Variable", sans-serif';
  context.textAlign = 'center';
  context.fillText(back.title, 395, 120);
  const shots = await Promise.all(back.screenshots.map((name) => loadImage(`${assetBase}${name}`).catch(() => null)));
  shots.forEach((image, i) => {
    if (image === null) return;
    const w = 330; const h = w * image.height / image.width; const x = i % 2 === 0 ? 50 : 790 - w - 50; const y = 170 + i * 230;
    context.fillStyle = '#1a1a1a';
    context.fillRect(x - 6, y - 6, w + 12, h + 12);
    context.drawImage(image, x, y, w, h);
  });
  context.fillStyle = '#2a1b0c';
  context.font = '700 30px "Mona Sans Variable", sans-serif';
  context.textAlign = 'left';
  back.bullets.forEach((line, i) => context.fillText(`• ${line}`, 420, 250 + i * 46));
  context.font = '600 24px "Mona Sans Variable", sans-serif';
  context.fillText(back.footer, 50, 980);
  return canvas;
}

// Laiton brossé et texte gravé (couleur sombre + normal map tirée du texte).
function plaqueTextures(name: string, meta: string, anisotropy: number): { map: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const [canvas, context] = canvas2d(1024, 200);
  const gradient = context.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, '#d9b45e'); gradient.addColorStop(0.55, '#b8913f'); gradient.addColorStop(1, '#9c7731');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 200);
  const rand = seeded(name.length * 97);
  for (let i = 0; i < 1600; i += 1) {
    context.globalAlpha = 0.05 + rand() * 0.08;
    context.fillStyle = rand() > 0.5 ? '#fff3cf' : '#5d4317';
    context.fillRect(rand() * 1024, rand() * 200, 40 + rand() * 260, 1);
  }
  context.globalAlpha = 1;
  const [text, textContext] = canvas2d(1024, 200);
  textContext.fillStyle = '#fff';
  textContext.textAlign = 'center';
  textContext.textBaseline = 'middle';
  textContext.font = '800 76px "Mona Sans Variable", sans-serif';
  textContext.fillText(name, 512, 82, 860);
  textContext.font = '500 34px "IBM Plex Mono", monospace';
  textContext.fillText(meta, 512, 150, 860);
  const [ink, inkContext] = canvas2d(1024, 200);
  inkContext.drawImage(text, 0, 0);
  inkContext.globalCompositeOperation = 'source-in';
  inkContext.fillStyle = '#24170a';
  inkContext.fillRect(0, 0, 1024, 200);
  context.globalAlpha = 0.9;
  context.drawImage(ink, 0, 0);
  context.globalAlpha = 1;
  const [mask, maskContext] = canvas2d(1024, 200);
  maskContext.fillStyle = '#fff';
  maskContext.fillRect(0, 0, 1024, 200);
  maskContext.globalCompositeOperation = 'difference';
  maskContext.drawImage(text, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  return { map, normal: printNormal(mask, 6, 0.015, 1024) };
}

// Nez de tablette en demi-rond, comme un chant massif poncé (coupe : x vers l'avant).
function bullnose(height: number, depth: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(depth - height / 2, 0);
  shape.absarc(depth - height / 2, height / 2, height / 2, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);
  return shape;
}

// Corniche : talon, gorge puis listel, qui déborde en haut du meuble.
function cornice(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.012, 0);
  shape.quadraticCurveTo(0.014, 0.012, 0.03, 0.02);
  shape.lineTo(0.042, 0.022);
  shape.lineTo(0.042, 0.034);
  shape.quadraticCurveTo(0.044, 0.04, 0.038, 0.042);
  shape.lineTo(0, 0.042);
  shape.lineTo(0, 0);
  return shape;
}
