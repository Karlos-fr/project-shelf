// ============================================================================
// Magazines — Pile de revues d'époque posée sur le bureau de la chambre
// ----------------------------------------------------------------------------
// Deux Casus Belli (1995) et trois PC Team (1998 et 2000) aux vraies couvertures, scannées par
// abandonware-magazines.org. Chaque revue est un pavé : couverture brillante dessus,
// dos de couleur dessous, tranche collée portant le titre, et bords de pages. La pile
// est un peu de travers, comme posée à la main. Origine : dessous de la pile, au centre.
// Couverture, tranche et dos d'une revue sont peints sur une seule toile (une texture, un
// matériau), et les bords de pages de toute la pile forment un seul maillage : la pile
// coûte six appels de dessin au lieu de trente.
// Plus tard, chaque revue pourra s'ouvrir et se feuilleter.
// ============================================================================
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvas2d, loadImage } from '../shelf/shelf-materials.ts';

export type Magazine = {
  // Fichier de couverture servi sous /room/mags/.
  file: string;
  title: string;
  issue: string;
  // Largeur et hauteur de la couverture, épaisseur du numéro, en mètres.
  size: readonly [number, number, number];
  // Couleur de la tranche et du dos.
  spine: string;
};

// Du dessous vers le dessus de la pile.
export const MAGAZINES: readonly Magazine[] = [
  { file: 'casusbelli-89.jpg', title: 'CASUS BELLI', issue: 'N° 89 · OCT.-NOV. 1995', size: [0.21, 0.29, 0.0055], spine: '#d4202a' },
  { file: 'casusbelli-90.jpg', title: 'CASUS BELLI', issue: 'N° 90 · DÉCEMBRE 1995', size: [0.21, 0.288, 0.0055], spine: '#2a2a2a' },
  { file: 'pcteam-36.jpg', title: 'PC TEAM', issue: 'N° 36 · JUIN 1998', size: [0.215, 0.285, 0.0075], spine: '#2f7d32' },
  { file: 'pcteam-59.jpg', title: 'PC TEAM', issue: 'N° 59 · JUILLET 2000', size: [0.215, 0.285, 0.0075], spine: '#e8771c' },
  { file: 'pcteam-61.jpg', title: 'PC TEAM', issue: 'N° 61 · OCTOBRE 2000', size: [0.215, 0.285, 0.0075], spine: '#1e4fa8' },
];

// Largeur de la toile de chaque revue, en pixels ; la couverture garde ses proportions.
const ATLAS_W = 1024;
// Hauteur de la bande de tranche (titre et numéro) et de la bande de dos, sous la couverture.
const SPINE_H = 40;
const BACK_H = 8;
// Faces du pavé dans l'ordre de BoxGeometry : +x, -x (tranche collée), dessus (couverture),
// dessous (dos), +z, -z. Chaque face compte 6 sommets une fois la géométrie dépliée.
const FACE_VERTICES = 6;
const PAGE_FACES = [0, 4, 5] as const;

// ----------------------------------------------------------------------------
// Construit la pile. base est le préfixe des fichiers servis sous /room/.
// Effets de bord : charge les couvertures.
// ----------------------------------------------------------------------------
export async function buildMagazineStack(keep: <V extends { dispose(): void }>(value: V) => V, base: string, anisotropy: number): Promise<THREE.Group> {
  const group = new THREE.Group();
  const covers = await Promise.all(MAGAZINES.map((magazine) => loadImage(`${base}mags/${magazine.file}`).catch(() => null)));
  // Bords de pages : fines lignes crème, communes à toutes les revues.
  const pages = keep(new THREE.CanvasTexture(pageEdgeCanvas()));
  pages.colorSpace = THREE.SRGBColorSpace;
  const pageMaterial = keep(new THREE.MeshStandardMaterial({ map: pages, roughness: 0.9 }));
  const pageParts: THREE.BufferGeometry[] = [];
  let y = 0;
  MAGAZINES.forEach((magazine, index) => {
    const [w, h, t] = magazine.size;
    const atlas = atlasCanvas(magazine, covers[index] ?? null);
    const texture = keep(new THREE.CanvasTexture(atlas.canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    // Papier couché brillant : la couverture reflète la fenêtre ; tranche et dos aussi, un peu moins.
    const material = keep(new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.18 }));
    // La couverture se lit depuis l'avant du bureau ; chaque revue est posée un peu de biais.
    const jitter = [0.05, -0.09, 0.12, -0.04, 0.08][index] ?? 0;
    const shift = [[0, 0], [0.008, -0.01], [-0.012, 0.006], [0.006, 0.012], [-0.004, -0.006]][index] ?? [0, 0];
    const place = new THREE.Matrix4().compose(
      new THREE.Vector3(shift[0] ?? 0, y + t / 2, shift[1] ?? 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), jitter),
      new THREE.Vector3(1, 1, 1),
    );
    const box = new THREE.BoxGeometry(w, t, h).toNonIndexed();
    box.applyMatrix4(place);
    // Tranche, couverture et dos sur la toile de la revue ; bords de pages mis de côté.
    const skin = faces(box, [[1, atlas.spine], [2, atlas.cover], [3, atlas.back]]);
    for (const face of PAGE_FACES) pageParts.push(faces(box, [[face, null]]));
    box.dispose();
    const mesh = new THREE.Mesh(keep(skin), material);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.magazine = index;
    group.add(mesh);
    y += t;
  });
  const edges = new THREE.Mesh(keep(mergeGeometries(pageParts, false) ?? new THREE.BufferGeometry()), pageMaterial);
  for (const part of pageParts) part.dispose();
  edges.castShadow = edges.receiveShadow = true;
  group.add(edges);
  return group;
}

// Bande de la toile, en coordonnées de texture : v de vMin (bas) à vMax (haut).
type Band = { vMin: number; vMax: number };

// ----------------------------------------------------------------------------
// Toile d'une revue : couverture en haut, puis bande de tranche, puis bande de dos.
// Sans couverture chargée, la zone prend la couleur de la tranche.
// Retour : la toile et la bande de chaque face, en coordonnées de texture.
// ----------------------------------------------------------------------------
function atlasCanvas(magazine: Magazine, cover: HTMLImageElement | null): { canvas: HTMLCanvasElement; cover: Band; spine: Band; back: Band } {
  const coverH = Math.round(ATLAS_W * magazine.size[1] / magazine.size[0]);
  const height = coverH + SPINE_H + BACK_H;
  const [canvas, context] = canvas2d(ATLAS_W, height);
  context.fillStyle = magazine.spine;
  context.fillRect(0, 0, ATLAS_W, height);
  if (cover !== null) context.drawImage(cover, 0, 0, ATLAS_W, coverH);
  context.drawImage(spineCanvas(magazine), 0, coverH, ATLAS_W, SPINE_H);
  // La texture est retournée (flipY) : le haut de la toile correspond à v = 1.
  const band = (top: number, bottom: number): Band => ({ vMin: 1 - bottom / height, vMax: 1 - top / height });
  return { canvas, cover: band(0, coverH), spine: band(coverH, coverH + SPINE_H), back: band(coverH + SPINE_H + 1, height - 1) };
}

// ----------------------------------------------------------------------------
// Extrait des faces d'un pavé déplié (6 sommets par face) en une géométrie.
// Paramètres : list associe un numéro de face à sa bande de toile (null : coordonnées
// de texture inchangées, pour les bords de pages).
// ----------------------------------------------------------------------------
function faces(box: THREE.BufferGeometry, list: [number, Band | null][]): THREE.BufferGeometry {
  const parts = list.map(([face, band]) => {
    const part = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv'] as const) {
      const source = box.attributes[name] as THREE.BufferAttribute;
      const values = (source.array as Float32Array).slice(face * FACE_VERTICES * source.itemSize, (face + 1) * FACE_VERTICES * source.itemSize);
      part.setAttribute(name, new THREE.BufferAttribute(values, source.itemSize));
    }
    if (band !== null) {
      const uv = part.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i += 1) uv.setY(i, band.vMin + uv.getY(i) * (band.vMax - band.vMin));
    }
    return part;
  });
  const merged = mergeGeometries(parts, false) ?? new THREE.BufferGeometry();
  for (const part of parts) part.dispose();
  return merged;
}

// Tranche collée : fond de couleur, titre et numéro en capitales, dans le sens de la longueur.
// Retour : toile 1024 x 40, recopiée dans la bande de tranche de la toile de la revue.
function spineCanvas(magazine: Magazine): HTMLCanvasElement {
  const [canvas, context] = canvas2d(1024, 40);
  context.fillStyle = magazine.spine;
  context.fillRect(0, 0, 1024, 40);
  context.fillStyle = '#ffffff';
  context.textBaseline = 'middle';
  context.font = '900 26px "Arial Black", Arial, sans-serif';
  context.fillText(magazine.title, 40, 21);
  context.font = '700 18px Arial, sans-serif';
  context.textAlign = 'right';
  context.fillText(magazine.issue, 990, 21);
  return canvas;
}

// Bords de pages : bandes crème et lignes plus sombres, comme un paquet de feuilles.
function pageEdgeCanvas(): HTMLCanvasElement {
  const [canvas, context] = canvas2d(64, 256);
  context.fillStyle = '#efe9da';
  context.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 3) {
    context.fillStyle = y % 9 === 0 ? 'rgba(120,110,90,0.35)' : 'rgba(160,150,130,0.18)';
    context.fillRect(0, y, 64, 1);
  }
  return canvas;
}
