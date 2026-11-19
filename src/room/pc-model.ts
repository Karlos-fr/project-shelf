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
import { SHORTCUT_SVG, svgUrl, XP_HEIGHT, XP_TASKBAR, XP_WIDTH, type XP_FILES } from '../xp/xp-art.ts';

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

  // --------------------------------------------------------------- moniteur CRT
  const monitor = new THREE.Group();
  monitor.position.set(0.05, 0, -0.1);
  monitor.userData.zone = 'screen';
  group.add(monitor);
  add(monitor, new THREE.CylinderGeometry(0.1, 0.115, 0.018, 48), plastic, 0, 0.009, 0.02);
  add(monitor, new THREE.CylinderGeometry(0.06, 0.075, 0.03, 40), plasticDark, 0, 0.03, 0.02);
  const bodyY = 0.045 + 0.195;
  const front = 0.2;
  // Coque arrière en tronc de pyramide, qui loge le tube.
  const shell = new THREE.BoxGeometry(0.39, 0.37, 0.36, 4, 4, 4);
  const position = shell.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const t = (0.18 - position.getZ(i)) / 0.36;
    const scale = 1 - 0.32 * t;
    position.setXYZ(i, position.getX(i) * scale, position.getY(i) * scale - 0.025 * t, position.getZ(i));
  }
  shell.computeVertexNormals();
  add(monitor, shell, plastic, 0, bodyY, front - 0.06 - 0.18);
  // Façade arrondie autour de la dalle, puis cadre sombre en retrait.
  add(monitor, new RoundedBoxGeometry(0.415, 0.39, 0.07, 5, 0.022), plastic, 0, bodyY, front - 0.035);
  const rim = new THREE.Shape([new THREE.Vector2(-0.178, -0.138), new THREE.Vector2(0.178, -0.138), new THREE.Vector2(0.178, 0.138), new THREE.Vector2(-0.178, 0.138)]);
  rim.holes.push(new THREE.Path([new THREE.Vector2(-SCREEN_W / 2, -SCREEN_H / 2), new THREE.Vector2(SCREEN_W / 2, -SCREEN_H / 2), new THREE.Vector2(SCREEN_W / 2, SCREEN_H / 2), new THREE.Vector2(-SCREEN_W / 2, SCREEN_H / 2)]));
  add(monitor, new THREE.ExtrudeGeometry(rim, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.003, bevelSegments: 2 }), keep(new THREE.MeshStandardMaterial({ color: 0x4a463d, roughness: 0.6 })), 0, bodyY + 0.012, front - 0.004);
  // Dalle bombée : le verre avance d'un centimètre au centre.
  const glassGeometry = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 32, 24);
  const glassPosition = glassGeometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < glassPosition.count; i += 1) {
    const nx = glassPosition.getX(i) / (SCREEN_W / 2);
    const ny = glassPosition.getY(i) / (SCREEN_H / 2);
    glassPosition.setZ(i, 0.009 * (1 - nx * nx * 0.6) * (1 - ny * ny * 0.6));
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
  const screen = add(monitor, glassGeometry, glass, 0, bodyY + 0.012, front + 0.004);
  screen.castShadow = false;
  // Boutons et voyant sous la dalle.
  add(monitor, new THREE.CylinderGeometry(0.008, 0.008, 0.006, 24), plasticDark, 0.15, bodyY - 0.165, front + 0.001).rotation.x = Math.PI / 2;
  add(monitor, new THREE.SphereGeometry(0.0028, 12, 8), keep(new THREE.MeshStandardMaterial({ color: 0x1f8f2a, emissive: 0x32ff4a, emissiveIntensity: 2 })), 0.13, bodyY - 0.165, front + 0.002);
  for (let k = 0; k < 4; k += 1) add(monitor, new RoundedBoxGeometry(0.014, 0.006, 0.006, 2, 0.002), plasticDark, -0.12 + k * 0.022, bodyY - 0.165, front + 0.001);
  // La lumière de l'écran éclaire le clavier et le bureau.
  const spill = new THREE.PointLight(0x9cc4ff, 0.35, 1.2, 2);
  spill.position.set(0, bodyY, front + 0.15);
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
        screen.localToWorld(new THREE.Vector3((sx ?? 0) * SCREEN_W / 2, (sy ?? 0) * SCREEN_H / 2, 0.004)));
    },
    screenCenter() {
      screen.updateWorldMatrix(true, false);
      return screen.localToWorld(new THREE.Vector3(0, 0, 0.009));
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
