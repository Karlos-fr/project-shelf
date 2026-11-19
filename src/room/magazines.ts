// ============================================================================
// Magazines — Pile de revues d'époque posée sur le bureau de la chambre
// ----------------------------------------------------------------------------
// Deux Casus Belli (1995) et trois PC Team (1998 et 2000) aux vraies couvertures, scannées par
// abandonware-magazines.org. Chaque revue est un pavé : couverture brillante dessus,
// dos de couleur dessous, tranche collée portant le titre, et bords de pages. La pile
// est un peu de travers, comme posée à la main. Origine : dessous de la pile, au centre.
// Plus tard, chaque revue pourra s'ouvrir et se feuilleter.
// ============================================================================
import * as THREE from 'three/webgpu';
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
  let y = 0;
  MAGAZINES.forEach((magazine, index) => {
    const [w, h, t] = magazine.size;
    const image = covers[index];
    const cover = image === null || image === undefined ? null : keep(new THREE.Texture(image));
    if (cover !== null) {
      cover.colorSpace = THREE.SRGBColorSpace;
      cover.anisotropy = anisotropy;
      cover.needsUpdate = true;
    }
    // Papier couché brillant : la couverture reflète la fenêtre.
    const front = keep(new THREE.MeshPhysicalMaterial({ map: cover, color: cover === null ? magazine.spine : 0xffffff, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.18 }));
    const back = keep(new THREE.MeshPhysicalMaterial({ color: magazine.spine, roughness: 0.4, clearcoat: 0.4 }));
    const spineTexture = keep(new THREE.CanvasTexture(spineCanvas(magazine)));
    spineTexture.colorSpace = THREE.SRGBColorSpace;
    spineTexture.anisotropy = anisotropy;
    const spine = keep(new THREE.MeshPhysicalMaterial({ map: spineTexture, roughness: 0.4, clearcoat: 0.3 }));
    // Faces du pavé : +x, -x (tranche collée), dessus (couverture), dessous (dos), +z, -z.
    const mesh = new THREE.Mesh(keep(new THREE.BoxGeometry(w, t, h)), [pageMaterial, spine, front, back, pageMaterial, pageMaterial]);
    mesh.castShadow = mesh.receiveShadow = true;
    // La couverture se lit depuis l'avant du bureau ; chaque revue est posée un peu de biais.
    const jitter = [0.05, -0.09, 0.12, -0.04, 0.08][index] ?? 0;
    const shift = [[0, 0], [0.008, -0.01], [-0.012, 0.006], [0.006, 0.012], [-0.004, -0.006]][index] ?? [0, 0];
    mesh.rotation.y = jitter;
    mesh.position.set(shift[0] ?? 0, y + t / 2, shift[1] ?? 0);
    mesh.userData.magazine = index;
    group.add(mesh);
    y += t;
  });
  return group;
}

// Tranche collée : fond de couleur, titre et numéro en capitales, dans le sens de la longueur.
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
