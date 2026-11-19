// ============================================================================
// L3dCube — Cube à LED L3D 8 x 8 x 8 posé sur l'étagère de la chambre
// ----------------------------------------------------------------------------
// D'après les plans du boîtier publiés par enjrolas/L3D-Hardware (8x8x8 cube/case) :
// enveloppe en acrylique transparent de 2 mm (environ 178 x 227 mm, dessus de 171 mm),
// barrettes de 4 mm à 8 logements qui tiennent les LED, pas d'environ 21 mm. Les 512
// LED sont éteintes par défaut (plastique translucide) ; setFrame leur donne les couleurs
// calculées par le Photon virtuel (virtual-cube.ts), que pilote le studio L3D. Origine : dessous du
// socle, au centre ; avant +z ; le câble d'alimentation sort à l'arrière du socle.
// ============================================================================
import * as THREE from 'three/webgpu';

const N = 8;
const PITCH = 0.021;
const SIDE = 0.178;
const BASE_H = 0.03;
const BOX_H = 0.197;

export type L3dCube = {
  group: THREE.Group;
  // Couleurs des 512 LED en RGB (0 à 255), ordre (y, x, z) ; null les éteint.
  setFrame(rgb: Uint8Array | null): void;
  // Applique la dernière image reçue. Retour : vrai s'il faut redessiner.
  update(): boolean;
};

// ----------------------------------------------------------------------------
// Construit le cube. keep enregistre ce qu'il faudra libérer.
// ----------------------------------------------------------------------------
export function buildL3dCube(keep: <V extends { dispose(): void }>(value: V) => V): L3dCube {
  const group = new THREE.Group();
  // Socle en acrylique noir brillant, qui loge l'électronique.
  const base = new THREE.Mesh(keep(new THREE.BoxGeometry(SIDE, BASE_H, SIDE)), keep(new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 })));
  base.position.y = BASE_H / 2;
  base.castShadow = base.receiveShadow = true;
  group.add(base);
  // Enveloppe transparente : faces à peine teintées, arêtes plus visibles comme sur de l'acrylique.
  const shellGeometry = keep(new THREE.BoxGeometry(SIDE, BOX_H, SIDE));
  const shell = new THREE.Mesh(shellGeometry, keep(new THREE.MeshPhysicalMaterial({
    color: 0xeaf4ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide,
  })));
  shell.position.y = BASE_H + BOX_H / 2;
  group.add(shell);
  const edges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(shellGeometry)), keep(new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.55 })));
  edges.position.copy(shell.position);
  // Un trait se sélectionne jusqu'à 1 m du rayon par défaut : il volerait tous les clics autour du cube.
  edges.raycast = () => {};
  group.add(edges);
  // Barrettes verticales en acrylique de 4 mm : une par colonne de LED.
  const strips = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.004, BOX_H - 0.01, 0.006)), keep(new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.16, depthWrite: false,
  })), N * N);
  const start = -((N - 1) * PITCH) / 2;
  const matrix = new THREE.Matrix4();
  let k = 0;
  for (let ix = 0; ix < N; ix += 1) {
    for (let iz = 0; iz < N; iz += 1) {
      matrix.makeTranslation(start + ix * PITCH, BASE_H + BOX_H / 2, start + iz * PITCH - 0.004);
      strips.setMatrixAt(k, matrix);
      k += 1;
    }
  }
  group.add(strips);
  // 512 LED diffusantes : couleur propre à chaque instance, sans éclairage, pour qu'elles brillent.
  const leds = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.0034, 10, 8)), keep(new THREE.MeshBasicMaterial({ color: 0xffffff })), N * N * N);
  const positions: [number, number, number][] = [];
  k = 0;
  for (let iy = 0; iy < N; iy += 1) {
    for (let ix = 0; ix < N; ix += 1) {
      for (let iz = 0; iz < N; iz += 1) {
        matrix.makeTranslation(start + ix * PITCH, BASE_H + 0.02 + iy * PITCH, start + iz * PITCH);
        leds.setMatrixAt(k, matrix);
        positions.push([ix, iy, iz]);
        k += 1;
      }
    }
  }
  const colour = new THREE.Color();
  // Une LED WS2812 paraît vive même à faible rapport cyclique : courbe gamma, puis
  // gain au-delà de 1 pour que le rendu HDR la fasse briller.
  const level = new Float32Array(256).map((_, v) => (v / 255) ** 0.45 * 6);
  const paint = (rgb: Uint8Array) => {
    for (let i = 0; i < positions.length; i += 1) {
      const r = rgb[i * 3]!; const g = rgb[i * 3 + 1]!; const b = rgb[i * 3 + 2]!;
      if (r === 0 && g === 0 && b === 0) colour.setRGB(0.16, 0.17, 0.18, THREE.SRGBColorSpace);
      else colour.setRGB(level[r]!, level[g]!, level[b]!, THREE.SRGBColorSpace);
      leds.setColorAt(i, colour);
    }
    if (leds.instanceColor !== null) leds.instanceColor.needsUpdate = true;
  };
  // LED éteintes : époxy translucide gris, sans lumière propre.
  const off = () => {
    colour.setRGB(0.16, 0.17, 0.18, THREE.SRGBColorSpace);
    for (let i = 0; i < positions.length; i += 1) leds.setColorAt(i, colour);
    if (leds.instanceColor !== null) leds.instanceColor.needsUpdate = true;
  };
  off();
  group.add(leds);
  let pending: Uint8Array | null | undefined;
  return {
    group,
    setFrame(rgb) { pending = rgb; },
    update() {
      if (pending === undefined) return false;
      if (pending === null) off(); else paint(pending);
      pending = undefined;
      return true;
    },
  };
}
