// ============================================================================
// PcModel — Ordinateur de la fin des années 90 posé sur le bureau
// ----------------------------------------------------------------------------
// Tour beige (lecteurs CD et disquette, voyants, bouton d'alimentation), moniteur
// CRT 17 pouces à dalle bombée, clavier AZERTY, souris à boule sur son tapis et
// câbles. Le groupe a pour origine le dessus du bureau ; l'avant regarde vers +z.
// L'écran affiche le bureau façon XP peint sur une toile.
// ============================================================================
import * as THREE from 'three/webgpu';
import { float, texture, uv } from 'three/tsl';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas2d, loadImage, printNormal } from '../shelf/shelf-materials.ts';
import { SHORTCUT_SVG, svgUrl, XP_CORNER, XP_HEIGHT, XP_TASKBAR, XP_WIDTH, type XP_FILES } from '../xp/xp-art.ts';

export type PcIcon = { label: string; image: string; crossOrigin?: 'anonymous' };

export type PcEnv = {
  keep: <V extends { dispose(): void }>(value: V) => V;
  maxAniso: number;
  smudgeTex: THREE.Texture;
  // Contenu du bureau affiché sur l'écran 3D : icônes système puis projets.
  labels: { start: string; myComputer: string; myDocuments: string; recycleBin: string };
  projects: readonly PcIcon[];
  // URL d'un fichier d'origine de XP (fond Bliss, icônes).
  asset: (name: keyof typeof XP_FILES) => string;
};

export type PcModel = {
  group: THREE.Group;
  monitor: THREE.Group;
  tower: THREE.Group;
  // Dalle de l'écran : ses quatre coins en coordonnées monde (haut gauche, haut droit, bas droit, bas gauche).
  screenCorners(): THREE.Vector3[];
  screenCenter(): THREE.Vector3;
  screenNormal(): THREE.Vector3;
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
  // Plastique ABS beige, un peu jauni par le soleil, aux reflets ternes.
  const plastic = keep(new THREE.MeshPhysicalNodeMaterial({ color: 0xd9cfb3, roughness: 0.55, clearcoat: 0.12, clearcoatRoughness: 0.5 }));
  plastic.roughnessNode = float(0.5).add(texture(smudgeTex, uv().mul(2)).r.mul(0.15));
  const plasticDark = keep(new THREE.MeshPhysicalMaterial({ color: 0xbdb398, roughness: 0.6 }));
  const black = keep(new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.7 }));
  const grey = keep(new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5 }));

  // --------------------------------------------------------------- moniteur CRT 17 pouces
  // Modèle d'époque : façade beige à ouverture arrondie, menton portant la marque et les
  // réglages, coque arrière profonde qui loge le tube, ouïes d'aération et pied orientable.
  const monitor = new THREE.Group();
  monitor.position.set(0.05, 0, -0.1);
  monitor.userData.zone = 'screen';
  group.add(monitor);
  const front = 0.2;
  const bodyY = 0.045 + 0.2;
  const screenY = bodyY + 0.02;
  // Pied orientable : galette et rotule.
  add(monitor, new THREE.CylinderGeometry(0.1, 0.118, 0.018, 64), plastic, 0, 0.009, 0.0);
  add(monitor, new THREE.CylinderGeometry(0.055, 0.075, 0.03, 48), plasticDark, 0, 0.03, 0.0);
  // Coque arrière : boîte arrondie qui s'affine et descend vers l'arrière.
  const housingDepth = 0.4;
  const taper = (zRel: number) => {
    const t = Math.min(1, Math.max(0, (zRel - 0.07) / 0.33));
    return { scale: 1 - 0.36 * t ** 1.2, drop: 0.03 * t };
  };
  const housing = new RoundedBoxGeometry(0.392, 0.382, housingDepth, 6, 0.035);
  const hp = housing.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < hp.count; i += 1) {
    const { scale, drop } = taper(housingDepth / 2 - hp.getZ(i));
    hp.setXYZ(i, hp.getX(i) * scale, hp.getY(i) * scale - drop, hp.getZ(i));
  }
  housing.computeVertexNormals();
  const housingZ = front - 0.046 - housingDepth / 2;
  add(monitor, housing, plastic, 0, bodyY, housingZ);
  // Ouïes d'aération sur le dessus, vers l'arrière.
  for (const zRel of [0.15, 0.19, 0.23]) {
    const { scale, drop } = taper(zRel);
    const top = bodyY + 0.191 * scale - drop;
    for (let k = -9; k <= 9; k += 1) {
      const slot = add(monitor, new THREE.BoxGeometry(0.005, 0.003, 0.03), black, k * 0.012 * scale, top, housingZ + housingDepth / 2 - zRel);
      slot.castShadow = false;
    }
  }
  // Façade : cadre arrondi dont l'ouverture épouse la dalle à un millimètre près.
  const b = 0.006;
  const bezelShape = roundedRect(0.405 - 2 * b, 0.395 - 2 * b, 0.028 - b, 0, 0);
  bezelShape.holes.push(roundedRect(SCREEN_W + 0.002, SCREEN_H + 0.002, SCREEN_RADIUS + 0.001, 0, screenY - bodyY));
  const bezel = new THREE.ExtrudeGeometry(bezelShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: b, bevelSegments: 4, curveSegments: 16 });
  add(monitor, bezel, plastic, 0, bodyY, front - 0.038);
  // Fond noir derrière la dalle : le liseré entre verre et façade reste sombre.
  const mask = add(monitor, new THREE.ShapeGeometry(roundedRect(SCREEN_W + 0.01, SCREEN_H + 0.01, SCREEN_RADIUS + 0.005, 0, 0), 12), black, 0, screenY, front - 0.03);
  mask.castShadow = false;
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
  const screenTexture = keep(new THREE.CanvasTexture(screenCanvas));
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = maxAniso;
  const glass = keep(new THREE.MeshPhysicalNodeMaterial({
    color: 0x0a0b0a, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
    emissive: 0xffffff, emissiveMap: screenTexture, emissiveIntensity: 0.95,
  }));
  glass.roughnessNode = float(0.05).add(texture(smudgeTex, uv().mul(1.1)).r.mul(0.25));
  const screen = add(monitor, glassGeometry, glass, 0, screenY, front - 0.012);
  screen.castShadow = false;
  // Menton : marque au centre, nom du modèle à gauche, réglages et interrupteur à droite.
  const chinY = (bodyY - 0.395 / 2 + screenY - SCREEN_H / 2 - 0.006) / 2;
  const badge = keep(new THREE.CanvasTexture(brandCanvas()));
  badge.colorSpace = THREE.SRGBColorSpace;
  badge.anisotropy = maxAniso;
  const decal = add(monitor, new THREE.PlaneGeometry(0.36, 0.05), keep(new THREE.MeshStandardMaterial({
    map: badge, transparent: true, roughness: 0.45, polygonOffset: true, polygonOffsetFactor: -2,
  })), -0.03, chinY + 0.004, front + 0.0004);
  decal.castShadow = false;
  const powerKnob = add(monitor, new THREE.CylinderGeometry(0.0095, 0.0095, 0.007, 32), plasticDark, 0.165, chinY, front + 0.002);
  powerKnob.rotation.x = Math.PI / 2;
  add(monitor, new THREE.SphereGeometry(0.0026, 12, 8), keep(new THREE.MeshStandardMaterial({ color: 0x1f8f2a, emissive: 0x32ff4a, emissiveIntensity: 2 })), 0.142, chinY, front + 0.0015);
  add(monitor, new RoundedBoxGeometry(0.072, 0.014, 0.004, 2, 0.002), black, 0.098, chinY - 0.002, front - 0.0005);
  for (let k = 0; k < 4; k += 1) add(monitor, new RoundedBoxGeometry(0.012, 0.007, 0.005, 2, 0.002), plasticDark, 0.073 + k * 0.017, chinY - 0.002, front + 0.001);
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
  const led = (hex: number, emissive: number, x: number) => add(tower, new THREE.SphereGeometry(0.0026, 12, 8), keep(new THREE.MeshStandardMaterial({ color: hex, emissive, emissiveIntensity: 2.5 })), x, 0.17, tf + 0.011);
  led(0x1f8f2a, 0x3cff4c, -0.02);
  led(0x8a5010, 0xffa020, 0.02);
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

  return {
    group, monitor, tower,
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
// Peint le bureau façon XP pour l'écran 3D : fond, icônes, barre des tâches.
// Retour : toile 1024 x 768. Les affiches illisibles laissent une icône vide.
// ----------------------------------------------------------------------------
async function paintDesktop(env: PcEnv): Promise<HTMLCanvasElement> {
  const [canvas, context] = canvas2d(XP_WIDTH, XP_HEIGHT);
  const file = (name: keyof typeof XP_FILES) => loadImage(env.asset(name)).catch(() => null);
  const [wallpaper, computer, documents, recycle, flag, arrow] = await Promise.all([
    file('wallpaper'), file('computer'), file('documents'), file('recycle'), file('flag'), loadImage(svgUrl(SHORTCUT_SVG)).catch(() => null),
  ]);
  if (wallpaper !== null) context.drawImage(wallpaper, 0, 0, XP_WIDTH, XP_HEIGHT);
  const posters = await Promise.all(env.projects.map((project) => loadImage(project.image, project.crossOrigin).catch(() => null)));
  context.font = '11px Tahoma, Verdana, sans-serif';
  context.textAlign = 'center';
  const icon = (image: HTMLImageElement | null, label: string, x: number, y: number, isShortcut: boolean) => {
    if (image !== null) {
      if (isShortcut) {
        // Affiche recadrée au carré, comme une icône de jeu.
        const side = Math.min(image.width, image.height);
        context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, x + 22, y, 32, 32);
      } else {
        context.drawImage(image, x + 22, y, 32, 32);
      }
    }
    if (isShortcut && arrow !== null) context.drawImage(arrow, x + 22, y + 22, 10, 10);
    context.fillStyle = 'rgba(0,0,0,0.6)';
    context.fillText(label, x + 39, y + 47, 74);
    context.fillStyle = '#ffffff';
    context.fillText(label, x + 38, y + 46, 74);
  };
  icon(computer, env.labels.myComputer, 6, 10, false);
  icon(documents, env.labels.myDocuments, 6, 80, false);
  env.projects.forEach((project, k) => {
    const column = Math.floor((k + 2) / 9);
    const row = (k + 2) % 9;
    icon(posters[k] ?? null, project.label, 6 + column * 80, 10 + row * 70, true);
  });
  icon(recycle, env.labels.recycleBin, XP_WIDTH - 86, XP_HEIGHT - XP_TASKBAR - 64, false);
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
  context.font = '11px Tahoma, Verdana, sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  const now = new Date();
  context.fillText(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, XP_WIDTH - 40, top + 19);
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
// Retour : toile transparente au rapport 36 x 5 cm.
// ----------------------------------------------------------------------------
function brandCanvas(): HTMLCanvasElement {
  const [canvas, context] = canvas2d(1440, 200);
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.fillStyle = '#2e3d6b';
  context.font = 'bold 74px "Arial Black", Arial, sans-serif';
  context.letterSpacing = '10px';
  context.fillText('SAMSUNG', 720, 100);
  context.letterSpacing = '0px';
  context.textAlign = 'left';
  context.fillStyle = '#5f5a4e';
  context.font = 'italic bold 38px Arial, sans-serif';
  context.fillText('SyncMaster 750s', 60, 104);
  return canvas;
}
