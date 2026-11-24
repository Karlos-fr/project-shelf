// ============================================================================
// PcModel — Ordinateur de la fin des années 90 posé sur le bureau
// ----------------------------------------------------------------------------
// Tour beige (lecteurs CD et disquette, voyants, bouton d'alimentation), moniteur
// CRT 17 pouces à dalle bombée, clavier AZERTY, souris à boule sur son tapis et
// câbles. Le groupe a pour origine le dessus du bureau ; l'avant regarde vers +z.
// L'écran affiche le bureau façon XP peint sur une toile.
// ============================================================================
import * as THREE from 'three/webgpu';
import { float, lights, max, output, texture, uv, vec4 } from 'three/tsl';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas2d, loadImage, printNormal } from '../shelf/shelf-materials.ts';
import { XP_CORNER, XP_HEIGHT, XP_TASKBAR, XP_WIDTH, type XP_FILES } from '../xp/xp-art.ts';

export type PcEnv = {
  keep: <V extends { dispose(): void }>(value: V) => V;
  maxAniso: number;
  smudgeTex: THREE.Texture;
  // Langue des écrans peints (BIOS, accueil, arrêt).
  locale: 'fr' | 'en';
  // Libellés du bureau peint sur l'écran 3D : icônes système et bouton Démarrer.
  labels: { start: string; myComputer: string; myDocuments: string; recycleBin: string };
  // URL d'un fichier d'origine de XP (fond Bliss, icônes).
  asset: (name: keyof typeof XP_FILES) => string;
};

export type PcPower = 'on' | 'off' | 'busy';
// Image de la dalle vue de loin : bureau, noir, BIOS, logo de démarrage, écran bleu d'accueil ou d'arrêt.
export type PcScreen = 'desktop' | 'black' | 'bios' | 'boot' | 'welcome' | 'shutdown';

export type PcModel = {
  group: THREE.Group;
  monitor: THREE.Group;
  tower: THREE.Group;
  // Dalle de l'écran : ses quatre coins en coordonnées monde (haut gauche, haut droit, bas droit, bas gauche).
  screenCorners(): THREE.Vector3[];
  screenCenter(): THREE.Vector3;
  screenNormal(): THREE.Vector3;
  // Allumé, éteint (voyant d'écran orange de veille, dalle noire) ou occupé (disque dur qui clignote).
  setPower(state: PcPower): void;
  // Ce qu'affiche la dalle 3D pendant les séquences, quand l'interface HTML n'est pas devant.
  setScreen(phase: PcScreen): void;
  // Interface HTML affichée sous le canvas : la dalle ne dessine plus que ses reflets, ajoutés
  // par-dessus (alpha 0 sur un canvas prémultiplié) ; sans elle, l'image peinte revient.
  setOverlay(on: boolean): void;
  // Environnement que reflète la vitre : la chambre elle-même, photographiée depuis l'écran ;
  // sceneLights : lumières de la pièce, dont la vitre garde tout sauf la lueur de l'écran.
  setReflection(environment: THREE.Texture, sceneLights: THREE.Light[]): void;
  // Enfonce le bouton d'alimentation, qui remonte aussitôt (environ un quart de seconde).
  pressPower(): void;
  // Anime le bouton et le voyant du disque dur ; retour : vrai tant qu'il faut redessiner.
  update(time: number): boolean;
};

// Dalle 4:3 visible d'un 17 pouces, en mètres.
export const SCREEN_W = 0.32;
export const SCREEN_H = 0.24;
// Rayon des coins de la dalle, accordé à celui du bureau XP superposé.
export const SCREEN_RADIUS = XP_CORNER / XP_WIDTH * SCREEN_W;

// ----------------------------------------------------------------------------
// Construit l'ordinateur. Effets de bord : charge les affiches des projets pour l'écran.
// ----------------------------------------------------------------------------
export async function buildPc(env: PcEnv): Promise<PcModel> {
  const { keep, maxAniso, smudgeTex } = env;
  const group = new THREE.Group();
  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x: number, y: number, z: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Plastique ABS beige grainé, un peu jauni par le soleil : mat, sans vernis.
  const plastic = keep(new THREE.MeshPhysicalNodeMaterial({ color: 0xc9bfa3, roughness: 0.72, specularIntensity: 0.6 }));
  plastic.roughnessNode = float(0.66).add(texture(smudgeTex, uv().mul(2)).r.mul(0.14));
  const plasticDark = keep(new THREE.MeshPhysicalMaterial({ color: 0xb2a88c, roughness: 0.74, specularIntensity: 0.6, side: THREE.DoubleSide }));
  const black = keep(new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.7 }));
  const grey = keep(new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5 }));

  // --------------------------------------------------------------- moniteur CRT 17 pouces
  // Modèle d'époque au cadre fin : façade étroite, rebord intérieur en pente qui descend
  // vers la dalle, menton mince portant la marque et les réglages, coque arrière profonde
  // qui loge le tube, ouïes d'aération et pied orientable.
  const monitor = new THREE.Group();
  monitor.position.set(0.05, 0, -0.1);
  monitor.userData.zone = 'screen';
  group.add(monitor);
  const front = 0.2;
  // Largeurs du cadre autour de la dalle : rebord en pente, puis façade (côtés, haut, menton).
  const lip = 0.009;
  const side = 0.016;
  const topBand = 0.018;
  const chin = 0.042;
  const bezelW = SCREEN_W + 2 * (lip + side);
  const bezelH = SCREEN_H + 2 * lip + topBand + chin;
  const bezelBottom = 0.052;
  const bodyY = bezelBottom + bezelH / 2;
  const screenY = bezelBottom + chin + lip + SCREEN_H / 2;
  // Pied orientable : galette et rotule.
  add(monitor, new THREE.CylinderGeometry(0.095, 0.112, 0.016, 64), plastic, 0, 0.008, -0.02);
  add(monitor, new THREE.CylinderGeometry(0.05, 0.07, 0.036, 48), plasticDark, 0, 0.034, -0.02);
  // Coque arrière : collier aux dimensions de la façade, puis tube qui s'affine et descend.
  // Elle est construite en anneaux successifs : le dessus suit exactement la courbe, et
  // les ouïes d'aération y sont posées à la bonne hauteur.
  const housingDepth = 0.4;
  const housingW = bezelW - 0.006;
  const housingH = bezelH - 0.006;
  const taper = (zRel: number) => {
    const t = Math.min(1, Math.max(0, (zRel - 0.06) / 0.34));
    return { scale: 1 - 0.4 * t ** 1.3, drop: 0.022 * t };
  };
  const housingFront = front - 0.026;
  const rings = 24;
  const ringPoints = 8;
  const contour = roundedRectPoints(housingW, housingH, 0.03, ringPoints);
  const positions: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rings; r += 1) {
    const zRel = (r / rings) * housingDepth;
    const { scale, drop } = taper(zRel);
    for (const point of contour) positions.push(point.x * scale, point.y * scale - drop, -zRel);
  }
  const count = contour.length;
  for (let r = 0; r < rings; r += 1) {
    for (let i = 0; i < count; i += 1) {
      const a0 = r * count + i; const a1 = r * count + ((i + 1) % count);
      const b0 = a0 + count; const b1 = a1 + count;
      indices.push(a0, b0, a1, a1, b0, b1);
    }
  }
  // Fond de la coque : éventail depuis le centre du dernier anneau.
  const back = taper(housingDepth);
  const centre = positions.length / 3;
  positions.push(0, -back.drop, -housingDepth);
  for (let i = 0; i < count; i += 1) indices.push(centre, rings * count + ((i + 1) % count), rings * count + i);
  const housing = new THREE.BufferGeometry();
  housing.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  housing.setIndex(indices);
  housing.computeVertexNormals();
  add(monitor, housing, plasticDark, 0, bodyY, housingFront);
  // Ouïes d'aération sur le dessus, vers l'arrière.
  for (const zRel of [0.17, 0.21, 0.25]) {
    const { scale, drop } = taper(zRel);
    const top = bodyY + (housingH / 2) * scale - drop;
    for (let k = -8; k <= 8; k += 1) {
      const slot = add(monitor, new THREE.BoxGeometry(0.005, 0.002, 0.028), black, k * 0.012 * scale, top, housingFront - zRel);
      slot.castShadow = false;
    }
  }
  // Façade fine, au chant adouci.
  const b = 0.004;
  const bezelShape = roundedRect(bezelW - 2 * b, bezelH - 2 * b, 0.018, 0, 0);
  bezelShape.holes.push(roundedRect(SCREEN_W + 2 * lip, SCREEN_H + 2 * lip, SCREEN_RADIUS + lip, 0, screenY - bodyY));
  const bezel = new THREE.ExtrudeGeometry(bezelShape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.004, bevelSize: b, bevelSegments: 4, curveSegments: 16 });
  add(monitor, bezel, plastic, 0, bodyY, front - 0.022);
  // Rebord en pente : de l'ouverture de la façade jusqu'au bord de la dalle, 12 mm plus bas.
  const slope = loft(
    roundedRectPoints(SCREEN_W + 2 * lip, SCREEN_H + 2 * lip, SCREEN_RADIUS + lip, 12), 0,
    roundedRectPoints(SCREEN_W + 0.001, SCREEN_H + 0.001, SCREEN_RADIUS, 12), -0.012,
  );
  add(monitor, slope, plasticDark, 0, screenY, front - 0.0005).castShadow = false;
  // Dalle bombée aux coins arrondis : le verre avance de 8 mm au centre.
  const glassGeometry = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 48, 36);
  const glassPosition = glassGeometry.attributes.position as THREE.BufferAttribute;
  const cornerX = SCREEN_W / 2 - SCREEN_RADIUS;
  const cornerY = SCREEN_H / 2 - SCREEN_RADIUS;
  for (let i = 0; i < glassPosition.count; i += 1) {
    let x = glassPosition.getX(i);
    let y = glassPosition.getY(i);
    const dx = Math.abs(x) - cornerX;
    const dy = Math.abs(y) - cornerY;
    if (dx > 0 && dy > 0) {
      const d = Math.hypot(dx, dy);
      if (d > SCREEN_RADIUS) {
        x = Math.sign(x) * (cornerX + dx * SCREEN_RADIUS / d);
        y = Math.sign(y) * (cornerY + dy * SCREEN_RADIUS / d);
      }
    }
    const nx = x / (SCREEN_W / 2);
    const ny = y / (SCREEN_H / 2);
    glassPosition.setXYZ(i, x, y, 0.008 * (1 - nx * nx * 0.6) * (1 - ny * ny * 0.6));
  }
  glassGeometry.computeVertexNormals();
  const screenCanvas = await paintDesktop(env);
  // Copie du bureau peint, pour le réafficher après une séquence.
  const [desktopCopy, desktopContext] = canvas2d(XP_WIDTH, XP_HEIGHT);
  desktopContext.drawImage(screenCanvas, 0, 0);
  const logo = await loadImage(env.asset('logo')).catch(() => null);
  const screenTexture = keep(new THREE.CanvasTexture(screenCanvas));
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = maxAniso;
  const glass = keep(new THREE.MeshPhysicalNodeMaterial({
    color: 0x0a0b0a, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
    emissive: 0xffffff, emissiveMap: screenTexture, emissiveIntensity: 0.95,
  }));
  glass.roughnessNode = float(0.05).add(texture(smudgeTex, uv().mul(1.1)).r.mul(0.25));
  const screen = add(monitor, glassGeometry, glass, 0, screenY, front - 0.0125);
  screen.castShadow = false;
  // Menton mince : marque au centre, nom du modèle à gauche, réglages et interrupteur à droite.
  const chinY = bezelBottom + chin / 2;
  const badge = keep(new THREE.CanvasTexture(brandCanvas()));
  badge.colorSpace = THREE.SRGBColorSpace;
  badge.anisotropy = maxAniso;
  const decal = add(monitor, new THREE.PlaneGeometry(0.3, 0.0375), keep(new THREE.MeshStandardMaterial({
    map: badge, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2,
  })), -0.02, chinY, front + 0.0004);
  decal.castShadow = false;
  const powerKnob = add(monitor, new THREE.CylinderGeometry(0.0075, 0.0075, 0.005, 32), plasticDark, 0.155, chinY, front + 0.0015);
  powerKnob.rotation.x = Math.PI / 2;
  const monitorLed = keep(new THREE.MeshStandardMaterial({ color: 0x1f8f2a, emissive: 0x32ff4a, emissiveIntensity: 2 }));
  add(monitor, new THREE.SphereGeometry(0.0022, 12, 8), monitorLed, 0.137, chinY, front + 0.001);
  for (let k = 0; k < 4; k += 1) add(monitor, new RoundedBoxGeometry(0.01, 0.006, 0.004, 2, 0.0015), plasticDark, 0.082 + k * 0.014, chinY, front + 0.0008);
  // La lumière de l'écran éclaire le clavier et le bureau.
  const spill = new THREE.PointLight(0x9cc4ff, 0.35, 1.2, 2);
  spill.position.set(0, screenY, front + 0.15);
  monitor.add(spill);

  // --------------------------------------------------------------- tour
  const tower = new THREE.Group();
  tower.position.set(-0.47, 0, -0.08);
  tower.userData.zone = 'desk';
  group.add(tower);
  const tw = 0.19; const th = 0.42; const td = 0.44;
  const tf = td / 2;
  add(tower, new RoundedBoxGeometry(tw, th, td, 4, 0.008), plastic, 0, th / 2, 0);
  add(tower, new RoundedBoxGeometry(tw - 0.006, th - 0.01, 0.012, 3, 0.004), plastic, 0, th / 2, tf + 0.004);
  // Lecteur CD-ROM : tiroir, trait de fente, bouton d'éjection et voyant.
  add(tower, new RoundedBoxGeometry(0.148, 0.042, 0.008, 2, 0.002), plasticDark, 0, 0.36, tf + 0.011);
  add(tower, new THREE.BoxGeometry(0.13, 0.0018, 0.002), black, 0, 0.365, tf + 0.0155);
  add(tower, new RoundedBoxGeometry(0.016, 0.007, 0.004, 2, 0.0015), plastic, 0.052, 0.35, tf + 0.016);
  add(tower, new THREE.SphereGeometry(0.0018, 10, 8), keep(new THREE.MeshStandardMaterial({ color: 0x5a3a10, emissive: 0xff9a20, emissiveIntensity: 0.2 })), -0.055, 0.35, tf + 0.016);
  // Baie 5,25 vide, cache plastique.
  add(tower, new RoundedBoxGeometry(0.148, 0.042, 0.006, 2, 0.002), plastic, 0, 0.31, tf + 0.01);
  // Lecteur de disquette 3,5 : fente noire et bouton.
  add(tower, new RoundedBoxGeometry(0.1, 0.026, 0.006, 2, 0.002), plasticDark, 0, 0.255, tf + 0.01);
  add(tower, new THREE.BoxGeometry(0.088, 0.0045, 0.003), black, -0.004, 0.258, tf + 0.0135);
  add(tower, new RoundedBoxGeometry(0.012, 0.006, 0.004, 2, 0.0015), plastic, 0.036, 0.249, tf + 0.0135);
  // Voyants alimentation (vert) et disque dur (orange).
  const led = (hex: number, emissive: number, x: number) => {
    const material = keep(new THREE.MeshStandardMaterial({ color: hex, emissive, emissiveIntensity: 2.5 }));
    add(tower, new THREE.SphereGeometry(0.0026, 12, 8), material, x, 0.17, tf + 0.011);
    return material;
  };
  const powerLed = led(0x1f8f2a, 0x3cff4c, -0.02);
  const diskLed = led(0x8a5010, 0xffa020, 0.02);
  diskLed.emissiveIntensity = 0.2;
  // Bouton d'alimentation et petit bouton de réinitialisation.
  const power = add(tower, new RoundedBoxGeometry(0.034, 0.034, 0.012, 3, 0.006), plasticDark, 0, 0.12, tf + 0.012);
  power.userData.zone = 'power';
  add(tower, new THREE.CylinderGeometry(0.005, 0.005, 0.006, 16), plasticDark, 0.05, 0.12, tf + 0.012).rotation.x = Math.PI / 2;
  // Grille d'aération au bas de la façade.
  for (let k = 0; k < 7; k += 1) add(tower, new THREE.BoxGeometry(0.13, 0.004, 0.004), grey, 0, 0.025 + k * 0.009, tf + 0.0095);

  // --------------------------------------------------------------- clavier et souris
  const keyboard = new THREE.Group();
  keyboard.position.set(0.04, 0, 0.17);
  keyboard.rotation.x = 0.045;
  group.add(keyboard);
  add(keyboard, new RoundedBoxGeometry(0.46, 0.026, 0.17, 4, 0.008), plastic, 0, 0.015, 0);
  const keysCanvas = keyboardCanvas();
  const keysMap = keep(new THREE.CanvasTexture(keysCanvas));
  keysMap.colorSpace = THREE.SRGBColorSpace;
  keysMap.anisotropy = maxAniso;
  const keysNormal = keep(printNormal(keysCanvas, 3.5, 0.02, 1024));
  const keys = add(keyboard, new THREE.PlaneGeometry(0.44, 0.15), keep(new THREE.MeshPhysicalMaterial({ map: keysMap, normalMap: keysNormal, roughness: 0.5, clearcoat: 0.1 })), 0, 0.0285, 0.004);
  keys.rotation.x = -Math.PI / 2;
  keys.castShadow = false;
  // Tapis de souris bleu nuit et souris à boule à deux boutons.
  add(group, new RoundedBoxGeometry(0.23, 0.004, 0.19, 2, 0.002), keep(new THREE.MeshStandardMaterial({ color: 0x1c2b66, roughness: 0.92 })), 0.4, 0.002, 0.17);
  const mouse = new THREE.Group();
  mouse.position.set(0.4, 0.004, 0.19);
  mouse.rotation.y = -0.12;
  group.add(mouse);
  const mouseBody = add(mouse, new THREE.SphereGeometry(1, 40, 24), plastic, 0, 0, 0);
  mouseBody.scale.set(0.031, 0.019, 0.054);
  add(mouse, new THREE.BoxGeometry(0.0012, 0.004, 0.035), grey, 0, 0.017, -0.03);
  add(mouse, new THREE.BoxGeometry(0.06, 0.004, 0.0012), grey, 0, 0.012, -0.012);
  // Câbles : souris et clavier vers la tour, moniteur vers la tour.
  const cable = keep(new THREE.MeshStandardMaterial({ color: 0x9c9585, roughness: 0.6 }));
  const tube = (points: [number, number, number][]) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    add(group, new THREE.TubeGeometry(curve, 80, 0.0028, 8, false), cable, 0, 0, 0);
  };
  tube([[0.4, 0.01, 0.14], [0.39, 0.004, 0.06], [0.3, 0.004, -0.05], [0.25, 0.004, -0.28], [-0.1, 0.004, -0.31], [-0.4, 0.05, -0.31], [-0.45, 0.12, -0.3]]);
  tube([[0.04, 0.02, 0.085], [0.06, 0.004, 0.03], [-0.15, 0.004, -0.02], [-0.25, 0.004, -0.3], [-0.42, 0.06, -0.31], [-0.48, 0.15, -0.3]]);
  tube([[0.05, 0.2, -0.38], [0.0, 0.08, -0.36], [-0.2, 0.004, -0.33], [-0.4, 0.04, -0.32], [-0.5, 0.25, -0.3]]);

  let powerState: PcPower = 'on';
  let pressedAt = -1;
  let overlay = false;
  const powerRestZ = power.position.z;
  return {
    group, monitor, tower,
    setReflection(environment, sceneLights) {
      glass.envMap = environment;
      // La lueur que l'écran projette sur la pièce, posée juste devant lui, ne se reflète pas dans sa propre vitre.
      glass.lightsNode = lights(sceneLights.filter((light) => light !== spill));
      glass.needsUpdate = true;
    },
    setOverlay(on) {
      if (on === overlay) return;
      overlay = on;
      // Écrit les reflets tels quels, avec un alpha égal à leur intensité affichée : le canvas
      // (prémultiplié) compose alors écran HTML × (1 - alpha) + reflet, comme une vraie vitre.
      // L'alpha suit la valeur après encodage sRGB (≈ puissance 1/2,2), pour ne jamais être
      // inférieur à la couleur, que le navigateur écrêterait.
      glass.blending = on ? THREE.CustomBlending : THREE.NormalBlending;
      glass.blendSrc = THREE.OneFactor;
      glass.blendDst = THREE.ZeroFactor;
      glass.blendSrcAlpha = THREE.OneFactor;
      glass.blendDstAlpha = THREE.ZeroFactor;
      // Sans teinte diffuse : seuls les reflets (ampoule, fenêtre, pièce) s'ajoutent à l'image.
      glass.color.setHex(on ? 0x000000 : 0x0a0b0a);
      glass.outputNode = on ? vec4(output.rgb, max(output.r, max(output.g, output.b)).mul(1.2).clamp(0, 1).pow(1 / 2.2)) : null;
      glass.emissiveIntensity = !on && powerState !== 'off' ? 0.95 : 0;
      glass.needsUpdate = true;
    },
    setPower(state) {
      powerState = state;
      const on = state !== 'off';
      powerLed.emissiveIntensity = on ? 2.5 : 0;
      monitorLed.emissive.setHex(on ? 0x32ff4a : 0xffa000);
      monitorLed.color.setHex(on ? 0x1f8f2a : 0x8a5a10);
      monitorLed.emissiveIntensity = on ? 2 : 1.4;
      // Allumé ou occupé, la dalle s'éclaire ; éteint, elle redevient un verre noir.
      glass.emissiveIntensity = on && !overlay ? 0.95 : 0;
      spill.intensity = state === 'on' ? 0.35 : on ? 0.15 : 0;
      diskLed.emissiveIntensity = 0.2;
    },
    setScreen(phase) {
      const context = screenCanvas.getContext('2d');
      if (context === null) return;
      paintPhase(context, phase, desktopCopy, logo, env.locale);
      screenTexture.needsUpdate = true;
    },
    pressPower() { pressedAt = performance.now(); },
    update(time) {
      let moving = false;
      if (pressedAt >= 0) {
        // Course de 5 mm : descente rapide, remontée un peu plus lente.
        const t = (time - pressedAt) / 280;
        power.position.z = powerRestZ - (t < 1 ? Math.sin(Math.PI * Math.min(1, t) ** 0.7) * 0.005 : 0);
        if (t >= 1) pressedAt = -1;
        moving = true;
      }
      if (powerState !== 'busy') return moving;
      // Accès disque irréguliers : le voyant orange scintille. Seul un changement d'état du
      // voyant demande un rendu, pas chaque image de la séquence de démarrage.
      const flicker = Math.sin(time * 0.031) + Math.sin(time * 0.017 + 1.3) + Math.sin(time * 0.0071);
      const intensity = flicker > 0.6 ? 3 : 0.2;
      if (intensity === diskLed.emissiveIntensity) return moving;
      diskLed.emissiveIntensity = intensity;
      return true;
    },
    screenCorners() {
      screen.updateWorldMatrix(true, false);
      return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) =>
        screen.localToWorld(new THREE.Vector3((sx ?? 0) * SCREEN_W / 2, (sy ?? 0) * SCREEN_H / 2, 0)));
    },
    screenCenter() {
      screen.updateWorldMatrix(true, false);
      return screen.localToWorld(new THREE.Vector3(0, 0, 0.008));
    },
    screenNormal() {
      return new THREE.Vector3(0, 0, 1).applyQuaternion(screen.getWorldQuaternion(new THREE.Quaternion()));
    },
  };
}

// ----------------------------------------------------------------------------
// Peint le bureau façon XP pour l'écran 3D : fond Bliss, icônes système, barre des tâches.
// Le vrai bureau HTML le recouvre dès que la dalle fait face à la caméra : ce fond ne se voit
// qu'un instant (chargement, retour à l'allumage). Il ne charge donc ni les affiches des
// projets ni l'heure, qui seraient figées. Retour : toile 1024 x 768.
// ----------------------------------------------------------------------------
async function paintDesktop(env: PcEnv): Promise<HTMLCanvasElement> {
  const [canvas, context] = canvas2d(XP_WIDTH, XP_HEIGHT);
  const file = (name: keyof typeof XP_FILES) => loadImage(env.asset(name)).catch(() => null);
  const [wallpaper, computer, documents, recycle, flag] = await Promise.all([
    file('wallpaper'), file('computer'), file('documents'), file('recycle'), file('flag'),
  ]);
  if (wallpaper !== null) context.drawImage(wallpaper, 0, 0, XP_WIDTH, XP_HEIGHT);
  context.font = '11px Tahoma, Verdana, sans-serif';
  context.textAlign = 'center';
  // Icône système 32 x 32 et son libellé ombré, en (x, y).
  const icon = (image: HTMLImageElement | null, label: string, x: number, y: number) => {
    if (image !== null) context.drawImage(image, x + 22, y, 32, 32);
    context.fillStyle = 'rgba(0,0,0,0.6)';
    context.fillText(label, x + 39, y + 47, 74);
    context.fillStyle = '#ffffff';
    context.fillText(label, x + 38, y + 46, 74);
  };
  icon(computer, env.labels.myComputer, 6, 10);
  icon(documents, env.labels.myDocuments, 6, 80);
  icon(recycle, env.labels.recycleBin, XP_WIDTH - 86, XP_HEIGHT - XP_TASKBAR - 64);
  // Barre des tâches bleue, bouton Démarrer vert et zone de notification.
  const top = XP_HEIGHT - XP_TASKBAR;
  const bar = context.createLinearGradient(0, top, 0, XP_HEIGHT);
  bar.addColorStop(0, '#3168d5'); bar.addColorStop(0.1, '#4993e6'); bar.addColorStop(0.25, '#2157d7'); bar.addColorStop(1, '#1941a5');
  context.fillStyle = bar;
  context.fillRect(0, top, XP_WIDTH, XP_TASKBAR);
  const startGradient = context.createLinearGradient(0, top, 0, XP_HEIGHT);
  startGradient.addColorStop(0, '#5eac56'); startGradient.addColorStop(0.2, '#3c9d34'); startGradient.addColorStop(1, '#2b7d23');
  context.fillStyle = startGradient;
  context.beginPath();
  context.moveTo(0, top); context.lineTo(88, top); context.quadraticCurveTo(100, top, 100, top + 12); context.lineTo(100, XP_HEIGHT); context.lineTo(0, XP_HEIGHT);
  context.fill();
  if (flag !== null) context.drawImage(flag, 8, top + 5, 23, 20);
  context.font = 'italic bold 17px "Trebuchet MS", "Franklin Gothic Medium", sans-serif';
  context.textAlign = 'left';
  context.fillStyle = 'rgba(0,0,0,0.4)';
  context.fillText(env.labels.start, 36, top + 22);
  context.fillStyle = '#ffffff';
  context.fillText(env.labels.start, 35, top + 21);
  const tray = context.createLinearGradient(0, top, 0, XP_HEIGHT);
  tray.addColorStop(0, '#1290e8'); tray.addColorStop(0.1, '#19b9f3'); tray.addColorStop(0.3, '#0f8ce6'); tray.addColorStop(1, '#0d73d0');
  context.fillStyle = tray;
  context.fillRect(XP_WIDTH - 90, top, 90, XP_TASKBAR);
  return canvas;
}

// ----------------------------------------------------------------------------
// Dessus du clavier AZERTY : touches beiges, modificateurs plus foncés, légendes grises.
// Retour : toile 1024 x 350 (rapport du plateau 44 x 15 cm).
// ----------------------------------------------------------------------------
function keyboardCanvas(): HTMLCanvasElement {
  const width = 1024;
  const height = 350;
  const [canvas, context] = canvas2d(width, height);
  context.fillStyle = '#b8ae94';
  context.fillRect(0, 0, width, height);
  const unit = 41;
  const keyCap = (x: number, y: number, w: number, label: string, dark = false) => {
    const kx = 16 + x * unit; const ky = 18 + y * unit; const kw = w * unit - 4; const kh = unit - 4;
    const gradient = context.createLinearGradient(0, ky, 0, ky + kh);
    gradient.addColorStop(0, dark ? '#cfc5aa' : '#f1ead6');
    gradient.addColorStop(1, dark ? '#a99f86' : '#cdc4ab');
    context.fillStyle = '#857b64';
    context.fillRect(kx, ky, kw, kh);
    context.fillStyle = gradient;
    context.fillRect(kx + 3, ky + 2, kw - 6, kh - 7);
    context.fillStyle = '#4b463b';
    context.font = `${label.length > 2 ? 11 : 15}px Arial, sans-serif`;
    context.textAlign = 'left';
    context.fillText(label, kx + 7, ky + 18);
  };
  const row = (y: number, keys: (string | [string, number, boolean?])[], start = 0) => {
    let x = start;
    for (const key of keys) {
      const [label, w, dark] = typeof key === 'string' ? [key, 1, false] : key;
      keyCap(x, y, w, label, dark);
      x += w;
    }
  };
  row(0, [['Échap', 1, true]]);
  row(0, ['F1', 'F2', 'F3', 'F4'], 2);
  row(0, ['F5', 'F6', 'F7', 'F8'], 6.5);
  row(0, ['F9', 'F10', 'F11', 'F12'], 11);
  row(1.3, ['²', '&', 'é', '"', '\'', '(', '-', 'è', '_', 'ç', 'à', ')', '=', ['←', 2, true]]);
  row(2.3, [['↹', 1.5, true], 'A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '^', '$', ['↵', 1.5, true]]);
  row(3.3, [['Maj', 1.75, true], 'Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'ù', '*', ['', 1.25, true]]);
  row(4.3, [['⇧', 1.25, true], '<', 'W', 'X', 'C', 'V', 'B', 'N', ',', ';', ':', '!', ['⇧', 2.75, true]]);
  row(5.3, [['Ctrl', 1.5, true], ['⊞', 1.25, true], ['Alt', 1.25, true], ['', 6, false], ['AltGr', 1.25, true], ['⊞', 1.25, true], ['Ctrl', 1.5, true]]);
  // Pavé de navigation et pavé numérique.
  row(1.3, ['Inser', 'Orig', 'Pg↑'].map((k) => [k, 1, true] as [string, number, boolean]), 15.3);
  row(2.3, ['Suppr', 'Fin', 'Pg↓'].map((k) => [k, 1, true] as [string, number, boolean]), 15.3);
  row(4.3, [['↑', 1, true]], 16.3);
  row(5.3, [['←', 1, true], ['↓', 1, true], ['→', 1, true]], 15.3);
  row(1.3, ['Vn', '/', '*', '-'], 18.3);
  row(2.3, ['7', '8', '9'], 18.3);
  row(3.3, ['4', '5', '6'], 18.3);
  row(4.3, ['1', '2', '3'], 18.3);
  row(5.3, [['0', 2]], 18.3);
  // Voyants Verr. Num, Verr. Maj, Arrêt défil.
  for (let k = 0; k < 3; k += 1) {
    context.fillStyle = k === 0 ? '#3ad04a' : '#4a5a44';
    context.fillRect(width - 150 + k * 40, 26, 14, 6);
  }
  return canvas;
}

// Rectangle arrondi centré en (cx, cy), utilisable comme forme ou comme trou.
function roundedRect(width: number, height: number, radius: number, cx: number, cy: number): THREE.Shape {
  const x0 = cx - width / 2; const x1 = cx + width / 2; const y0 = cy - height / 2; const y1 = cy + height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x0 + radius, y0);
  shape.lineTo(x1 - radius, y0);
  shape.absarc(x1 - radius, y0 + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x1, y1 - radius);
  shape.absarc(x1 - radius, y1 - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x0 + radius, y1);
  shape.absarc(x0 + radius, y1 - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x0, y0 + radius);
  shape.absarc(x0 + radius, y0 + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

// ----------------------------------------------------------------------------
// Sérigraphie du menton : « SAMSUNG » au centre, « SyncMaster 750s » à gauche.
// Retour : toile transparente au rapport du menton (30 x 3,75 cm).
// ----------------------------------------------------------------------------
function brandCanvas(): HTMLCanvasElement {
  const [canvas, context] = canvas2d(1440, 180);
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.fillStyle = '#2e3d6b';
  context.font = 'bold 62px "Arial Black", Arial, sans-serif';
  context.letterSpacing = '9px';
  context.fillText('SAMSUNG', 720, 92);
  context.letterSpacing = '0px';
  context.textAlign = 'left';
  context.fillStyle = '#5f5a4e';
  context.font = 'italic bold 30px Arial, sans-serif';
  context.fillText('SyncMaster 750s', 40, 94);
  return canvas;
}

// Contour d'un rectangle arrondi centré, en points 2D : quatre arcs de n segments,
// toujours parcourus dans le même ordre pour pouvoir relier deux contours entre eux.
function roundedRectPoints(width: number, height: number, radius: number, n: number): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const corners: [number, number, number][] = [
    [width / 2 - radius, -height / 2 + radius, -Math.PI / 2],
    [width / 2 - radius, height / 2 - radius, 0],
    [-width / 2 + radius, height / 2 - radius, Math.PI / 2],
    [-width / 2 + radius, -height / 2 + radius, Math.PI],
  ];
  for (const [cx, cy, start] of corners) {
    for (let k = 0; k <= n; k += 1) {
      const angle = start + (k / n) * (Math.PI / 2);
      points.push(new THREE.Vector2(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
    }
  }
  return points;
}

// Surface réglée entre deux contours de même nombre de points, aux profondeurs z0 et z1.
function loft(outer: THREE.Vector2[], z0: number, inner: THREE.Vector2[], z1: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i < outer.length; i += 1) {
    const j = (i + 1) % outer.length;
    const o0 = outer[i]; const o1 = outer[j]; const i0 = inner[i]; const i1 = inner[j];
    if (o0 === undefined || o1 === undefined || i0 === undefined || i1 === undefined) continue;
    positions.push(o0.x, o0.y, z0, i0.x, i0.y, z1, o1.x, o1.y, z0);
    positions.push(o1.x, o1.y, z0, i0.x, i0.y, z1, i1.x, i1.y, z1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// ----------------------------------------------------------------------------
// Peint la phase d'allumage ou d'extinction sur la dalle 3D, en version simplifiée :
// c'est ce qu'on voit de loin ; face à l'écran, l'interface HTML prend le relais.
// ----------------------------------------------------------------------------
function paintPhase(context: CanvasRenderingContext2D, phase: PcScreen, desktop: HTMLCanvasElement, logo: HTMLImageElement | null, locale: 'fr' | 'en'): void {
  const w = XP_WIDTH; const h = XP_HEIGHT;
  if (phase === 'desktop') { context.drawImage(desktop, 0, 0); return; }
  context.fillStyle = '#000';
  context.fillRect(0, 0, w, h);
  if (phase === 'bios') {
    // Texte gris du POST Award et logo energy jaune en haut à droite.
    context.fillStyle = '#b8b8b8';
    context.font = '20px "Lucida Console", "Courier New", monospace';
    const lines = ['  Award Modular BIOS v4.51PG, An Energy Star Ally', '  Copyright (C) 1984-98, Award Software, Inc.', '', 'W6168MS V1.3 111700', '',
      'PENTIUM III-MMX CPU at 500 MHz          , Host Bus 100MHz', 'Memory Test :  393216K OK', '', 'Award Plug and Play BIOS Extension v1.0A',
      'Copyright (C) 1998, Award Software, Inc.', '  Detecting IDE Primary Master  ... 86B_CD00'];
    lines.forEach((line, i) => context.fillText(line, 26, 40 + i * 28));
    context.fillText('Press DEL to enter SETUP', 26, h - 48);
    context.strokeStyle = '#e6e300';
    context.lineWidth = 2;
    context.font = 'italic 44px "Brush Script MT", cursive';
    context.strokeText('energy', w - 240, 76);
    return;
  }
  if (phase === 'boot') {
    // Logo Windows XP centré et sa barre aux blocs bleus.
    if (logo !== null) context.drawImage(logo, w / 2 - 150, 270, 92, 74);
    context.fillStyle = '#fff';
    context.font = 'bold 58px "Franklin Gothic Medium", "Trebuchet MS", sans-serif';
    context.fillText('Windows', w / 2 - 50, 340);
    context.fillStyle = '#f37a20';
    context.font = 'italic bold 30px "Trebuchet MS", sans-serif';
    context.fillText('xp', w / 2 + 180, 300);
    context.strokeStyle = '#b2b2b2';
    context.lineWidth = 2;
    context.strokeRect(w / 2 - 78, 420, 156, 18);
    context.fillStyle = '#3b5bff';
    for (let k = 0; k < 3; k += 1) context.fillRect(w / 2 - 50 + k * 12, 424, 9, 10);
    return;
  }
  if (phase === 'welcome' || phase === 'shutdown') {
    // Écran bleu à bandeaux, liseré orange en haut.
    context.fillStyle = '#5a7edc';
    context.fillRect(0, 0, w, h);
    context.fillStyle = '#00309c';
    context.fillRect(0, 0, w, 92);
    context.fillRect(0, h - 108, w, 108);
    context.fillStyle = '#f7b03c';
    context.fillRect(w * 0.2, 92, w * 0.6, 2);
    context.fillStyle = '#fff';
    if (phase === 'welcome') {
      context.font = 'italic bold 72px "Franklin Gothic Medium", "Trebuchet MS", sans-serif';
      context.fillText(locale === 'fr' ? 'bienvenue' : 'welcome', 520, h / 2 + 24);
    } else {
      context.font = '24px "Trebuchet MS", sans-serif';
      context.fillText(locale === 'fr' ? 'Windows s’arrête…' : 'Windows is shutting down…', 120, h / 2 + 40);
    }
  }
}
