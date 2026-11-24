// ============================================================================
// MergeStatic — Fusion des pièces immobiles d'un objet de la chambre
// ----------------------------------------------------------------------------
// Un objet construit en code (cube L3D, PC) compte des dizaines de petites pièces qui
// partagent un même matériau : chacune coûte un appel de dessin, et autant dans chaque
// passe d'ombre. Ici, les maillages immobiles d'un même matériau sont réunis en un seul.
// Restent à part : maillages instanciés, multi-matériaux, transparents (leur tri par
// profondeur compte), ceux qui portent une zone de clic, un index ou la marque
// userData.dynamic (pièce animée), et tout ce qui est sous un parent marqué dynamic.
// Une fusion reste sous le groupe porteur de zone le plus proche (par exemple le moniteur,
// zone « screen ») : un clic sur la pièce mène toujours à la même vue.
// ============================================================================
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type MergeOptions = {
  // Sous ce diamètre, en mètres, une pièce ne projette plus d'ombre : la passe d'ombre
  // ne la verrait pas, elle ne ferait que coûter un dessin de plus.
  minShadowSize?: number;
  // Enregistre chaque géométrie fusionnée pour qu'elle soit libérée avec la scène.
  keep?: (geometry: THREE.BufferGeometry) => void;
};

// Maillages d'un même matériau, mêmes réglages d'ombre, sous un même groupe porteur.
type Bucket = { owner: THREE.Object3D; material: THREE.Material; cast: boolean; receive: boolean; meshes: THREE.Mesh[] };

// ----------------------------------------------------------------------------
// Fusionne les maillages immobiles de root, par matériau, réglages d'ombre et groupe porteur.
//
// Paramètres :
// - root : racine de l'objet.
// - options : seuil d'ombre éventuel (appliqué aussi aux pièces restées seules).
//
// Retour : nombre de maillages retirés (remplacés par les fusions).
//
// Effets de bord : retire les maillages fusionnés de leurs parents, ajoute chaque fusion
// sous son groupe porteur, et libère les géométries d'origine qui ne servent plus. À appeler
// avant le premier rendu et avant d'enregistrer les ressources à libérer.
// ----------------------------------------------------------------------------
export function mergeStatic(root: THREE.Object3D, options: MergeOptions = {}): number {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, Bucket>();
  const scale = new THREE.Vector3();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
    const material = object.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material) || material.transparent || !object.visible) return;
    if (object.userData.zone !== undefined || object.userData.index !== undefined || object.userData.dynamic === true) return;
    const owner = ownerOf(object, root);
    if (owner === null) return;
    const geometry = object.geometry as THREE.BufferGeometry;
    if (Object.keys(geometry.morphAttributes).length > 0) return;
    let cast = object.castShadow;
    if (cast && options.minShadowSize !== undefined) {
      if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
      object.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
      if ((geometry.boundingSphere?.radius ?? 0) * 2 * Math.max(scale.x, scale.y, scale.z) < options.minShadowSize) cast = false;
    }
    const layout = Object.keys(geometry.attributes).sort().join(',') + (geometry.index === null ? ':flat' : ':indexed');
    const key = `${owner.uuid}|${material.uuid}|${cast}|${object.receiveShadow}|${layout}`;
    const bucket = buckets.get(key) ?? { owner, material, cast, receive: object.receiveShadow, meshes: [] };
    bucket.meshes.push(object);
    buckets.set(key, bucket);
  });

  const retired = new Set<THREE.BufferGeometry>();
  let removed = 0;
  for (const { owner, material, cast, receive, meshes } of buckets.values()) {
    if (meshes.length < 2) {
      // Seule de son matériau : rien à fusionner, mais le seuil d'ombre s'applique.
      for (const mesh of meshes) mesh.castShadow = cast;
      continue;
    }
    const toOwner = owner.matrixWorld.clone().invert();
    const parts = meshes.map((mesh) => {
      const part = (mesh.geometry as THREE.BufferGeometry).clone();
      part.clearGroups();
      part.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toOwner, mesh.matrixWorld));
      return part;
    });
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    if (merged === null) continue;
    options.keep?.(merged);
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    owner.add(mesh);
    for (const original of meshes) {
      original.removeFromParent();
      retired.add(original.geometry as THREE.BufferGeometry);
    }
    removed += meshes.length;
  }
  // Une géométrie partagée encore utilisée par un maillage resté à part n'est pas libérée.
  root.traverse((object) => { if (object instanceof THREE.Mesh) retired.delete(object.geometry as THREE.BufferGeometry); });
  for (const geometry of retired) geometry.dispose();
  return removed;
}

// ----------------------------------------------------------------------------
// Groupe sous lequel ranger la fusion d'un maillage : le plus proche ancêtre porteur d'une
// zone de clic, sinon root. Retour : null si un ancêtre est marqué dynamic (il bouge).
// ----------------------------------------------------------------------------
function ownerOf(mesh: THREE.Object3D, root: THREE.Object3D): THREE.Object3D | null {
  let owner: THREE.Object3D | null = null;
  for (let node = mesh.parent; node !== null; node = node.parent) {
    if (node.userData.dynamic === true) return null;
    if (owner === null && node.userData.zone !== undefined) owner = node;
    if (node === root) break;
  }
  return owner ?? root;
}
