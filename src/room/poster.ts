// ============================================================================
// Poster — Affiche « I WANT TO BELIEVE » collée au mur de la chambre
// ----------------------------------------------------------------------------
// Photo de l'affiche officielle de la série (réédition Pyramid Posters, 61 x 91,5 cm,
// d'après le cliché d'ovni de Billy Meier de 1975) : provenance dans docs/xp-assets.md.
// Le groupe a pour origine le centre de l'affiche ; elle regarde vers +z. Quatre
// boulettes de pâte à fixe, cachées derrière les coins, la tiennent au mur : le papier
// y repose et bombe légèrement entre elles.
// ============================================================================
import * as THREE from 'three/webgpu';

// Format réel de l'affiche, en mètres.
export const POSTER_W = 0.61;
export const POSTER_H = 0.915;
// Fichier servi sous /room/.
export const POSTER_FILE = 'poster-i-want-to-believe.jpg';
// Épaisseur de pâte entre le mur et le papier.
const PUTTY = 0.004;

// ----------------------------------------------------------------------------
// Construit l'affiche et la pâte à fixe. keep enregistre ce qu'il faudra libérer.
// Paramètres : url de la photo de l'affiche ; anisotropy, filtrage maximal du GPU.
// ----------------------------------------------------------------------------
export async function buildPoster(keep: <V extends { dispose(): void }>(value: V) => V, url: string, anisotropy: number): Promise<THREE.Group> {
  const group = new THREE.Group();
  const map = keep(await new THREE.TextureLoader().loadAsync(url));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  // Papier posé sur la pâte aux coins, qui retombe vers le mur au milieu des bords
  // et ondule un peu : une affiche roulée ne reste jamais parfaitement plane.
  const geometry = new THREE.PlaneGeometry(POSTER_W, POSTER_H, 30, 44);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const u = position.getX(i) / (POSTER_W / 2);
    const v = position.getY(i) / (POSTER_H / 2);
    const corner = Math.max(0, 1 - Math.hypot(1 - Math.abs(u), 1 - Math.abs(v)) * 2.2);
    const roll = 0.0025 * Math.sin(v * 7 + u * 2) * (1 - Math.abs(u));
    position.setZ(i, PUTTY * (0.55 + 0.45 * corner) + roll);
  }
  geometry.computeVertexNormals();
  const paper = new THREE.Mesh(keep(geometry), keep(new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.35, side: THREE.DoubleSide })));
  paper.castShadow = true;
  paper.receiveShadow = true;
  group.add(paper);
  // Pâte à fixe blanche, écrasée entre le mur et le dos de chaque coin : invisible de face,
  // elle décolle juste assez le papier pour qu'il projette une fine ombre sur le mur.
  const putty = keep(new THREE.MeshStandardMaterial({ color: 0xeeebe2, roughness: 0.85 }));
  const blob = keep(new THREE.SphereGeometry(0.013, 20, 12));
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
    const piece = new THREE.Mesh(blob, putty);
    piece.scale.set(1.15, 1, 0.12);
    piece.position.set(sx * (POSTER_W / 2 - 0.03), sy * (POSTER_H / 2 - 0.03), PUTTY * 0.45);
    piece.castShadow = true;
    group.add(piece);
  }
  return group;
}
