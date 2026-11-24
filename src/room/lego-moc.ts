// ============================================================================
// LegoMoc — MOC LEGO de Karlos-fr/lego-mocs, à l'échelle 1, posé dans la chambre
// ----------------------------------------------------------------------------
// Lit le maillage compact produit par scripts/convert-moc.py à partir du fichier
// BrickLink Studio (.io) et de la géométrie des pièces LDraw : un groupe par couleur,
// positions entières (unité donnée par l'en-tête), indices (sur 16 bits quand le groupe a
// moins de 65 536 sommets, marqué index16 ; sinon 32 bits), et coordonnées du dessus des
// tenons. Pas de normales : l'ombrage plat, calculé par le GPU, donne des arêtes vives
// comme sur de vraies briques et évite des secondes de calcul au chargement. Le logo LEGO
// des tenons est une image en relief (stud-logo.png, scripts/stud-logo.py) appliquée en
// bump map sur le seul dessus des tenons, sans géométrie en plus. Origine : centre du
// dessous de la base ; avant vers +z ; y vers le haut ; mètres.
// ============================================================================
import * as THREE from 'three/webgpu';
import { attribute, bumpMap, step, texture, vec2 } from 'three/tsl';

type MocGroup = { code: number; name: string; rgb: string; alpha: number; finish: string | null; vertices: number; indices: number; index16?: boolean };
type MocHeader = { source: string; unit: number; logo?: boolean; groups: MocGroup[] };

// Relief du logo, partagé par toutes les couleurs (un seul shader à générer). L'attribut
// logo vaut (u, v) dans le disque du tenon, à ±120/127 au bord ; sa troisième composante
// vaut 1 sur le dessus du tenon (127 normalisé) et -1 ailleurs.
function logoRelief(logoTex: THREE.Texture): THREE.Node<'vec3'> {
  const logo = attribute('logo', 'vec4');
  const at = logo.xy.mul(127 / 120 / 2).add(0.5);
  return bumpMap(texture(logoTex, vec2(at.x, at.y)), step(0.99, logo.z).mul(1.2)) as unknown as THREE.Node<'vec3'>;
}

// Matériau d'une couleur LEGO : ABS brillant, transparent, chromé ou nacré.
function brickMaterial(group: MocGroup, relief: THREE.Node<'vec3'> | null): THREE.MeshPhysicalNodeMaterial {
  const material = new THREE.MeshPhysicalNodeMaterial({ color: new THREE.Color(`#${group.rgb}`), roughness: 0.28, clearcoat: 0.35, clearcoatRoughness: 0.2, side: THREE.DoubleSide, flatShading: true });
  if (group.alpha < 1) {
    material.transparent = true;
    material.opacity = 0.55;
    material.roughness = 0.08;
    material.depthWrite = false;
  }
  if (group.finish === 'CHROME') { material.metalness = 1; material.roughness = 0.18; }
  if (group.finish === 'PEARLESCENT') { material.metalness = 0.7; material.roughness = 0.35; }
  if (relief !== null) material.normalNode = relief;
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
  let relief: THREE.Node<'vec3'> | null = null;
  if (header.logo === true) {
    const logoTex = keep(await new THREE.TextureLoader().loadAsync(url.replace(/[^/]*$/, 'stud-logo.png')));
    logoTex.colorSpace = THREE.NoColorSpace;
    logoTex.anisotropy = 4;
    relief = logoRelief(logoTex);
  }
  let offset = 4 + headerLength;
  for (const part of header.groups) {
    const raw = new Int16Array(buffer, offset, part.vertices * 3);
    offset += part.vertices * 6;
    offset += (4 - (offset % 4)) % 4;
    // Indices 16 bits (moitié moins lourds) quand le groupe le permet, complétés à 4 octets.
    const index = part.index16 === true ? new Uint16Array(buffer, offset, part.indices) : new Uint32Array(buffer, offset, part.indices);
    offset += part.indices * index.BYTES_PER_ELEMENT;
    offset += (4 - (offset % 4)) % 4;
    const positions = Float32Array.from(raw, (value) => value * header.unit);
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (header.logo === true) {
      geometry.setAttribute('logo', new THREE.BufferAttribute(new Int8Array(buffer, offset, part.vertices * 4), 4, true));
      offset += part.vertices * 4;
    }
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, keep(brickMaterial(part, relief)));
    mesh.castShadow = part.alpha === 1;
    mesh.receiveShadow = true;
    mesh.name = part.name;
    group.add(mesh);
  }
  group.userData.source = header.source;
  return group;
}
