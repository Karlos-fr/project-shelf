// ============================================================================
// ShelfMaterials — Matières procédurales et utilitaires de toile partagés
// ----------------------------------------------------------------------------
// Relief, usure, poussière, plaques gravées et profils de moulure, communs à
// l'étagère seule et à la chambre. Ces fonctions créent des toiles hors DOM.
// ============================================================================
import * as THREE from 'three/webgpu';
import { color, float, mix, normalMap, normalWorld, texture, uv, vec2 } from 'three/tsl';
import type { ShelfBox, ShelfSpine } from './shelf-items.ts';

// ----------------------------------------------------------------------------
// Charge une image ; crossOrigin est requis pour lire les pixels d'un média distant.
// ----------------------------------------------------------------------------
export function loadImage(src: string, crossOrigin?: 'anonymous'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin !== undefined) image.crossOrigin = crossOrigin;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image illisible : ${src}`));
    image.src = src;
  });
}

// Générateur pseudo-aléatoire déterministe : une même graine donne la même matière.
export function seeded(seed: number): () => number {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

export function canvas2d(width: number, height: number, willReadFrequently = false): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  const context = canvas.getContext('2d', { willReadFrequently });
  if (context === null) throw new Error('Canvas 2D indisponible.');
  return [canvas, context];
}

// ----------------------------------------------------------------------------
// Réduit une image dont le plus grand côté dépasse maxSide ; sinon la rend telle quelle.
// ----------------------------------------------------------------------------
export function shrink<S extends CanvasImageSource & { width: number; height: number }>(source: S, maxSide: number): S | HTMLCanvasElement {
  const scale = maxSide / Math.max(source.width, source.height);
  if (scale >= 1) return source;
  const [canvas, context] = canvas2d(Math.round(source.width * scale), Math.round(source.height * scale));
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (source instanceof HTMLCanvasElement) release(source);
  return canvas;
}

// Libère tout de suite la mémoire de toiles intermédiaires : Safari ne la rend qu'au
// ramasse-miettes et plafonne la mémoire totale des canvas d'une page.
export function release(...sources: CanvasImageSource[]): void {
  for (const source of sources) if (source instanceof HTMLCanvasElement) { source.width = 0; source.height = 0; }
}

// Grain fibreux du plâtre : bruit fin et quelques fibres orientées.
export function fiberCanvas(size: number, seed: number): HTMLCanvasElement {
  const [canvas, context] = canvas2d(size, size);
  const image = context.createImageData(size, size);
  const rand = seeded(seed);
  for (let i = 0; i < size * size; i += 1) { const v = 118 + rand() * 20; image.data.set([v, v, v, 255], i * 4); }
  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.07;
  context.strokeStyle = '#fff';
  for (let i = 0; i < 900; i += 1) {
    const x = rand() * size; const y = rand() * size; const a = rand() * Math.PI;
    context.lineWidth = 0.5 + rand();
    context.beginPath(); context.moveTo(x, y); context.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); context.stroke();
  }
  return canvas;
}

// Poussière déposée et traces de doigts : taches douces et grains.
export function blotchTexture(size: number, seed: number, blobs: number, specks: number): THREE.CanvasTexture {
  const [canvas, context] = canvas2d(size, size);
  context.fillStyle = '#000';
  context.fillRect(0, 0, size, size);
  const rand = seeded(seed);
  for (let i = 0; i < blobs; i += 1) {
    const x = rand() * size; const y = rand() * size; const radius = size * (0.03 + rand() * 0.12);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255,255,255,${0.25 + rand() * 0.5})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  context.fillStyle = '#fff';
  for (let i = 0; i < specks; i += 1) { context.globalAlpha = 0.3 + rand() * 0.7; const s = 0.5 + rand() * 1.5; context.fillRect(rand() * size, rand() * size, s, s); }
  const result = new THREE.CanvasTexture(canvas);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  return result;
}

// Usure des arêtes : le carton blanchit le long des bords.
export function worn(source: CanvasImageSource & { width: number; height: number }, seed: number): THREE.CanvasTexture {
  const [canvas, context] = canvas2d(source.width, source.height);
  const { width: w, height: h } = canvas;
  context.drawImage(source, 0, 0, w, h);
  const rand = seeded(seed);
  const band = Math.max(w, h) * 0.005;
  context.fillStyle = '#efe7da';
  for (let i = 0; i < 500; i += 1) {
    const side = i % 4; const t = rand(); const d = Math.pow(rand(), 3) * band; const s = 0.6 + rand() * 1.8;
    const x = side === 0 ? t * w : side === 1 ? w - d : side === 2 ? t * w : d;
    const y = side === 0 ? d : side === 1 ? t * h : side === 2 ? h - d : t * h;
    context.globalAlpha = 0.15 + rand() * 0.45;
    context.fillRect(x, y, s, s);
  }
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.anisotropy = 16;
  return result;
}

// Grain du papier : 65 536 tirages faits une fois, lus par hachage de la position du pixel.
let toothTable: Float32Array | null = null;
function toothNoise(): Float32Array {
  if (toothTable === null) {
    const rand = seeded(9);
    toothTable = Float32Array.from({ length: 1 << 16 }, () => rand() - 0.5);
  }
  return toothTable;
}

// ----------------------------------------------------------------------------
// Relief tiré de l'image : l'encre forme un léger bossage, le papier garde son grain.
// Retour : normal map au format OpenGL, en espace linéaire.
// ----------------------------------------------------------------------------
export function printNormal(source: CanvasImageSource & { width: number; height: number }, strength = 2.2, tooth = 0.05, maxWidth = 1024): THREE.CanvasTexture {
  const w = Math.min(source.width, maxWidth);
  const h = Math.round(source.height * w / source.width);
  const [canvas, context] = canvas2d(w, h, true);
  context.drawImage(source, 0, 0, w, h);
  const image = context.getImageData(0, 0, w, h);
  const data = image.data;
  const luminance = new Float32Array(w * h);
  for (let k = 0, p = 0; k < w * h; k += 1, p += 4) luminance[k] = (data[p]! * 0.299 + data[p + 1]! * 0.587 + data[p + 2]! * 0.114) / 255;
  const noise = toothNoise();
  // Boucle chaude (des millions de pixels au chargement) : indices précalculés, pas de Math.hypot.
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    const up = (y > 0 ? y - 1 : 0) * w;
    const down = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x += 1) {
      const left = x > 0 ? x - 1 : 0;
      const right = x < w - 1 ? x + 1 : x;
      const nx = (luminance[row + right]! - luminance[row + left]!) * strength + noise[((x * 7919) ^ (y * 104729)) & 0xffff]! * tooth;
      const ny = -(luminance[down + x]! - luminance[up + x]!) * strength + noise[((x * 104729) ^ (y * 7919) ^ 0x5bd1) & 0xffff]! * tooth;
      const inverse = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const k = (row + x) * 4;
      data[k] = (nx * inverse * 0.5 + 0.5) * 255;
      data[k + 1] = (ny * inverse * 0.5 + 0.5) * 255;
      data[k + 2] = (inverse * 0.5 + 0.5) * 255;
      data[k + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const result = new THREE.CanvasTexture(canvas);
  result.anisotropy = 16;
  return result;
}

export function spineCanvas(spine: ShelfSpine): HTMLCanvasElement {
  const [canvas, context] = canvas2d(256, 1200);
  context.fillStyle = spine.background;
  context.fillRect(0, 0, 256, 1200);
  context.save();
  context.translate(128, 600);
  context.rotate(-Math.PI / 2);
  context.fillStyle = spine.ink;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 120px "Mona Sans Variable", sans-serif';
  context.fillText(spine.title, 0, -16);
  context.font = '600 34px "Mona Sans Variable", sans-serif';
  context.globalAlpha = 0.85;
  context.fillText(spine.subtitle, 0, 66);
  context.restore();
  return canvas;
}

// Dos reconstitué avec de vraies captures du jeu, quand le scan du dos manque.
export async function composeBack(back: Exclude<ShelfBox['back'], string>, assetBase: string): Promise<HTMLCanvasElement> {
  const [canvas, context] = canvas2d(790, 1024);
  context.fillStyle = back.background;
  context.fillRect(0, 0, 790, 1024);
  context.fillStyle = back.ink;
  context.font = '900 96px "Mona Sans Variable", sans-serif';
  context.textAlign = 'center';
  context.fillText(back.title, 395, 120);
  const shots = await Promise.all(back.screenshots.map((name) => loadImage(`${assetBase}${name}`).catch(() => null)));
  shots.forEach((image, i) => {
    if (image === null) return;
    const w = 330; const h = w * image.height / image.width; const x = i % 2 === 0 ? 50 : 790 - w - 50; const y = 170 + i * 230;
    context.fillStyle = '#1a1a1a';
    context.fillRect(x - 6, y - 6, w + 12, h + 12);
    context.drawImage(image, x, y, w, h);
  });
  context.fillStyle = '#2a1b0c';
  context.font = '700 30px "Mona Sans Variable", sans-serif';
  context.textAlign = 'left';
  back.bullets.forEach((line, i) => context.fillText(`• ${line}`, 420, 250 + i * 46));
  context.font = '600 24px "Mona Sans Variable", sans-serif';
  context.fillText(back.footer, 50, 980);
  return canvas;
}

// Laiton brossé et texte gravé (couleur sombre + normal map tirée du texte).
export function plaqueTextures(name: string, meta: string, anisotropy: number): { map: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const [canvas, context] = canvas2d(1024, 200);
  const gradient = context.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, '#d9b45e'); gradient.addColorStop(0.55, '#b8913f'); gradient.addColorStop(1, '#9c7731');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 200);
  const rand = seeded(name.length * 97);
  for (let i = 0; i < 1600; i += 1) {
    context.globalAlpha = 0.05 + rand() * 0.08;
    context.fillStyle = rand() > 0.5 ? '#fff3cf' : '#5d4317';
    context.fillRect(rand() * 1024, rand() * 200, 40 + rand() * 260, 1);
  }
  context.globalAlpha = 1;
  const [text, textContext] = canvas2d(1024, 200);
  textContext.fillStyle = '#fff';
  textContext.textAlign = 'center';
  textContext.textBaseline = 'middle';
  textContext.font = '800 76px "Mona Sans Variable", sans-serif';
  textContext.fillText(name, 512, 82, 860);
  textContext.font = '500 34px "IBM Plex Mono", monospace';
  textContext.fillText(meta, 512, 150, 860);
  const [ink, inkContext] = canvas2d(1024, 200);
  inkContext.drawImage(text, 0, 0);
  inkContext.globalCompositeOperation = 'source-in';
  inkContext.fillStyle = '#24170a';
  inkContext.fillRect(0, 0, 1024, 200);
  context.globalAlpha = 0.9;
  context.drawImage(ink, 0, 0);
  context.globalAlpha = 1;
  const [mask, maskContext] = canvas2d(1024, 200);
  maskContext.fillStyle = '#fff';
  maskContext.fillRect(0, 0, 1024, 200);
  maskContext.globalCompositeOperation = 'difference';
  maskContext.drawImage(text, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  const normal = printNormal(mask, 6, 0.015, 1024);
  release(text, ink, mask);
  return { map, normal };
}

// Nez de tablette en demi-rond, comme un chant massif poncé (coupe : x vers l'avant).
export function bullnose(height: number, depth: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(depth - height / 2, 0);
  shape.absarc(depth - height / 2, height / 2, height / 2, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);
  return shape;
}

// Corniche : talon, gorge puis listel, qui déborde en haut du meuble.
export function cornice(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.012, 0);
  shape.quadraticCurveTo(0.014, 0.012, 0.03, 0.02);
  shape.lineTo(0.042, 0.022);
  shape.lineTo(0.042, 0.034);
  shape.quadraticCurveTo(0.044, 0.04, 0.038, 0.042);
  shape.lineTo(0, 0.042);
  shape.lineTo(0, 0);
  return shape;
}

// ============================================================================
// Bois et matières photographiées (Poly Haven, CC0)
// ============================================================================

// Jeu de textures PBR : couleur, relief (OpenGL) et ARM (occlusion, rugosité, métal).
export type PbrSet = { diff: THREE.Texture; nor: THREE.Texture; arm: THREE.Texture };

// ----------------------------------------------------------------------------
// Charge {name}_diff, {name}_nor et {name}_arm, en répétition et filtrage anisotrope.
// Paramètres : base est le préfixe d'URL ; suffix choisit une variante (par ex. « _1k »).
// ----------------------------------------------------------------------------
export async function loadPbrSet(loader: THREE.TextureLoader, base: string, name: string, anisotropy: number, suffix = ''): Promise<PbrSet> {
  const [diff, nor, arm] = await Promise.all(['diff', 'nor', 'arm']
    .map((map) => loader.loadAsync(`${base}${name}_${map}${suffix}.jpg`))) as [THREE.Texture, THREE.Texture, THREE.Texture];
  for (const t of [diff, nor, arm]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
  }
  diff.colorSpace = THREE.SRGBColorSpace;
  return { diff, nor, arm };
}

export type WoodOptions = {
  // Répétition du motif sur la face (u, v) ; rotate tourne le veinage d'un quart de tour.
  ru: number; rv: number; rotate?: boolean;
  // Décalage du motif, pour que deux pièces voisines n'aient pas le même veinage.
  ox?: number; oy?: number;
  coat?: number; coatRoughness?: number; tint?: THREE.ColorRepresentation;
  // Gain appliqué à la couleur : au-dessus de 1, il éclaircit une essence trop sombre.
  brightness?: number;
  normalScale?: number; dust?: number;
};

// ----------------------------------------------------------------------------
// Matière bois partagée : les textures ne sont jamais clonées (WebGPU alloue une copie
// en mémoire vidéo par objet Texture) ; répétition, décalage et rotation sont calculés
// dans le shader, avec la même convention que Texture.repeat/offset/rotation.
// Une fine poussière se dépose sur les faces tournées vers le haut et mate le vernis.
// ----------------------------------------------------------------------------
export function woodNodeMaterial(set: PbrSet, dustTex: THREE.Texture, options: WoodOptions): THREE.MeshPhysicalNodeMaterial {
  const { ru, rv, rotate = false, ox = 0, oy = 0, coat = 0.3, coatRoughness = 0.32, tint = 0xd2c8c0, normalScale = 2.2, dust: dustAmount = 0.32, brightness = 1 } = options;
  const base = uv();
  const woodUV = rotate
    ? vec2(base.y.mul(ru).add(0.5 - ru * 0.5 + ox), base.x.mul(-rv).add(0.5 + rv * 0.5 + oy))
    : base.mul(vec2(ru, rv)).add(vec2(ox, oy));
  const arm = texture(set.arm, woodUV);
  const material = new THREE.MeshPhysicalNodeMaterial({
    roughness: 1, metalness: 0, clearcoat: coat, clearcoatRoughness: coatRoughness, specularIntensity: 0.5,
  });
  const dust = normalWorld.y.smoothstep(0.7, 1).mul(texture(dustTex, uv().mul(vec2(5, 1.4))).r.smoothstep(0.15, 0.9)).mul(dustAmount);
  material.colorNode = mix(texture(set.diff, woodUV).rgb.mul(color(new THREE.Color(tint)).mul(brightness)), color(0x9a9186), dust);
  material.normalNode = normalMap(texture(set.nor, woodUV), vec2(normalScale, normalScale));
  material.roughnessNode = mix(arm.g, float(0.95), dust);
  material.aoNode = arm.r;
  return material;
}
