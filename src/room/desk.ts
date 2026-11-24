// ============================================================================
// Desk — Bureau en hêtre clair, à caisson de trois tiroirs
// ----------------------------------------------------------------------------
// Plateau verni, caisson à gauche, flanc plein à droite, voile de fond et ceinture,
// boutons de tiroir tournés. Le groupe a pour origine le sol, au centre du plateau ;
// l'avant regarde vers +z. La scène y pose le PC et la pile de magazines.
// ============================================================================
import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BEECH, DESK } from './room-layout.ts';
import { meshAdder, type Keep, type WoodFactory } from './room-mesh.ts';
import type { PbrSet } from '../shelf/shelf-materials.ts';

// ----------------------------------------------------------------------------
// Construit le bureau. pbr fabrique le bois ; beech est la texture du hêtre.
// ----------------------------------------------------------------------------
export function buildDesk(keep: Keep, pbr: WoodFactory, beech: PbrSet): THREE.Group {
  const add = meshAdder(keep);
  // Hêtre clair verni, comme la chaise et l'étagère : des meubles blonds des années 90.
  const deskWood = (ru: number, rv: number, rotate = false, ox = 0) =>
    pbr(beech, { ru, rv, rotate, ox, oy: ox * 0.7, ...BEECH, coat: 0.45, coatRoughness: 0.22, dust: 0.1 });
  const desk = new THREE.Group();
  const { w: dw, d: dd, h: dh } = DESK;
  add(desk, new RoundedBoxGeometry(dw, 0.03, dd, 3, 0.006), deskWood(dw, dd), 0, dh - 0.015, 0);
  // Caisson à trois tiroirs à gauche, flanc plein à droite, voile de fond.
  const cw = 0.42;
  const cx = -dw / 2 + cw / 2 + 0.02;
  const carcass = dh - 0.03;
  for (const sx of [cx - cw / 2 + 0.01, cx + cw / 2 - 0.01]) add(desk, new RoundedBoxGeometry(0.02, carcass, dd - 0.04, 2, 0.003), deskWood(0.9, 0.4, true, sx), sx, carcass / 2, -0.01);
  add(desk, new RoundedBoxGeometry(0.03, carcass, dd - 0.04, 2, 0.004), deskWood(0.9, 0.4, true, 0.3), dw / 2 - 0.04, carcass / 2, -0.01);
  const spanL = cx + cw / 2;
  const spanR = dw / 2 - 0.055;
  add(desk, new RoundedBoxGeometry(spanR - spanL, 0.34, 0.015, 2, 0.003), deskWood(1.2, 0.5, false, 0.6), (spanL + spanR) / 2, dh - 0.03 - 0.17, -dd / 2 + 0.03);
  add(desk, new RoundedBoxGeometry(spanR - spanL, 0.06, 0.02, 2, 0.003), deskWood(1.3, 0.1, false, 0.2), (spanL + spanR) / 2, dh - 0.06, dd / 2 - 0.04);
  add(desk, new RoundedBoxGeometry(cw, 0.06, dd - 0.04, 2, 0.003), deskWood(0.6, 0.3, false, 0.9), cx, 0.03, -0.01);
  const knobMaterial = deskWood(0.2, 0.2, true, 0.4);
  const drawerH = (carcass - 0.08) / 3;
  for (let k = 0; k < 3; k += 1) {
    const y = 0.07 + drawerH * (k + 0.5);
    add(desk, new RoundedBoxGeometry(cw - 0.03, drawerH - 0.012, 0.022, 3, 0.005), deskWood(0.6, 0.3, false, k * 0.31), cx, y, dd / 2 - 0.03);
    const knob = add(desk, new THREE.LatheGeometry(knobProfile(), 24), knobMaterial, cx, y, dd / 2 - 0.019);
    knob.rotation.x = Math.PI / 2;
  }
  return desk;
}

// Bouton de tiroir tourné, posé sur l'axe y.
function knobProfile(): THREE.Vector2[] {
  const p = (r: number, y: number) => new THREE.Vector2(r, y);
  return [p(0.001, 0), p(0.009, 0), p(0.006, 0.008), p(0.007, 0.014), p(0.015, 0.02), p(0.016, 0.026), p(0.012, 0.032), p(0.001, 0.034)];
}
