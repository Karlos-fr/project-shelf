// ============================================================================
// RoomLights — Éclairage de la chambre : jour, ciel, ambiance et ampoule
// ----------------------------------------------------------------------------
// HDRI atténué, soleil de fin d'après-midi par la fenêtre, lumière surfacique du ciel,
// hémisphère d'ambiance et ampoule nue du plafond. Les cartes d'ombre ne sont recalculées
// que sur demande (needsUpdate) : la scène les relance quand une boîte de l'étagère bouge.
// ============================================================================
import * as THREE from 'three/webgpu';
import { softPointShadow } from './soft-point-shadow.ts';
import { BACK, BULB, WIN } from './room-layout.ts';

export type RoomLights = {
  // Soleil qui porte ombre par la fenêtre.
  sun: THREE.DirectionalLight;
  // Ampoule du plafond, éteinte ou allumée par l'interrupteur.
  bulbLight: THREE.PointLight;
};

// ----------------------------------------------------------------------------
// Ajoute les lumières à scene. hdr est l'environnement (salon Poly Haven, CC0).
// Retour : soleil et ampoule, dont la scène commande les ombres et l'intensité.
// ----------------------------------------------------------------------------
export function addRoomLights(scene: THREE.Scene, hdr: THREE.Texture): RoomLights {
  // Le HDRI d'un vrai salon (Poly Haven, CC0) donne reflets et lumière ambiante, atténués :
  // la pièce est close, l'essentiel du jour entre par la fenêtre.
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr;
  scene.environmentIntensity = 0.3;
  scene.environmentRotation = new THREE.Euler(0, 2.2, 0);
  // Soleil de fin d'après-midi par la fenêtre : les murs portent ombre, seule l'ouverture laisse passer.
  const sun = new THREE.DirectionalLight(0xffeedd, 7);
  // Le faisceau traverse la fenêtre et tombe sur le parquet entre le bureau et l'étagère.
  sun.target.position.set(-0.45, 0, -0.35);
  sun.position.copy(sun.target.position).add(new THREE.Vector3(1.5, 1.575, -1.25).multiplyScalar(3));
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  // Ombre VSM : bord flouté une fois pour toutes dans la carte, sans le bruit par pixel du PCF.
  sun.shadow.radius = 3;
  sun.shadow.blurSamples = 8;
  // La pièce est immobile : la carte d'ombre (2048²) n'est recalculée que quand une boîte bouge.
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  Object.assign(sun.shadow.camera, { left: -3.8, right: 3.8, top: 3.8, bottom: -3.8, near: 0.5, far: 12 });
  scene.add(sun, sun.target);
  // Ciel vu par la fenêtre : une lumière surfacique douce et froide, sans ombre.
  const skyLight = new THREE.RectAreaLight(0xdce8ff, 5, WIN.w, WIN.y1 - WIN.y0);
  skyLight.position.set(WIN.x, (WIN.y0 + WIN.y1) / 2, BACK - 0.02);
  skyLight.lookAt(WIN.x, (WIN.y0 + WIN.y1) / 2, 0);
  scene.add(skyLight);
  // Ambiance : ciel neutre en haut, rebond clair du parquet en bas ; ce rebond éclaire
  // aussi le plafond, qui sinon paraissait presque noir.
  scene.add(new THREE.HemisphereLight(0xeef1f5, 0xb3a897, 0.8));
  // Ampoule nue au bout de son fil, au milieu du plafond : ombres nettes au bord légèrement
  // dégradé, sans bruit (soft-point-shadow.ts), recalculées seulement quand une boîte bouge.
  const bulbLight = new THREE.PointLight(0xffd9a8, 6, 0, 2);
  bulbLight.position.set(BULB.x, BULB.y, BULB.z);
  bulbLight.castShadow = true;
  bulbLight.shadow.mapSize.setScalar(2048);
  (bulbLight.shadow as unknown as { filterNode: unknown }).filterNode = softPointShadow(1);
  bulbLight.shadow.bias = -0.002;
  bulbLight.shadow.normalBias = 0;
  Object.assign(bulbLight.shadow.camera, { near: 0.08, far: 6 });
  bulbLight.shadow.autoUpdate = false;
  bulbLight.shadow.needsUpdate = true;
  scene.add(bulbLight);
  return { sun, bulbLight };
}
