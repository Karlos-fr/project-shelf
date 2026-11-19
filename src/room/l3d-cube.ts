// ============================================================================
// L3dCube — Cube à LED L3D 8 x 8 x 8 posé sur l'étagère de la chambre
// ----------------------------------------------------------------------------
// D'après les plans du boîtier publiés par enjrolas/L3D-Hardware (8x8x8 cube/case) :
// enveloppe en acrylique transparent de 2 mm (environ 178 x 227 mm, dessus de 171 mm),
// barrettes de 4 mm à 8 logements qui tiennent les LED, pas d'environ 21 mm. Les 512
// LED sont des instances lumineuses animées en arc-en-ciel ; le studio L3D de l'auteur
// pourra plus tard piloter ces couleurs. Origine : dessous du socle, au centre ; avant +z.
// ============================================================================
import * as THREE from 'three/webgpu';

const N = 8;
const PITCH = 0.021;
const SIDE = 0.178;
const BASE_H = 0.03;
const BOX_H = 0.197;

export type L3dCube = {
  group: THREE.Group;
  // Met les couleurs à jour à 20 images par seconde quand animate est vrai.
  // Retour : vrai si les LED ont changé et qu'il faut redessiner.
  update(time: number, animate: boolean): boolean;
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
  // Motif « plasma » : la teinte ondule dans l'espace et dans le temps.
  const paint = (time: number) => {
    const t = time / 1000;
    positions.forEach(([x, y, z], i) => {
      const wave = Math.sin(x * 0.7 + t * 1.3) + Math.sin(y * 0.6 - t * 0.9) + Math.sin((x + z) * 0.5 + t * 0.7);
      const hue = (wave / 6 + 0.5 + t * 0.05) % 1;
      const glow = 0.55 + 0.45 * Math.sin(z * 0.8 + y * 0.4 + t * 2);
      colour.setHSL(hue, 1, 0.35 + 0.25 * glow, THREE.SRGBColorSpace);
      colour.multiplyScalar(2.2);
      leds.setColorAt(i, colour);
    });
    if (leds.instanceColor !== null) leds.instanceColor.needsUpdate = true;
  };
  paint(0);
  group.add(leds);
  let last = 0;
  return {
    group,
    update(time, animate) {
      if (!animate || time - last < 50) return false;
      last = time;
      paint(time);
      return true;
    },
  };
}
