// ============================================================================
// Chair — Chaise paysanne en hêtre, assise paillée
// ----------------------------------------------------------------------------
// Pieds avant tournés, montants arrière inclinés prolongés en dossier à trois barrettes
// cintrées, traverses et barreaux, assise en paille tressée (toile dessinée et relief).
// Le groupe a pour origine le sol au centre de la chaise ; l'avant regarde vers -z.
// ============================================================================
import * as THREE from 'three/webgpu';
import { BEECH } from './room-layout.ts';
import { meshAdder, type Keep, type WoodFactory } from './room-mesh.ts';
import { canvas2d, printNormal, seeded, type PbrSet } from '../shelf/shelf-materials.ts';

// ----------------------------------------------------------------------------
// Construit la chaise. pbr fabrique le bois ; beech est la texture du hêtre ; maxAniso
// est le filtrage maximal du GPU, pour la paille vue de biais.
// ----------------------------------------------------------------------------
export function buildChair(keep: Keep, pbr: WoodFactory, beech: PbrSet, maxAniso: number): THREE.Group {
  const add = meshAdder(keep);
  const parent = new THREE.Group();
  // Hêtre clair et ciré ; les pièces tournées suivent le fil du bois.
  const beechWood = (seed: number) => pbr(beech, { ru: 0.5, rv: 0.12, rotate: true, ox: seed * 0.23, oy: seed * 0.17, coat: 0.25, coatRoughness: 0.35, ...BEECH, dust: 0.05 });
  const seatY = 0.45;
  // Pieds avant tournés.
  for (const side of [-1, 1]) {
    add(parent, new THREE.LatheGeometry(legProfile(seatY), 28), beechWood(side + 2), side * 0.2, 0, -0.17);
  }
  // Pieds arrière prolongés en montants, légèrement inclinés vers l'arrière.
  const tilt = 0.09;
  const backTop = 0.97;
  for (const side of [-1, 1]) {
    const post = add(parent, new THREE.LatheGeometry(postProfile(backTop), 28), beechWood(side + 5), side * 0.165, 0, 0.17);
    post.rotation.x = tilt;
  }
  const backZ = (y: number) => 0.17 + Math.tan(tilt) * y;
  // Traverses rondes sous l'assise et barreaux bas.
  const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number, seed: number) => {
    const length = a.distanceTo(b);
    const mesh = add(parent, new THREE.CylinderGeometry(r, r, length, 18), beechWood(seed), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  };
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  rod(v(-0.2, seatY - 0.02, -0.17), v(0.2, seatY - 0.02, -0.17), 0.013, 1);
  rod(v(-0.165, seatY - 0.02, backZ(seatY - 0.02)), v(0.165, seatY - 0.02, backZ(seatY - 0.02)), 0.013, 2);
  for (const side of [-1, 1]) {
    rod(v(side * 0.2, seatY - 0.02, -0.17), v(side * 0.165, seatY - 0.02, backZ(seatY - 0.02)), 0.013, 3 + side);
    rod(v(side * 0.2, 0.16, -0.17), v(side * 0.165, 0.16, backZ(0.16)), 0.011, 6 + side);
    rod(v(side * 0.2, 0.27, -0.17), v(side * 0.165, 0.27, backZ(0.27)), 0.011, 8 + side);
  }
  rod(v(-0.2, 0.2, -0.17), v(0.2, 0.2, -0.17), 0.011, 11);
  rod(v(-0.165, 0.2, backZ(0.2)), v(0.165, 0.2, backZ(0.2)), 0.011, 12);
  // Dossier à trois barrettes cintrées.
  for (const [k, y] of [0.63, 0.75, 0.87].entries()) {
    const geometry = new THREE.BoxGeometry(0.33, 0.045, 0.012, 24, 1, 1);
    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i += 1) position.setZ(i, position.getZ(i) + (position.getX(i) ** 2) * 0.35);
    geometry.computeVertexNormals();
    const slat = add(parent, geometry, beechWood(14 + k), 0, y, backZ(y) - 0.02);
    slat.rotation.x = tilt;
  }
  // Assise paillée : quatre triangles de cordes torsadées qui convergent au centre.
  const rushCanvas = rushSeatCanvas(1024);
  const rushMap = keep(new THREE.CanvasTexture(rushCanvas));
  rushMap.colorSpace = THREE.SRGBColorSpace;
  rushMap.anisotropy = maxAniso;
  const rushNormal = keep(printNormal(rushCanvas, 5, 0.04, 1024));
  for (const map of [rushMap, rushNormal]) { map.repeat.set(1 / 0.44, 1 / 0.38); map.offset.set(0.5, 0.5); }
  const seat = new THREE.Shape([v(-0.22, 0.19, 0), v(0.22, 0.19, 0), v(0.18, -0.19, 0), v(-0.18, -0.19, 0)].map((p) => new THREE.Vector2(p.x, p.y)));
  const seatGeometry = new THREE.ExtrudeGeometry(seat, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4 });
  seatGeometry.rotateX(-Math.PI / 2);
  add(parent, seatGeometry, keep(new THREE.MeshPhysicalMaterial({ map: rushMap, normalMap: rushNormal, normalScale: new THREE.Vector2(1, 1), roughness: 0.78, sheen: 0.4, sheenColor: new THREE.Color(0xffe6a8) })), 0, seatY - 0.012, 0.0);
  return parent;
}

// Pied avant : sabot, fût galbé, bague, puis tenon sous l'assise.
function legProfile(height: number): THREE.Vector2[] {
  const p = (r: number, y: number) => new THREE.Vector2(r, y);
  return [p(0.001, 0), p(0.017, 0), p(0.019, 0.01), p(0.016, 0.04), p(0.015, 0.12), p(0.018, 0.2), p(0.02, 0.3),
    p(0.024, 0.33), p(0.02, 0.345), p(0.021, 0.4), p(0.019, height - 0.01), p(0.001, height)];
}

// Montant arrière : comme le pied avant, prolongé jusqu'au chapeau du dossier.
function postProfile(height: number): THREE.Vector2[] {
  const p = (r: number, y: number) => new THREE.Vector2(r, y);
  return [p(0.001, 0), p(0.017, 0), p(0.019, 0.01), p(0.016, 0.04), p(0.016, 0.3), p(0.02, 0.33), p(0.017, 0.345),
    p(0.016, 0.6), p(0.017, height - 0.06), p(0.021, height - 0.04), p(0.016, height - 0.02), p(0.012, height - 0.004), p(0.001, height)];
}

// ----------------------------------------------------------------------------
// Paille tressée vue de dessus : quatre triangles de cordes parallèles à chaque bord,
// avec torsades, teintes de paille et joints sombres. Retour : toile carrée.
// ----------------------------------------------------------------------------
function rushSeatCanvas(size: number): HTMLCanvasElement {
  const [canvas, context] = canvas2d(size, size);
  const rand = seeded(41);
  const half = size / 2;
  const step = size / 64;
  const tones = ['#c9a35a', '#b98f47', '#d4b06a', '#a87f3c', '#c29a50'];
  for (let side = 0; side < 4; side += 1) {
    context.save();
    context.translate(half, half);
    context.rotate((side * Math.PI) / 2);
    context.translate(-half, -half);
    // Triangle du bord haut : du coin gauche au coin droit, pointe au centre.
    context.beginPath();
    context.moveTo(0, 0); context.lineTo(size, 0); context.lineTo(half, half); context.closePath();
    context.clip();
    context.fillStyle = '#5a4120';
    context.fillRect(0, 0, size, half);
    for (let y = 0; y < half; y += step) {
      context.fillStyle = tones[Math.floor(rand() * tones.length)] ?? '#c9a35a';
      context.fillRect(0, y + step * 0.08, size, step * 0.84);
      // Torsades : courts traits obliques plus sombres et reflets.
      for (let x = 0; x < size; x += step * 0.9) {
        context.globalAlpha = 0.35 + rand() * 0.25;
        context.strokeStyle = '#6e5026';
        context.lineWidth = step * 0.12;
        context.beginPath(); context.moveTo(x, y + step * 0.1); context.lineTo(x + step * 0.5, y + step * 0.9); context.stroke();
        context.globalAlpha = 0.25;
        context.strokeStyle = '#f2dc9a';
        context.lineWidth = step * 0.08;
        context.beginPath(); context.moveTo(x + step * 0.3, y + step * 0.15); context.lineTo(x + step * 0.7, y + step * 0.8); context.stroke();
      }
      context.globalAlpha = 1;
    }
    context.restore();
  }
  // Diagonales : les cordes se croisent et laissent un sillon sombre.
  context.strokeStyle = 'rgba(60,40,16,0.7)';
  context.lineWidth = step * 0.25;
  context.beginPath(); context.moveTo(0, 0); context.lineTo(size, size); context.moveTo(size, 0); context.lineTo(0, size); context.stroke();
  return canvas;
}
