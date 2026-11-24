// ============================================================================
// homography — Transformation CSS matrix3d qui plaque un rectangle sur quatre points
// ----------------------------------------------------------------------------
// Sert à poser l'interface HTML du bureau XP sur la dalle 3D de l'écran, vue sous
// n'importe quel angle : le rectangle (0, 0)–(width, height) de l'élément va sur les
// quatre coins projetés de la dalle (haut gauche, haut droit, bas droit, bas gauche).
// L'élément doit avoir transform-origin: 0 0.
// ============================================================================

export type Point = readonly [number, number];

// Aire minimale du quadrilatère, relative au carré de sa plus grande dimension : en
// dessous, la dalle est vue par la tranche et la matrice deviendrait démesurée.
const MIN_AREA_RATIO = 1e-6;
// Pivot minimal de l'élimination, relatif au plus grand coefficient du système.
const PIVOT_EPSILON = 1e-12;

// ----------------------------------------------------------------------------
// Résout A·x = b (8 x 8) par élimination de Gauss avec pivot partiel.
// Le seuil du pivot suit l'ordre de grandeur des coefficients (jusqu'à 10⁶ en pixels²).
// Retour : x, ou null si la matrice est singulière (quadrilatère dégénéré).
// ----------------------------------------------------------------------------
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  const scale = Math.max(...a.flat().map(Math.abs), 1);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(m[row]![col]!) > Math.abs(m[pivot]![col]!)) pivot = row;
    if (Math.abs(m[pivot]![col]!) < PIVOT_EPSILON * scale) return null;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const f = m[row]![col]! / m[col]![col]!;
      for (let k = col; k <= n; k += 1) m[row]![k]! -= f * m[col]![k]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}

// ----------------------------------------------------------------------------
// Homographie qui envoie le rectangle (0, 0)–(width, height) sur les quatre points de quad
// (haut gauche, haut droit, bas droit, bas gauche), en pixels CSS.
// Retour : la valeur CSS « matrix3d(...) », ou null si les points sont dégénérés ou si
// le quadrilatère est presque aplati (dalle vue par la tranche).
// ----------------------------------------------------------------------------
export function quadTransform(width: number, height: number, quad: readonly [Point, Point, Point, Point]): string | null {
  // Quadrilatère aplati (coins confondus ou presque alignés) : pas de plaquage possible.
  const xs = quad.map(([u]) => u);
  const ys = quad.map(([, v]) => v);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const area = Math.abs(quad.reduce((sum, [u, v], i) => {
    const [nu, nv] = quad[(i + 1) % 4]!;
    return sum + u * nv - nu * v;
  }, 0)) / 2;
  if (size === 0 || area < MIN_AREA_RATIO * size * size) return null;
  const source: Point[] = [[0, 0], [width, 0], [width, height], [0, height]];
  const a: number[][] = [];
  const b: number[] = [];
  source.forEach(([x, y], i) => {
    const [u, v] = quad[i]!;
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  });
  const h = solve(a, b);
  if (h === null) return null;
  const [h0, h1, h2, h3, h4, h5, h6, h7] = h as [number, number, number, number, number, number, number, number];
  // Matrice 4 x 4 en colonnes : x' = h0 x + h1 y + h2, y' = h3 x + h4 y + h5, w = h6 x + h7 y + 1.
  const values = [h0, h3, 0, h6, h1, h4, 0, h7, 0, 0, 1, 0, h2, h5, 0, 1];
  return `matrix3d(${values.map((value) => +value.toPrecision(10)).join(',')})`;
}
