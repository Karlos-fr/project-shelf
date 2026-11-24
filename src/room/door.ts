// ============================================================================
// Door — Porte de chambre blanche et interrupteur de l'ampoule
// ----------------------------------------------------------------------------
// Porte intérieure peinte en blanc satiné (83 x 204 cm) à deux panneaux moulurés,
// chambranle, trois paumelles et béquille sur plaque avec entrée de clé. À côté,
// un interrupteur à bascule sur plaque blanche, à 1,10 m du sol, qui commande
// l'ampoule du plafond. Repères : origine au pied du mur (porte : milieu du seuil ;
// interrupteur : centre de la plaque), face vers +z ; la poignée est côté -x.
// ============================================================================
import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Enregistre une ressource GPU à libérer avec la scène.
type Keep = <V extends { dispose(): void }>(value: V) => V;

// Largeur et hauteur du vantail, en mètres (porte intérieure standard de 83 x 204 cm).
export const DOOR_W = 0.83;
export const DOOR_H = 2.04;
// Largeur du chambranle autour du vantail, en mètres.
const CASING = 0.07;

// ----------------------------------------------------------------------------
// Construit la porte : vantail à deux panneaux moulurés, chambranle, paumelles, béquille.
// keep enregistre ce qu'il faudra libérer. Origine : milieu du seuil, face vers +z.
// ----------------------------------------------------------------------------
export function buildDoor(keep: Keep): THREE.Group {
  const group = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const white = keep(new THREE.MeshPhysicalMaterial({ color: 0xf3f1ec, roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.35 }));
  const gap = keep(new THREE.MeshStandardMaterial({ color: 0x2b2924, roughness: 0.9 }));
  const metal = keep(new THREE.MeshPhysicalMaterial({ color: 0xc9c2b2, metalness: 1, roughness: 0.32 }));
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  // Jour de 3 mm tout autour du vantail, sombre, entre le chambranle et la porte.
  add(new THREE.BoxGeometry(DOOR_W + 0.006, DOOR_H + 0.003, 0.002), gap, 0, (DOOR_H + 0.003) / 2, 0.001);
  // Vantail.
  add(new RoundedBoxGeometry(DOOR_W, DOOR_H, 0.04, 2, 0.004), white, 0, DOOR_H / 2, 0.012);
  // Deux panneaux en relief, celui du haut plus grand, chacun cerné d'une moulure.
  const panel = (y: number, h: number) => {
    const w = DOOR_W - 0.22;
    add(new RoundedBoxGeometry(w, h, 0.006, 2, 0.002), white, 0, y, 0.034);
    for (const [mx, my, mw, mh] of [[0, y + h / 2 + 0.012, w + 0.048, 0.024], [0, y - h / 2 - 0.012, w + 0.048, 0.024], [-w / 2 - 0.012, y, 0.024, h], [w / 2 + 0.012, y, 0.024, h]] as const) {
      add(new RoundedBoxGeometry(mw, mh, 0.01, 2, 0.003), white, mx, my, 0.035);
    }
  };
  panel(1.42, 0.86);
  panel(0.5, 0.62);
  // Chambranle : deux montants et une traverse, un peu en saillie sur le mur.
  add(new RoundedBoxGeometry(CASING, DOOR_H + CASING, 0.016, 2, 0.004), white, -(DOOR_W + CASING) / 2, (DOOR_H + CASING) / 2, 0.008);
  add(new RoundedBoxGeometry(CASING, DOOR_H + CASING, 0.016, 2, 0.004), white, (DOOR_W + CASING) / 2, (DOOR_H + CASING) / 2, 0.008);
  add(new RoundedBoxGeometry(DOOR_W + 2 * CASING, CASING, 0.016, 2, 0.004), white, 0, DOOR_H + CASING / 2, 0.008);
  // Paumelles côté +x.
  for (const y of [0.22, 1.02, 1.82]) {
    add(new THREE.CylinderGeometry(0.007, 0.007, 0.1, 16), metal, DOOR_W / 2 + 0.002, y, 0.034);
  }
  // Béquille sur plaque, côté -x, à 1,02 m ; entrée de clé sous la poignée.
  const hx = -DOOR_W / 2 + 0.055;
  add(new RoundedBoxGeometry(0.042, 0.2, 0.008, 2, 0.003), metal, hx, 0.98, 0.036);
  const rose = add(new THREE.CylinderGeometry(0.011, 0.013, 0.03, 20), metal, hx, 1.02, 0.054);
  rose.rotation.x = Math.PI / 2;
  const lever = add(new RoundedBoxGeometry(0.13, 0.018, 0.014, 2, 0.006), metal, hx + 0.058, 1.02, 0.068);
  lever.rotation.z = -0.03;
  add(new RoundedBoxGeometry(0.008, 0.02, 0.004, 1, 0.002), dark, hx, 0.92, 0.041);
  return group;
}

export type LightSwitch = { group: THREE.Group; setOn(on: boolean): void };

// ----------------------------------------------------------------------------
// Construit l'interrupteur à bascule sur sa plaque. Il porte la zone « switch » : un clic
// dessus allume ou éteint l'ampoule. Retour : le groupe et setOn, qui bascule la touche.
// ----------------------------------------------------------------------------
export function buildLightSwitch(keep: Keep): LightSwitch {
  const group = new THREE.Group();
  group.userData.zone = 'switch';
  const white = keep(new THREE.MeshPhysicalMaterial({ color: 0xf1efe9, roughness: 0.35, clearcoat: 0.3 }));
  const plate = new THREE.Mesh(keep(new RoundedBoxGeometry(0.082, 0.082, 0.01, 3, 0.006)), white);
  plate.position.z = 0.005;
  const rocker = new THREE.Mesh(keep(new RoundedBoxGeometry(0.05, 0.05, 0.01, 3, 0.004)), white);
  rocker.position.z = 0.012;
  for (const mesh of [plate, rocker]) { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
  return {
    group,
    // Allumé : le haut de la bascule est enfoncé.
    setOn(on) { rocker.rotation.x = on ? 0.12 : -0.12; },
  };
}
