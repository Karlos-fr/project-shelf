// ============================================================================
// RoomMesh — Outils de construction communs aux meubles et à la pièce
// ----------------------------------------------------------------------------
// Types partagés (keep, fabrique de bois) et pose d'un maillage dont la géométrie est
// enregistrée pour être libérée avec la scène. Aucun objet n'est créé au chargement.
// ============================================================================
import * as THREE from 'three/webgpu';
import type { PbrSet, WoodOptions } from '../shelf/shelf-materials.ts';

// Enregistre une ressource GPU (géométrie, matériau, texture) à libérer avec la scène.
export type Keep = <V extends { dispose(): void }>(value: V) => V;
// Matériau bois d'une essence, déjà enregistré pour être libéré.
export type WoodFactory = (set: PbrSet, options: WoodOptions) => THREE.Material;
// Pose un maillage sous parent en (x, y, z) ; shadows règle ombre portée et reçue.
export type MeshAdder = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x: number, y: number, z: number, shadows?: boolean) => THREE.Mesh;

// ----------------------------------------------------------------------------
// Fabrique la fonction de pose d'un maillage ; chaque géométrie passe par keep.
// ----------------------------------------------------------------------------
export function meshAdder(keep: Keep): MeshAdder {
  return (parent, geometry, material, x, y, z, shadows = true) => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = shadows;
    parent.add(mesh);
    return mesh;
  };
}
