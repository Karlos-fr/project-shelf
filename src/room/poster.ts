// ============================================================================
// Poster — Affiche « I WANT TO BELIEVE » scotchée au mur de la chambre
// ----------------------------------------------------------------------------
// Reproduction peinte pour le projet de l'affiche culte des années 90 : soucoupe à
// étages au-dessus d'une ligne d'arbres, ciel gris, photo noir et blanc granuleuse et
// slogan en capitales. Aucune image d'origine n'est copiée. Le groupe a pour origine
// le centre de l'affiche ; elle regarde vers +z, papier légèrement ondulé et quatre
// morceaux de scotch aux coins.
// ============================================================================
import * as THREE from 'three/webgpu';
import { canvas2d, seeded } from '../shelf/shelf-materials.ts';

// Format 2:3 d'une affiche de chambre (environ 56 x 84 cm).
export const POSTER_W = 0.56;
export const POSTER_H = 0.84;

// ----------------------------------------------------------------------------
// Construit l'affiche et ses scotchs. keep enregistre ce qu'il faudra libérer.
// ----------------------------------------------------------------------------
export function buildPoster(keep: <V extends { dispose(): void }>(value: V) => V, anisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const map = keep(new THREE.CanvasTexture(posterCanvas(1024, 1536)));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  // Papier photo un peu satiné, gondolé par l'humidité de la chambre.
  const geometry = new THREE.PlaneGeometry(POSTER_W, POSTER_H, 24, 36);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i) / POSTER_W;
    const y = position.getY(i) / POSTER_H;
    position.setZ(i, 0.003 * Math.sin(y * 9 + x * 3) * (1 - Math.abs(x) * 1.2) + 0.002 * Math.abs(x * y) * 4);
  }
  geometry.computeVertexNormals();
  const paper = new THREE.Mesh(keep(geometry), keep(new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.35 })));
  paper.receiveShadow = true;
  group.add(paper);
  // Scotch jauni, translucide, posé de biais à chaque coin.
  const tape = keep(new THREE.MeshPhysicalMaterial({ color: 0xf3e6b8, roughness: 0.35, transparent: true, opacity: 0.55, depthWrite: false }));
  const tapeGeometry = keep(new THREE.PlaneGeometry(0.075, 0.028));
  for (const [sx, sy, angle] of [[-1, 1, 0.7], [1, 1, -0.65], [-1, -1, -0.75], [1, -1, 0.6]] as const) {
    const piece = new THREE.Mesh(tapeGeometry, tape);
    piece.position.set(sx * (POSTER_W / 2 - 0.012), sy * (POSTER_H / 2 - 0.012), 0.006);
    piece.rotation.z = angle;
    group.add(piece);
  }
  return group;
}

// ----------------------------------------------------------------------------
// Peint l'affiche : ciel, soucoupe, arbres, slogan, puis grain et virage noir et blanc.
// Retour : toile width x height (rapport 2:3).
// ----------------------------------------------------------------------------
function posterCanvas(width: number, height: number): HTMLCanvasElement {
  const [canvas, context] = canvas2d(width, height, true);
  const rand = seeded(1993);
  // Ciel couvert : plus sombre en haut, voilé vers l'horizon.
  const sky = context.createLinearGradient(0, 0, 0, height * 0.72);
  sky.addColorStop(0, '#2b2e2d');
  sky.addColorStop(0.55, '#626663');
  sky.addColorStop(1, '#9a9d98');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  // Nuages bas et diffus.
  context.save();
  context.filter = `blur(${Math.round(width / 40)}px)`;
  for (let i = 0; i < 70; i += 1) {
    const x = rand() * width; const y = height * (0.05 + rand() * 0.6);
    context.globalAlpha = 0.06 + rand() * 0.12;
    context.fillStyle = rand() > 0.4 ? '#c9ccc7' : '#1e2120';
    context.beginPath();
    context.ellipse(x, y, width * (0.1 + rand() * 0.25), height * (0.02 + rand() * 0.05), 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  // Soucoupe à étages, légèrement inclinée, au tiers supérieur.
  context.save();
  context.translate(width * 0.5, height * 0.34);
  context.rotate(-0.09);
  const r = width * 0.23;
  // Halo de brume autour de l'engin.
  const halo = context.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6);
  halo.addColorStop(0, 'rgba(220,222,218,0.18)');
  halo.addColorStop(1, 'rgba(220,222,218,0)');
  context.fillStyle = halo;
  context.fillRect(-r * 2, -r * 2, r * 4, r * 4);
  // Disque principal : dessus clair, dessous dans l'ombre.
  const disc = context.createLinearGradient(0, -r * 0.16, 0, r * 0.16);
  disc.addColorStop(0, '#e2e4e0');
  disc.addColorStop(0.45, '#9da09c');
  disc.addColorStop(0.55, '#3c3f3d');
  disc.addColorStop(1, '#1b1d1c');
  context.fillStyle = disc;
  context.beginPath();
  context.ellipse(0, 0, r, r * 0.15, 0, 0, Math.PI * 2);
  context.fill();
  // Couronne de bossages sur le bord supérieur.
  context.fillStyle = '#c4c7c2';
  for (let k = -9; k <= 9; k += 1) {
    const t = k / 10;
    const bx = t * r * 0.78; const by = -Math.sqrt(Math.max(0, 1 - t * t)) * r * 0.1 - r * 0.02;
    context.beginPath();
    context.ellipse(bx, by, r * 0.045, r * 0.03, 0, Math.PI, 0);
    context.fill();
  }
  // Second étage, puis dôme avec son reflet.
  const tier = context.createLinearGradient(0, -r * 0.3, 0, -r * 0.08);
  tier.addColorStop(0, '#d8dad6');
  tier.addColorStop(1, '#6d706c');
  context.fillStyle = tier;
  context.beginPath();
  context.ellipse(0, -r * 0.13, r * 0.5, r * 0.09, 0, 0, Math.PI * 2);
  context.fill();
  const dome = context.createRadialGradient(-r * 0.08, -r * 0.36, r * 0.02, 0, -r * 0.24, r * 0.32);
  dome.addColorStop(0, '#ffffff');
  dome.addColorStop(0.4, '#b9bcb7');
  dome.addColorStop(1, '#4a4d4a');
  context.fillStyle = dome;
  context.beginPath();
  context.ellipse(0, -r * 0.2, r * 0.27, r * 0.22, 0, Math.PI, 0);
  context.fill();
  context.restore();

  // Lisière de forêt en silhouette, en trois plans de plus en plus sombres.
  const treeLine = height * 0.72;
  const fog = context.createLinearGradient(0, treeLine - height * 0.08, 0, height);
  fog.addColorStop(0, 'rgba(150,153,148,0)');
  fog.addColorStop(0.3, 'rgba(60,63,60,0.6)');
  fog.addColorStop(1, '#0b0c0b');
  for (const [layer, shade, base] of [[0, '#3a3d3a', treeLine], [1, '#1a1c1a', treeLine + height * 0.035], [2, '#0a0b0a', treeLine + height * 0.075]] as const) {
    context.fillStyle = shade;
    // Lisière : une ligne de cimes ondulée, faite de houppiers ronds qui se chevauchent.
    const amplitude = height * (0.05 + layer * 0.015);
    const phase = rand() * 10;
    const crownAt = (x: number) => base - amplitude * (0.55 + 0.25 * Math.sin(x * 0.011 + phase) + 0.2 * Math.sin(x * 0.037 + phase * 2));
    context.beginPath();
    context.moveTo(0, height);
    for (let x = 0; x <= width; x += 6) context.lineTo(x, crownAt(x) + amplitude * 0.35);
    context.lineTo(width, height);
    context.closePath();
    context.fill();
    for (let x = -10; x < width + 10; x += width * (0.012 + rand() * 0.012)) {
      const top = crownAt(x);
      const radius = width * (0.018 + rand() * 0.022) * (1 + layer * 0.2);
      context.beginPath();
      context.arc(x, top + radius * 0.6, radius, 0, Math.PI * 2);
      context.fill();
      // Feuillage qui dépasse en petites touffes.
      for (let k = 0; k < 3; k += 1) {
        context.beginPath();
        context.arc(x + (rand() - 0.5) * radius * 1.6, top + radius * (0.2 + rand() * 0.5), radius * (0.35 + rand() * 0.3), 0, Math.PI * 2);
        context.fill();
      }
    }
    // Quelques sapins plus hauts qui percent la lisière.
    const pines = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < pines; p += 1) {
      const x = rand() * width;
      const top = crownAt(x) - amplitude * (0.5 + rand() * 0.9);
      const w = width * (0.025 + rand() * 0.02);
      const bottom = crownAt(x) + amplitude * 0.4;
      context.beginPath();
      context.moveTo(x, top);
      const tiers = 7;
      for (let s = 1; s <= tiers; s += 1) {
        const y = top + ((bottom - top) * s) / tiers;
        const half = (w / 2) * (s / tiers) * (0.8 + rand() * 0.4);
        context.lineTo(x + half, y);
        context.lineTo(x + half * 0.45, y - (bottom - top) / tiers * 0.25);
      }
      for (let s = tiers; s >= 1; s -= 1) {
        const y = top + ((bottom - top) * s) / tiers;
        const half = (w / 2) * (s / tiers) * (0.8 + rand() * 0.4);
        context.lineTo(x - half * 0.45, y - (bottom - top) / tiers * 0.25);
        context.lineTo(x - half, y);
      }
      context.closePath();
      context.fill();
    }
  }
  context.fillStyle = fog;
  context.fillRect(0, treeLine - height * 0.08, width, height);

  // Slogan en capitales blanches, au pied de l'image.
  context.fillStyle = '#f2f2ee';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `700 ${Math.round(width * 0.083)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  context.letterSpacing = `${Math.round(width * 0.006)}px`;
  context.fillText('I WANT TO BELIEVE', width / 2, height * 0.905, width * 0.88);
  context.letterSpacing = '0px';

  // Photo noir et blanc : virage légèrement chaud, grain, vignettage, bords jaunis.
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const grey = (data[i] ?? 0) * 0.3 + (data[i + 1] ?? 0) * 0.59 + (data[i + 2] ?? 0) * 0.11;
    const noise = (rand() - 0.5) * 28;
    data[i] = Math.min(255, Math.max(0, grey * 1.02 + noise + 4));
    data[i + 1] = Math.min(255, Math.max(0, grey + noise + 1));
    data[i + 2] = Math.min(255, Math.max(0, grey * 0.95 + noise - 3));
  }
  context.putImageData(image, 0, 0);
  const vignette = context.createRadialGradient(width / 2, height * 0.45, width * 0.35, width / 2, height * 0.45, height * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(214,196,150,0.35)';
  context.lineWidth = width * 0.012;
  context.strokeRect(0, 0, width, height);
  return canvas;
}
