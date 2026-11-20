// ============================================================================
// L3dCube — Cube à LED L3D 8 x 8 x 8 posé sur l'étagère de la chambre
// ----------------------------------------------------------------------------
// Reprend le modèle photographique du cube de l3d-studio (dossier l3d/, copié
// depuis app/src/cube) : boîtier d'après les plans officiels, barrettes, peignes,
// 512 LED WS2812B et Particle Photon enfiché sous la carte de base. setFrame donne
// aux LED les couleurs calculées par le Photon virtuel (virtual-cube.ts), que pilote
// le studio L3D ; setSignal allume la LED d'état du Photon comme Device OS.
// Origine : dessous du boîtier, au centre ; avant +z ; la prise d'alimentation est à
// l'arrière (POWER_JACK).
// ============================================================================
import * as THREE from 'three/webgpu';
import { buildCube } from './l3d/cube-model.ts';
import { photonLedColour } from './l3d/photon-led.ts';
import type { PhotonSignal } from './virtual-cube-worker.ts';

// Sortie de la prise jack du panneau arrière, en mètres dans le repère du cube.
export const POWER_JACK = new THREE.Vector3(0.0512, 0.0277, -0.0872);

export type L3dCube = {
  group: THREE.Group;
  // Couleurs des 512 LED en RGB (0 à 255), ordre (y, x, z) ; null les éteint.
  setFrame(rgb: Uint8Array | null): void;
  // Signal en cours de la LED d'état du Photon.
  setSignal(signal: PhotonSignal): void;
  // Applique la dernière image reçue et le motif de la LED d'état. Retour : vrai s'il faut redessiner.
  update(now: number): boolean;
};

// ----------------------------------------------------------------------------
// Construit le cube. keep enregistre ce qu'il faudra libérer.
// ----------------------------------------------------------------------------
export function buildL3dCube(keep: <V extends { dispose(): void }>(value: V) => V): L3dCube {
  const cube = buildCube();
  // Géométries, matériaux et textures du modèle, libérés avec la scène.
  const seen = new Set<{ dispose(): void }>();
  const hold = (value: { dispose(): void }) => { if (!seen.has(value)) { seen.add(value); keep(value); } };
  cube.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    hold(object.geometry as THREE.BufferGeometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      hold(material as THREE.Material);
      for (const value of Object.values(material as object)) if (value instanceof THREE.Texture) hold(value);
    }
  });
  const black = new Uint8Array(8 * 8 * 8 * 3);
  let pending: Uint8Array | null | undefined;
  let signal: PhotonSignal = 'off';
  let signalStart = 0;
  let shown = '';
  return {
    group: cube.group,
    setFrame(rgb) { pending = rgb; },
    setSignal(next) { signal = next; signalStart = performance.now(); },
    update(now) {
      let changed = false;
      if (pending !== undefined) {
        cube.setLeds(pending ?? black);
        pending = undefined;
        changed = true;
      }
      const [r, g, b] = photonLedColour(signal, now - signalStart);
      const key = `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`;
      if (key !== shown) {
        shown = key;
        cube.setStatusLed(r, g, b);
        changed = true;
      }
      return changed;
    },
  };
}
