// ============================================================================
// PineRack — Étagère sur pieds en pin brut, à lattes
// ----------------------------------------------------------------------------
// Rayonnage de bricolage typique des chambres des années 90 : quatre montants carrés
// percés d'encoches de réglage, deux traverses latérales par niveau et cinq niveaux
// de lattes posées dessus. Pin non verni, clair et mat. Le groupe a pour origine le
// sol au centre de l'étagère ; l'avant regarde vers +z.
// ============================================================================
import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { woodNodeMaterial, type PbrSet } from '../shelf/shelf-materials.ts';

// Dimensions en mètres : largeur intérieure entre montants, profondeur hors tout, hauteur.
export const RACK_WIDTH = 0.9;
export const RACK_DEPTH = 0.3;
export const RACK_HEIGHT = 1.72;
// Dessus des lattes de chaque niveau, du bas vers le haut.
export const RACK_LEVELS = [0.16, 0.54, 0.92, 1.3, 1.68] as const;
const POST = 0.034;
const SLAT_T = 0.016;

// ----------------------------------------------------------------------------
// Construit l'étagère. set fournit le veinage (bois clair), dustTex la poussière déposée.
// ----------------------------------------------------------------------------
export function buildPineRack(keep: <V extends { dispose(): void }>(value: V) => V, set: PbrSet, dustTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  // Pin brut : blond, un peu jaune, sans vernis.
  const pine = (ru: number, rv: number, rotate: boolean, seed: number) => keep(woodNodeMaterial(set, dustTex, {
    ru, rv, rotate, ox: (seed * 0.37) % 1, oy: (seed * 0.61) % 1,
    coat: 0, tint: 0xffe0b0, brightness: 1.3, normalScale: 1, dust: 0.18,
  }));
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const sideX = RACK_WIDTH / 2 + POST / 2;
  const postZ = RACK_DEPTH / 2 - POST / 2;
  const notch = keep(new THREE.MeshStandardMaterial({ color: 0x5a4126, roughness: 0.9 }));
  // Montants : fil du bois vertical ; encoches de réglage sur la face intérieure.
  let seed = 1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      add(new RoundedBoxGeometry(POST, RACK_HEIGHT, POST, 2, 0.002), pine(0.06, 1.7, true, seed += 1), sx * sideX, RACK_HEIGHT / 2, sz * postZ);
      for (let y = 0.1; y < RACK_HEIGHT - 0.05; y += 0.095) {
        add(new THREE.BoxGeometry(0.003, 0.028, 0.012), notch, sx * (sideX - POST / 2 - 0.0012), y, sz * postZ).castShadow = false;
      }
    }
  }
  for (const [level, top] of RACK_LEVELS.entries()) {
    // Traverses latérales entre montant avant et arrière, sous les lattes.
    for (const sx of [-1, 1]) {
      add(new RoundedBoxGeometry(0.022, 0.044, RACK_DEPTH - 2 * POST, 2, 0.002), pine(0.3, 0.1, false, level * 7 + sx), sx * (RACK_WIDTH / 2 - 0.011), top - SLAT_T - 0.022, 0);
    }
    // Lattes posées en travers, avec un jour entre elles (plus serrées au dernier niveau).
    const slats = level === RACK_LEVELS.length - 1 ? 7 : 5;
    const slatW = level === RACK_LEVELS.length - 1 ? 0.034 : 0.05;
    const span = RACK_DEPTH - 0.02;
    for (let k = 0; k < slats; k += 1) {
      const z = -span / 2 + slatW / 2 + (k * (span - slatW)) / (slats - 1);
      add(new RoundedBoxGeometry(RACK_WIDTH + 0.01, SLAT_T, slatW, 2, 0.002), pine(1.1, 0.06, false, level * 13 + k), 0, top - SLAT_T / 2, z);
    }
  }
  // Volume de clic invisible : l'étagère est surtout faite de vide, et un clic entre deux
  // lattes doit quand même la viser plutôt que le mur derrière.
  const hitBox = new THREE.Mesh(keep(new THREE.BoxGeometry(RACK_WIDTH + 2 * POST, RACK_HEIGHT, RACK_DEPTH)), keep(new THREE.MeshBasicMaterial({ visible: false })));
  hitBox.position.y = RACK_HEIGHT / 2;
  group.add(hitBox);
  return group;
}
