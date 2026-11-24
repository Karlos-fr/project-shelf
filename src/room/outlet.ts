// ============================================================================
// Outlet — Prise murale française et sa fiche branchée
// ----------------------------------------------------------------------------
// Plaque blanche carrée à bords arrondis, puits rond avec sa broche de terre, et
// fiche ronde enfoncée d'où part le câble. Le groupe a pour origine le centre de la
// plaque, contre le mur ; il regarde vers +z. cableStart donne, dans ce repère, le
// point où le câble sort de la fiche.
// ============================================================================
import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type Outlet = { group: THREE.Group; cableStart: THREE.Vector3 };

// ----------------------------------------------------------------------------
// Construit la prise et sa fiche. keep enregistre ce qu'il faudra libérer.
// Retour : le groupe et cableStart, sortie du câble dans le repère de la prise.
// ----------------------------------------------------------------------------
export function buildOutlet(keep: <V extends { dispose(): void }>(value: V) => V): Outlet {
  const group = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const white = keep(new THREE.MeshPhysicalMaterial({ color: 0xf1efe9, roughness: 0.35, clearcoat: 0.3 }));
  const shade = keep(new THREE.MeshStandardMaterial({ color: 0xd9d6ce, roughness: 0.5 }));
  // Plaque et socle de la prise.
  add(new RoundedBoxGeometry(0.082, 0.082, 0.01, 3, 0.006), white, 0, 0, 0.005);
  add(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 40), shade, 0, 0, 0.011).rotation.x = Math.PI / 2;
  // Fiche ronde enfoncée dans le puits, avec son collet un peu plus large.
  add(new THREE.CylinderGeometry(0.0185, 0.0195, 0.03, 36), white, 0, 0, 0.026).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.021, 0.021, 0.004, 36), white, 0, 0, 0.0135).rotation.x = Math.PI / 2;
  // Manchon qui protège le départ du câble, au dos de la fiche.
  add(new THREE.CylinderGeometry(0.004, 0.006, 0.012, 16), keep(new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })), 0, 0, 0.046).rotation.x = Math.PI / 2;
  return { group, cableStart: new THREE.Vector3(0, 0, 0.052) };
}
