// ============================================================================
// LedClock — Horloge murale radiopilotée à LED bleues, à l'heure de Paris
// ----------------------------------------------------------------------------
// D'après la Lunartec « horloge digitale murale radiopilotée 60 LED » (27,5 x 27,5 x 6 cm) :
// cadre fin en métal noir, vitre fumée presque affleurante, deux panneaux sombres portant
// chacun deux chiffres à sept segments faits de LED rondes, deux points entre eux,
// couronne de 60 LED qui s'allument une à une avec les secondes, pictogramme d'antenne
// en haut et « LED CLOCK » en bas. Les LED éteintes restent devinées derrière la vitre
// (le « 88:88 » de l'horloge débranchée). L'affichage est peint sur une toile ; la scène
// fournit l'heure. Origine : centre de l'horloge contre le mur ; l'avant regarde vers +z.
// ============================================================================
import * as THREE from 'three/webgpu';
import type { ClockTime } from './daylight.ts';
import type { Keep } from './room-mesh.ts';
import { canvas2d } from '../shelf/shelf-materials.ts';

// Côté et épaisseur du boîtier, en mètres.
export const CLOCK_SIZE = 0.275;
export const CLOCK_DEPTH = 0.06;
// Largeur visible du cadre métallique autour de la vitre, en mètres.
const FRAME_LIP = 0.009;
// Côté de la toile de l'affichage, en pixels.
const FACE_PX = 512;
// Bleu des LED allumées et gris des LED éteintes vues à travers la vitre fumée.
const LED_ON = '#3d6bff';
const LED_OFF = 'rgba(150, 158, 175, 0.2)';
// Segments allumés de chaque chiffre, dans l'ordre a (haut), b (haut droit), c (bas droit),
// d (bas), e (bas gauche), f (haut gauche), g (milieu).
const SEGMENTS: readonly string[] = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];
// LED d'un chiffre sur une grille de 5 colonnes x 7 lignes : chaque LED appartient à un ou
// plusieurs segments (les coins sont partagés), et s'allume si l'un d'eux est allumé.
const DIGIT_LEDS: readonly { col: number; row: number; segments: string }[] = [
  { col: 0, row: 0, segments: 'af' }, { col: 1, row: 0, segments: 'a' }, { col: 2, row: 0, segments: 'a' }, { col: 3, row: 0, segments: 'a' }, { col: 4, row: 0, segments: 'ab' },
  { col: 0, row: 1, segments: 'f' }, { col: 4, row: 1, segments: 'b' },
  { col: 0, row: 2, segments: 'f' }, { col: 4, row: 2, segments: 'b' },
  { col: 0, row: 3, segments: 'efg' }, { col: 1, row: 3, segments: 'g' }, { col: 2, row: 3, segments: 'g' }, { col: 3, row: 3, segments: 'g' }, { col: 4, row: 3, segments: 'bcg' },
  { col: 0, row: 4, segments: 'e' }, { col: 4, row: 4, segments: 'c' },
  { col: 0, row: 5, segments: 'e' }, { col: 4, row: 5, segments: 'c' },
  { col: 0, row: 6, segments: 'de' }, { col: 1, row: 6, segments: 'd' }, { col: 2, row: 6, segments: 'd' }, { col: 3, row: 6, segments: 'd' }, { col: 4, row: 6, segments: 'cd' },
];

export type LedClock = {
  group: THREE.Group;
  // Affiche l'heure donnée. Retour : vrai si l'affichage a changé (une fois par seconde).
  show(time: ClockTime): boolean;
};

// ----------------------------------------------------------------------------
// Construit l'horloge. keep enregistre ce qu'il faudra libérer ; anisotropy est le
// filtrage maximal du GPU, pour l'affichage vu de biais.
// ----------------------------------------------------------------------------
export function buildLedClock(keep: Keep, anisotropy: number): LedClock {
  const group = new THREE.Group();
  // Boîtier et cadre en métal laqué noir mat : un caisson, puis quatre baguettes fines qui
  // dépassent un peu de la vitre (peu métallique, sinon l'ampoule le dore).
  const metal = keep(new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.6, metalness: 0.05 }));
  const body = new THREE.Mesh(keep(new THREE.BoxGeometry(CLOCK_SIZE - 0.004, CLOCK_SIZE - 0.004, CLOCK_DEPTH - 0.004)), metal);
  body.position.z = (CLOCK_DEPTH - 0.004) / 2;
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  const half = CLOCK_SIZE / 2;
  const lipDepth = 0.006;
  for (const [w, h, x, y] of [
    [CLOCK_SIZE, FRAME_LIP, 0, half - FRAME_LIP / 2], [CLOCK_SIZE, FRAME_LIP, 0, -half + FRAME_LIP / 2],
    [FRAME_LIP, CLOCK_SIZE - 2 * FRAME_LIP, -half + FRAME_LIP / 2, 0], [FRAME_LIP, CLOCK_SIZE - 2 * FRAME_LIP, half - FRAME_LIP / 2, 0],
  ] as const) {
    const lip = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, lipDepth)), metal);
    lip.position.set(x, y, CLOCK_DEPTH - lipDepth / 2);
    lip.castShadow = lip.receiveShadow = true;
    group.add(lip);
  }
  // Vitre fumée : quasi noire, très brillante ; les LED y brillent par la carte émissive.
  const [canvas, context] = canvas2d(FACE_PX, FACE_PX);
  const display = keep(new THREE.CanvasTexture(canvas));
  display.colorSpace = THREE.SRGBColorSpace;
  display.anisotropy = anisotropy;
  // Les reflets de l'environnement (le HDRI d'un salon éclairé) sont atténués : sur une vitre
  // aussi noire, ils dessinaient une tache claire qui ne vient d'aucune lampe de la chambre.
  const glass = keep(new THREE.MeshPhysicalMaterial({
    color: 0x030405, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02,
    emissive: 0xffffff, emissiveMap: display, emissiveIntensity: 2.2, envMapIntensity: 0.2,
  }));
  const face = new THREE.Mesh(keep(new THREE.PlaneGeometry(CLOCK_SIZE - 2 * FRAME_LIP, CLOCK_SIZE - 2 * FRAME_LIP)), glass);
  face.position.z = CLOCK_DEPTH - 0.002;
  face.receiveShadow = true;
  group.add(face);
  let shown = '';
  return {
    group,
    show(time) {
      const key = `${time.hours}:${time.minutes}:${time.seconds}`;
      if (key === shown) return false;
      shown = key;
      paintFace(context, time);
      display.needsUpdate = true;
      return true;
    },
  };
}

// ----------------------------------------------------------------------------
// Peint l'affichage : couronne des secondes (allumée de 0 à la seconde courante), deux
// panneaux sombres avec leurs chiffres à segments, deux points (qui clignotent à chaque
// seconde), antenne et marque. Les LED éteintes sont peintes en gris pâle.
// ----------------------------------------------------------------------------
function paintFace(context: CanvasRenderingContext2D, time: ClockTime): void {
  const size = FACE_PX;
  const center = size / 2;
  context.fillStyle = '#000000';
  context.fillRect(0, 0, size, size);
  // LED ronde : halo et éclat blanc au centre si elle est allumée, simple lentille grise sinon.
  const led = (x: number, y: number, radius: number, on: boolean) => {
    if (on) {
      const halo = context.createRadialGradient(x, y, 0, x, y, radius * 2.4);
      halo.addColorStop(0, 'rgba(70, 120, 255, 0.6)');
      halo.addColorStop(1, 'rgba(40, 80, 255, 0)');
      context.fillStyle = halo;
      context.beginPath(); context.arc(x, y, radius * 2.4, 0, Math.PI * 2); context.fill();
    }
    context.fillStyle = on ? LED_ON : LED_OFF;
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
    context.fillStyle = on ? 'rgba(225, 235, 255, 0.9)' : 'rgba(210, 215, 225, 0.12)';
    context.beginPath(); context.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.42, 0, Math.PI * 2); context.fill();
  };
  // Couronne de 60 LED, la première en haut, dans le sens des aiguilles d'une montre.
  const ring = size * 0.445;
  for (let k = 0; k < 60; k += 1) {
    const angle = (k / 60) * Math.PI * 2 - Math.PI / 2;
    led(center + Math.cos(angle) * ring, center + Math.sin(angle) * ring, 5, k <= time.seconds);
  }
  // Deux panneaux sombres (heures, minutes), chacun portant deux chiffres de 5 x 7 LED.
  const pitch = 16;
  const digitW = 4 * pitch;
  const digitGap = 38;
  const pad = 10;
  const panelW = 2 * digitW + digitGap + 2 * pad;
  const panelH = 6 * pitch + 2 * pad + 4;
  const colonGap = 34;
  const top = center - 3 * pitch;
  const panels = [center - colonGap / 2 - panelW, center + colonGap / 2];
  const digits = [Math.floor(time.hours / 10), time.hours % 10, Math.floor(time.minutes / 10), time.minutes % 10];
  panels.forEach((left, p) => {
    context.fillStyle = 'rgba(120, 130, 150, 0.15)';
    context.strokeStyle = 'rgba(170, 180, 200, 0.2)';
    context.lineWidth = 1.5;
    context.beginPath(); context.roundRect(left, top - pad - 2, panelW, panelH, 4); context.fill(); context.stroke();
    for (let d = 0; d < 2; d += 1) {
      const value = digits[p * 2 + d] ?? 0;
      const lit = SEGMENTS[value] ?? '';
      const x0 = left + pad + d * (digitW + digitGap);
      // Chiffres légèrement penchés, comme sur l'horloge.
      for (const { col, row, segments } of DIGIT_LEDS) {
        const on = [...segments].some((segment) => lit.includes(segment));
        led(x0 + col * pitch + (3 - row) * 1.2, top + row * pitch, 5.6, on);
      }
    }
  });
  // Deux points entre heures et minutes, allumés une seconde sur deux.
  led(center, top + 2 * pitch, 5.6, time.seconds % 2 === 0);
  led(center, top + 4 * pitch, 5.6, time.seconds % 2 === 0);
  // Pictogramme d'antenne (réception du signal horaire) : mât, point et ondes de part et d'autre.
  const ax = center; const ay = size * 0.2;
  context.strokeStyle = 'rgba(175, 182, 198, 0.6)';
  context.fillStyle = 'rgba(175, 182, 198, 0.6)';
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(ax - 4, ay + 16); context.lineTo(ax, ay); context.lineTo(ax + 4, ay + 16); context.stroke();
  context.beginPath(); context.arc(ax, ay, 2.5, 0, Math.PI * 2); context.fill();
  for (const r of [6, 10, 14]) {
    context.beginPath(); context.arc(ax, ay, r, -Math.PI * 0.75, -Math.PI * 0.25); context.stroke();
  }
  // Marque, en lettres grises discrètes.
  context.font = '500 15px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('LED   CLOCK', center, size * 0.75);
}
