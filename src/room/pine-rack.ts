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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { woodNodeMaterial, type PbrSet } from '../shelf/shelf-materials.ts';

// Dimensions en mètres : largeur intérieure entre montants, profondeur hors tout, hauteur.
export const RACK_WIDTH = 0.9;
export const RACK_DEPTH = 0.3;
export const RACK_HEIGHT = 1.72;
// Dessus des lattes de chaque niveau, du bas vers le haut.
export const RACK_LEVELS = [0.16, 0.54, 0.92, 1.3, 1.68] as const;
// Section carrée des montants et épaisseur des lattes, en mètres.
const POST = 0.034;
const SLAT_T = 0.016;
// Répétition du veinage (u, v) sur chaque sorte de pièce.
const POST_REPEAT: [number, number] = [0.06, 1.7];
const RAIL_REPEAT: [number, number] = [0.3, 0.1];
const SLAT_REPEAT: [number, number] = [1.1, 0.06];

// ----------------------------------------------------------------------------
// Construit l'étagère. set fournit le veinage (bois clair), dustTex la poussière déposée.
// Les pièces d'une même sorte (montants, traverses, lattes) partagent un matériau et sont
// fusionnées : le décalage du veinage propre à chaque pièce est inscrit dans ses
// coordonnées de texture plutôt que dans un matériau à part. Les encoches sont instanciées.
// L'étagère entière tient ainsi en quatre appels de dessin au lieu d'une centaine.
// ----------------------------------------------------------------------------
export function buildPineRack(keep: <V extends { dispose(): void }>(value: V) => V, set: PbrSet, dustTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  // Pin brut : blond, un peu jaune, sans vernis. Décalage nul : chaque pièce porte le sien.
  const pine = (ru: number, rv: number, rotate: boolean) => keep(woodNodeMaterial(set, dustTex, {
    ru, rv, rotate, coat: 0, tint: 0xffe0b0, brightness: 1.3, normalScale: 1, dust: 0.18,
  }));
  // Décalage du veinage d'une pièce, comme le faisait son matériau propre.
  const grain = (seed: number): [number, number] => [(seed * 0.37) % 1, (seed * 0.61) % 1];
  // ----------------------------------------------------------------------------
  // Pièce placée en (x, y, z), veinage décalé de (ox, oy) : sans rotation, le shader lit
  // uv × repeat + offset, donc uv + offset / repeat ; avec rotation (montants), l'axe u du
  // veinage suit v de la géométrie et l'axe v suit -u.
  // ----------------------------------------------------------------------------
  const piece = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, repeat: [number, number], offset: [number, number], rotate: boolean) => {
    geometry.translate(x, y, z);
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    const [ru, rv] = repeat;
    const [ox, oy] = offset;
    for (let i = 0; i < uv.count; i += 1) {
      if (rotate) uv.setXY(i, uv.getX(i) - oy / rv, uv.getY(i) + ox / ru);
      else uv.setXY(i, uv.getX(i) + ox / ru, uv.getY(i) + oy / rv);
    }
    return geometry;
  };
  // Réunit les pièces d'une sorte en un maillage qui porte et reçoit les ombres.
  const merged = (parts: THREE.BufferGeometry[], material: THREE.Material) => {
    const geometry = keep(mergeGeometries(parts, false) ?? new THREE.BufferGeometry());
    for (const part of parts) part.dispose();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  };
  const sideX = RACK_WIDTH / 2 + POST / 2;
  const postZ = RACK_DEPTH / 2 - POST / 2;
  // Montants : fil du bois vertical ; encoches de réglage sur la face intérieure.
  const posts: THREE.BufferGeometry[] = [];
  const notches: THREE.Vector3[] = [];
  let seed = 1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      posts.push(piece(new RoundedBoxGeometry(POST, RACK_HEIGHT, POST, 2, 0.002), sx * sideX, RACK_HEIGHT / 2, sz * postZ, POST_REPEAT, grain(seed += 1), true));
      for (let y = 0.1; y < RACK_HEIGHT - 0.05; y += 0.095) notches.push(new THREE.Vector3(sx * (sideX - POST / 2 - 0.0012), y, sz * postZ));
    }
  }
  merged(posts, pine(...POST_REPEAT, true));
  const notchMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.003, 0.028, 0.012)), keep(new THREE.MeshStandardMaterial({ color: 0x5a4126, roughness: 0.9 })), notches.length);
  notches.forEach((position, index) => notchMesh.setMatrixAt(index, new THREE.Matrix4().makeTranslation(position)));
  notchMesh.computeBoundingSphere();
  notchMesh.receiveShadow = true;
  group.add(keep(notchMesh));
  const rails: THREE.BufferGeometry[] = [];
  const slats: THREE.BufferGeometry[] = [];
  for (const [level, top] of RACK_LEVELS.entries()) {
    // Traverses latérales entre montant avant et arrière, sous les lattes.
    for (const sx of [-1, 1]) {
      rails.push(piece(new RoundedBoxGeometry(0.022, 0.044, RACK_DEPTH - 2 * POST, 2, 0.002), sx * (RACK_WIDTH / 2 - 0.011), top - SLAT_T - 0.022, 0, RAIL_REPEAT, grain(level * 7 + sx), false));
    }
    // Lattes posées en travers, avec un jour entre elles (plus serrées au dernier niveau).
    const count = level === RACK_LEVELS.length - 1 ? 7 : 5;
    const slatW = level === RACK_LEVELS.length - 1 ? 0.034 : 0.05;
    const span = RACK_DEPTH - 0.02;
    for (let k = 0; k < count; k += 1) {
      const z = -span / 2 + slatW / 2 + (k * (span - slatW)) / (count - 1);
      slats.push(piece(new RoundedBoxGeometry(RACK_WIDTH + 0.01, SLAT_T, slatW, 2, 0.002), 0, top - SLAT_T / 2, z, SLAT_REPEAT, grain(level * 13 + k), false));
    }
  }
  merged(rails, pine(...RAIL_REPEAT, false));
  merged(slats, pine(...SLAT_REPEAT, false));
  // Volume de clic invisible : l'étagère est surtout faite de vide, et un clic entre deux
  // lattes doit quand même la viser plutôt que le mur derrière.
  const hitBox = new THREE.Mesh(keep(new THREE.BoxGeometry(RACK_WIDTH + 2 * POST, RACK_HEIGHT, RACK_DEPTH)), keep(new THREE.MeshBasicMaterial({ visible: false })));
  hitBox.position.y = RACK_HEIGHT / 2;
  group.add(hitBox);
  return group;
}
