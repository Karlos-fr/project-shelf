// ============================================================================
// Poster — Affiches d'époque collées aux murs de la chambre
// ----------------------------------------------------------------------------
// Photos d'affiches réelles, provenance dans docs/xp-assets.md :
// - « I WANT TO BELIEVE » (réédition Pyramid Posters, 61 x 91,5 cm, d'après le cliché
//   d'ovni de Billy Meier de 1975), au-dessus du bureau ;
// - Alerte à Malibu (Baywatch), Pamela Anderson en C.J. Parker sur la plage, au format
//   des posters de 1995 (23 x 35 pouces), à côté de l'étagère.
// Le groupe a pour origine le centre de l'affiche ; elle regarde vers +z. Quatre
// boulettes de pâte à fixe, cachées derrière les coins, la tiennent au mur : le papier
// y repose et bombe légèrement entre elles.
// ============================================================================
import * as THREE from 'three/webgpu';

// Une affiche : photo servie sous /room/ et format réel du papier, en mètres.
export type PosterSpec = { file: string; width: number; height: number };

// Affiche officielle de X-Files, 61 x 91,5 cm.
export const X_FILES_POSTER: PosterSpec = { file: 'poster-i-want-to-believe.jpg', width: 0.61, height: 0.915 };
// Affiche d'Alerte à Malibu, format des posters de 1995 : 23 x 35 pouces (58,4 x 88,9 cm).
export const BAYWATCH_POSTER: PosterSpec = { file: 'poster-baywatch.jpg', width: 0.584, height: 0.889 };
// Épaisseur de pâte entre le mur et le papier.
const PUTTY = 0.004;

// ----------------------------------------------------------------------------
// Construit une affiche et sa pâte à fixe. keep enregistre ce qu'il faudra libérer.
// Paramètres : base, préfixe des fichiers de /room/ ; spec, photo et format de
// l'affiche ; anisotropy, filtrage maximal du GPU.
// Erreurs : rejette si la photo ne se charge pas.
// ----------------------------------------------------------------------------
export async function buildPoster(keep: <V extends { dispose(): void }>(value: V) => V, base: string, spec: PosterSpec, anisotropy: number): Promise<THREE.Group> {
  const { width, height } = spec;
  const group = new THREE.Group();
  const map = keep(await new THREE.TextureLoader().loadAsync(`${base}${spec.file}`));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  // Papier posé sur la pâte aux coins, qui retombe vers le mur au milieu des bords
  // et ondule un peu : une affiche roulée ne reste jamais parfaitement plane.
  const geometry = new THREE.PlaneGeometry(width, height, 30, 44);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const u = position.getX(i) / (width / 2);
    const v = position.getY(i) / (height / 2);
    const corner = Math.max(0, 1 - Math.hypot(1 - Math.abs(u), 1 - Math.abs(v)) * 2.2);
    // L'ondulation s'éteint sur la pâte : sinon un creux y laisse ressortir la boulette.
    const roll = 0.0025 * Math.sin(v * 7 + u * 2) * (1 - Math.abs(u)) * (1 - corner);
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
    piece.position.set(sx * (width / 2 - 0.03), sy * (height / 2 - 0.03), PUTTY * 0.45);
    piece.castShadow = true;
    group.add(piece);
  }
  return group;
}
