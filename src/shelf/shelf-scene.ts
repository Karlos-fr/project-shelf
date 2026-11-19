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
  builtinShadowContext, color, convertToTexture, diffuseColor, float, metalness, mrt,
  normalView, output, packNormalToRGB, pass, roughness, sample, screenUV, smoothstep, unpackRGBToNormal,
  uniform, uv, vec2, vec3, vec4, velocity,
} from 'three/tsl';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
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
import { buildShelfModel, SHELF_DEPTH, type ShelfSceneItem } from './shelf-model.ts';
import { blotchTexture, fiberCanvas, loadPbrSet } from './shelf-materials.ts';

export type { ShelfSceneItem } from './shelf-model.ts';

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

// Profondeur du meuble, pour placer le mur juste derrière.
const D = SHELF_DEPTH;

// ----------------------------------------------------------------------------
// Crée la scène, charge tous les médias puis démarre la boucle de rendu.
// Paramètres : options décrit le canvas, les objets et le préréglage graphique.
// Retour : contrôleur de scène ; rejette si aucun moteur graphique n'est disponible.
// Effets de bord : crée des éléments vidéo hors DOM et une boucle d'animation.
// ----------------------------------------------------------------------------
export async function createShelfScene(options: ShelfSceneOptions): Promise<ShelfScene> {
  const { canvas, items, assetBase, small, reducedMotion } = options;
  // Préréglage léger pour téléphone et iPad : Safari iOS ferme l'onglet au-delà de
  // quelques centaines de mégaoctets, mémoire vidéo comprise.
  const appleTouch = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const lite = small || appleTouch;
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
  sun.shadow.mapSize.setScalar(lite ? 1024 : 2048);
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
  // Placage de noyer verni (Poly Haven, CC0). Le préréglage léger reçoit des textures deux fois plus petites.
  const walnut = await loadPbrSet(loader, assetBase, 'wood', maxAniso, lite ? '_1k' : '');
  keep(walnut.diff); keep(walnut.nor); keep(walnut.arm);

  // --------------------------------------------------------------- meuble et objets
  const model = await buildShelfModel({ keep, assetBase, lite, maxAniso, walnut, dustTex, smudgeTex }, items);
  scene.add(model.group);
  const { placed, slots } = model;
  // Mur peint au relief de plâtre, qui reçoit l'ombre du meuble.
  const plaster = keep(new THREE.CanvasTexture(fiberCanvas(512, 11)));
  plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping;
  plaster.repeat.set(10, 5);
  const wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(14, 7)), keep(new THREE.MeshStandardMaterial({ color: 0x26211d, roughness: 0.95, bumpMap: plaster, bumpScale: 2 })));
  wall.position.set(0, 0.6, -D / 2 - 0.02);
  wall.receiveShadow = true;
  scene.add(wall);

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
  if (!lite) {
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

    // Les objets sortent, pivotent et rentrent ; zoomé, l'objet suit la souris (pas sur téléphone).
    if (model.update(dt, active, zoomed, mobile ? 0 : pointerX, damp)) busy = true;
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

  // --------------------------------------------------------------- contrôleur
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  return {
    backend,
    setActive(index) { if (index !== active) { active = index; wake(); } },
    setZoom(index) { if (index !== zoomed) { zoomed = index; wake(3500); } },
    setPointer(x) { pointerX = Math.max(-1, Math.min(1, x)); wake(900); },
    async playVideo(index) {
      wake();
      return model.playVideo(index, reducedMotion);
    },
    stopVideo(index) {
      model.stopVideo(index);
      wake();
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(model.pickTargets(), true)[0];
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
      model.disposeVideos();
      for (const value of disposables) value.dispose();
      pipeline.dispose();
      renderer.dispose();
    },
  };
}
