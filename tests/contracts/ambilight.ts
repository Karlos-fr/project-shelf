// ============================================================================
// AmbilightCases — Contrats des couleurs d'ambiance et de la lecture des médias
// ----------------------------------------------------------------------------
// Ces tests utilisent des pixels synthétiques, sans canevas ni navigateur.
// ============================================================================
import assert from 'node:assert/strict';
import { averageZones, canReadPixels, crossOriginFor, glowColor } from '../../src/media/ambilight.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios Ambilight auprès du runner actif.
// ----------------------------------------------------------------------------
export function registerAmbilightTests(register: RegisterCase): void {
  register('moyenne séparément les moitiés gauche et droite', zonesCase);
  register('ignore les pixels transparents', transparentCase);
  register('autorise même origine et hôtes CORS connus seulement', corsCase);
  register('ravive une teinte sans en inventer pour un gris', glowCase);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une image rouge à gauche et bleue à droite donne deux zones nettes.
// ----------------------------------------------------------------------------
function zonesCase(): void {
  const data = [255, 0, 0, 255, 0, 0, 255, 255];
  assert.deepEqual(averageZones(data, 2, 1), [{ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }]);
}

// ----------------------------------------------------------------------------
// Vérifie qu'un pixel transparent ne fausse pas la moyenne.
// ----------------------------------------------------------------------------
function transparentCase(): void {
  const data = [200, 100, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(averageZones(data, 2, 2)[0], { r: 200, g: 100, b: 0 });
}

// ----------------------------------------------------------------------------
// Vérifie la liste des sources lisibles par un canevas.
// ----------------------------------------------------------------------------
function corsCase(): void {
  const page = 'https://karlos-fr.github.io';
  assert.equal(canReadPixels('/project-shelf/media/a.mp4', page), true);
  assert.equal(canReadPixels('https://raw.githubusercontent.com/Karlos-fr/lactea/main/video/lactea-demo.mp4', page), true);
  assert.equal(canReadPixels('https://cdn.example.org/a.mp4', page), false);
  assert.equal(canReadPixels('http://raw.githubusercontent.com/a.mp4', page), false);
  assert.equal(crossOriginFor('https://raw.githubusercontent.com/a/b/main/v.mp4'), 'anonymous');
  assert.equal(crossOriginFor('https://media.githubusercontent.com/media/a/b/main/v.mp4'), 'anonymous');
  assert.equal(crossOriginFor('/media/a.mp4'), undefined);
  assert.equal(crossOriginFor('https://cdn.example.org/a.mp4'), undefined);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une teinte sombre est éclaircie et qu'un gris reste neutre.
// ----------------------------------------------------------------------------
function glowCase(): void {
  assert.equal(glowColor({ r: 60, g: 20, b: 90 }), 'rgb(185 44 255)');
  const [r, g, b] = glowColor({ r: 40, g: 40, b: 40 }).slice(4, -1).split(' ').map(Number);
  assert.ok(r === g && g === b && (r ?? 0) > 40);
  assert.equal(glowColor({ r: 0, g: 0, b: 0 }), 'rgb(0 0 0)');
}
