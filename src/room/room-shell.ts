// ============================================================================
// RoomShell — Murs, sol, plafond, porte, fenêtre et suspension de la chambre
// ----------------------------------------------------------------------------
// Parquet en chêne verni, murs en plâtre peint (chaque pan est une boîte épaisse qui
// arrête le soleil), plafond, plinthes, porte et interrupteur du mur d'entrée, croisée et
// paysage du mur du fond, fil et ampoule du plafond. Rien ici ne bouge, sauf la bascule
// de l'interrupteur et l'éclat de l'ampoule, que la scène commande.
// ============================================================================
import * as THREE from 'three/webgpu';
import { mix, texture, uniform, uv, vec3 } from 'three/tsl';
import type { DaylightState } from './daylight.ts';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildDoor, buildLightSwitch, DOOR_W, type LightSwitch } from './door.ts';
import { BACK, BULB, DOOR, FRONT, RH, RX, WALL, WIN } from './room-layout.ts';
import { meshAdder, type Keep, type WoodFactory } from './room-mesh.ts';
import { canvas2d, seeded, type PbrSet } from '../shelf/shelf-materials.ts';

export type RoomShell = {
  // Murs, sol, plafond, menuiseries et suspension : aucune zone de clic.
  room: THREE.Group;
  // Interrupteur à côté de la porte : la scène le bascule avec l'ampoule.
  lightSwitch: LightSwitch;
  // Verre de l'ampoule, émissif quand elle est allumée.
  bulbGlass: THREE.MeshStandardNodeMaterial;
  // Paysage de la fenêtre selon l'heure : jour, nuit étoilée, teinte orangée du crépuscule.
  setSky(state: DaylightState): void;
};

// ----------------------------------------------------------------------------
// Construit la pièce. pbr fabrique les matériaux bois et plâtre ; oak et plaster sont les
// textures du parquet et des murs.
// ----------------------------------------------------------------------------
export function buildRoomShell(keep: Keep, pbr: WoodFactory, oak: PbrSet, plaster: PbrSet): RoomShell {
  const add = meshAdder(keep);
  const room = new THREE.Group();
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
  // Mur d'entrée, derrière la vue d'ensemble : porte blanche et interrupteur côté poignée.
  const doorLeft = DOOR.x - DOOR_W / 2 - 0.07;
  const doorRight = DOOR.x + DOOR_W / 2 + 0.07;
  skirting(doorLeft + RX, 0.016, (doorLeft - RX) / 2, FRONT - 0.008);
  skirting(RX - doorRight, 0.016, (RX + doorRight) / 2, FRONT - 0.008);
  const door = buildDoor(keep);
  door.position.set(DOOR.x, 0, FRONT);
  door.rotation.y = Math.PI;
  room.add(door);
  const lightSwitch = buildLightSwitch(keep);
  lightSwitch.group.position.set(doorRight + 0.12, 1.1, FRONT);
  lightSwitch.group.rotation.y = Math.PI;
  lightSwitch.setOn(true);
  room.add(lightSwitch.group);

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
  // La nuit, même paysage en silhouettes sous un ciel étoilé ; au lever et au coucher, le
  // jour se teinte d'orangé. Deux réglages du shader, sans le recompiler.
  const outside = keep(new THREE.CanvasTexture(landscapeCanvas()));
  outside.colorSpace = THREE.SRGBColorSpace;
  const night = keep(new THREE.CanvasTexture(nightCanvas()));
  night.colorSpace = THREE.SRGBColorSpace;
  const dayAmount = uniform(1);
  const duskAmount = uniform(0);
  const outsideMaterial = keep(new THREE.MeshBasicNodeMaterial());
  const daylit = texture(outside, uv()).rgb.mul(mix(vec3(1, 1, 1), vec3(1.25, 0.72, 0.52), duskAmount)).mul(1.9);
  outsideMaterial.colorNode = mix(texture(night, uv()).rgb, daylit, dayAmount);
  add(room, new THREE.PlaneGeometry(9, 4.5), outsideMaterial, WIN.x + 0.6, 1.4, BACK - 3.2, false);

  // Suspension : fil textile, douille en bakélite et ampoule allumée (elle n'arrête pas sa propre lumière).
  const cordMaterial = keep(new THREE.MeshStandardNodeMaterial({ color: 0x1c1a18, roughness: 0.8 }));
  add(room, new THREE.CylinderGeometry(0.004, 0.004, RH - BULB.y - 0.06, 8), cordMaterial, BULB.x, (RH + BULB.y + 0.06) / 2, BULB.z, false);
  add(room, new THREE.CylinderGeometry(0.035, 0.035, 0.015, 24), cordMaterial, BULB.x, RH - 0.0075, BULB.z, false);
  add(room, new THREE.CylinderGeometry(0.018, 0.02, 0.05, 20), keep(new THREE.MeshStandardNodeMaterial({ color: 0x2a2622, roughness: 0.45 })), BULB.x, BULB.y + 0.055, BULB.z, false);
  const bulbGlass = keep(new THREE.MeshStandardNodeMaterial({ color: 0xfff4e0, emissive: 0xffd9a8, emissiveIntensity: 6, roughness: 0.3 }));
  const bulb = add(room, new THREE.SphereGeometry(0.03, 24, 16), bulbGlass, BULB.x, BULB.y, BULB.z, false);
  bulb.scale.set(1, 1.25, 1);
  return {
    room, lightSwitch, bulbGlass,
    setSky(state) { dayAmount.value = state.day; duskAmount.value = state.dusk; },
  };
}

// ----------------------------------------------------------------------------
// Nuit vue par la fenêtre : ciel bleu nuit plus clair à l'horizon, étoiles, croissant de
// lune, collines et bosquets en silhouettes sombres (mêmes reliefs que le jour).
// Retour : toile 1024 x 512.
// ----------------------------------------------------------------------------
function nightCanvas(): HTMLCanvasElement {
  const [canvas, context] = canvas2d(1024, 512);
  const sky = context.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#03050f'); sky.addColorStop(0.6, '#0b1430'); sky.addColorStop(0.75, '#16223f'); sky.addColorStop(1, '#16223f');
  context.fillStyle = sky;
  context.fillRect(0, 0, 1024, 512);
  const rand = seeded(23);
  for (let i = 0; i < 260; i += 1) {
    const size = rand() < 0.92 ? 1 : 2;
    context.globalAlpha = 0.35 + rand() * 0.65;
    context.fillStyle = '#e8eeff';
    context.fillRect(Math.floor(rand() * 1024), Math.floor(rand() * 330), size, size);
  }
  context.globalAlpha = 1;
  // Croissant de lune : un disque clair entamé par un disque couleur du ciel.
  context.fillStyle = '#f2f0e0';
  context.beginPath(); context.arc(700, 110, 18, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#05091a';
  context.beginPath(); context.arc(709, 104, 16, 0, Math.PI * 2); context.fill();
  // Collines et bosquets : les mêmes formes que le jour (même graine), presque noires.
  const shapes = seeded(5);
  for (let i = 0; i < 14; i += 1) { shapes(); shapes(); shapes(); shapes(); }
  context.filter = 'blur(3px)';
  context.fillStyle = '#0a1018';
  context.beginPath(); context.moveTo(0, 360);
  for (let x = 0; x <= 1024; x += 32) context.lineTo(x, 340 + Math.sin(x * 0.006) * 24 + Math.sin(x * 0.021) * 8);
  context.lineTo(1024, 512); context.lineTo(0, 512); context.fill();
  context.fillStyle = '#060a10';
  for (let i = 0; i < 30; i += 1) {
    const x = shapes() * 1024; const r = 18 + shapes() * 30;
    context.beginPath(); context.arc(x, 372 + shapes() * 30 - r * 0.3, r, 0, Math.PI * 2); context.fill();
  }
  context.fillStyle = '#080d14';
  context.fillRect(0, 400, 1024, 112);
  context.filter = 'none';
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
