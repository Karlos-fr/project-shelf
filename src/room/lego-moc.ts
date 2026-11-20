// ============================================================================
// LegoMoc — MOC LEGO de Karlos-fr/lego-mocs, à l'échelle 1, posé dans la chambre
// ----------------------------------------------------------------------------
// Lit le maillage compact produit par scripts/convert-moc.py à partir du fichier
// BrickLink Studio (.io) et de la géométrie des pièces LDraw : un groupe par couleur,
// positions entières (unité donnée par l'en-tête) et indices. Pas de normales : l'ombrage
// plat, calculé par le GPU, donne des arêtes vives comme sur de vraies briques et évite
// des secondes de calcul au chargement. Origine : centre du
// dessous de la base ; avant vers +z ; y vers le haut ; mètres.
// ============================================================================
import * as THREE from 'three/webgpu';

type MocGroup = { code: number; name: string; rgb: string; alpha: number; finish: string | null; vertices: number; indices: number };
type MocHeader = { source: string; unit: number; groups: MocGroup[] };

// Matériau d'une couleur LEGO : ABS brillant, transparent, chromé ou nacré.
function brickMaterial(group: MocGroup): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(`#${group.rgb}`), roughness: 0.28, clearcoat: 0.35, clearcoatRoughness: 0.2, side: THREE.DoubleSide, flatShading: true });
  if (group.alpha < 1) {
    material.transparent = true;
    material.opacity = 0.55;
    material.roughness = 0.08;
    material.depthWrite = false;
  }
  if (group.finish === 'CHROME') { material.metalness = 1; material.roughness = 0.18; }
  if (group.finish === 'PEARLESCENT') { material.metalness = 0.7; material.roughness = 0.35; }
  return material;
}

// ----------------------------------------------------------------------------
// url : fichier .bin servi sous /room/moc/. keep enregistre ce qu'il faudra libérer.
// ----------------------------------------------------------------------------
export async function buildLegoMoc(keep: <V extends { dispose(): void }>(value: V) => V, url: string): Promise<THREE.Group> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MOC introuvable : ${url}`);
  const buffer = await response.arrayBuffer();
  const view = new DataView(buffer);
  const headerLength = view.getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, headerLength))) as MocHeader;
  const group = new THREE.Group();
  let offset = 4 + headerLength;
  for (const part of header.groups) {
    const raw = new Int16Array(buffer, offset, part.vertices * 3);
    offset += part.vertices * 6;
    offset += (4 - (offset % 4)) % 4;
    const index = new Uint32Array(buffer, offset, part.indices);
    offset += part.indices * 4;
    const positions = Float32Array.from(raw, (value) => value * header.unit);
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, keep(brickMaterial(part)));
    mesh.castShadow = part.alpha === 1;
    mesh.receiveShadow = true;
    mesh.name = part.name;
    group.add(mesh);
  }
  group.userData.source = header.source;
  return group;
}
