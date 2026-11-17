// ============================================================================
// Ambilight — Couleurs d'ambiance tirées de l'image en cours
// ----------------------------------------------------------------------------
// averageZones est pur : il moyenne les pixels de la moitié gauche et de la
// moitié droite d'une petite image RGBA. canReadPixels décide si un média peut
// être lu par un canevas sans le « teinter » (même origine ou hôte CORS connu).
// Ce module ne touche ni au DOM ni aux lecteurs : FeaturedCarousel s'en charge.
// ============================================================================

export type Rgb = { r: number; g: number; b: number };

// Hôtes connus pour servir leurs fichiers avec Access-Control-Allow-Origin: *.
// Un autre hôte garde sa vidéo, mais sans Ambilight : poser crossOrigin sur un
// média non CORS empêcherait purement son chargement.
const CORS_HOSTS = [/(^|\.)raw\.githubusercontent\.com$/u, /(^|\.)github\.io$/u];

// ----------------------------------------------------------------------------
// Indique si l'image d'un média pourra être lue par un canevas.
// Paramètres : src est l'URL publiée ; pageOrigin l'origine de la page courante.
// Retour : true pour une URL de même origine ou un hôte CORS connu.
// ----------------------------------------------------------------------------
export function canReadPixels(src: string, pageOrigin: string): boolean {
  let url: URL;
  try { url = new URL(src, pageOrigin); } catch { return false; }
  if (url.origin === pageOrigin) return true;
  return url.protocol === 'https:' && CORS_HOSTS.some((host) => host.test(url.hostname));
}

// ----------------------------------------------------------------------------
// Moyenne les couleurs des moitiés gauche et droite d'une image RGBA.
// Paramètres : data contient width × height pixels RGBA (ImageData.data).
// Retour : [gauche, droite], arrondis ; pixels transparents ignorés.
// ----------------------------------------------------------------------------
export function averageZones(data: ArrayLike<number>, width: number, height: number): [Rgb, Rgb] {
  const sums = [{ r: 0, g: 0, b: 0, n: 0 }, { r: 0, g: 0, b: 0, n: 0 }];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if ((data[i + 3] ?? 0) === 0) continue;
      const zone = sums[x < width / 2 ? 0 : 1]!;
      zone.r += data[i] ?? 0; zone.g += data[i + 1] ?? 0; zone.b += data[i + 2] ?? 0; zone.n += 1;
    }
  }
  const [left, right] = sums.map((s) => (s.n === 0 ? { r: 0, g: 0, b: 0 } : { r: Math.round(s.r / s.n), g: Math.round(s.g / s.n), b: Math.round(s.b / s.n) }));
  return [left!, right!];
}

// ----------------------------------------------------------------------------
// Ravive une couleur moyenne, souvent terne, pour qu'elle se lise en lumière.
// Paramètres : color est une moyenne ; retour : même teinte, saturée et éclaircie.
// ----------------------------------------------------------------------------
export function glowColor({ r, g, b }: Rgb): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Les gris restent gris : on n'invente pas de teinte absente de l'image.
  const boost = max === 0 ? 0 : Math.min(2.2, 210 / max);
  const spread = max - min;
  const mix = (value: number): number => Math.round(Math.min(255, (min + (value - min) * (spread < 12 ? 1 : 1.6)) * boost));
  return `rgb(${mix(r)} ${mix(g)} ${mix(b)})`;
}

// ----------------------------------------------------------------------------
// Valeur de l'attribut crossOrigin à poser sur un média de la scène.
// Paramètres : src est l'URL rendue (chemin local ou URL HTTPS).
// Retour : 'anonymous' pour un hôte CORS connu ; undefined sinon. Identique au
// rendu serveur et client, car elle ne dépend pas de l'origine de la page.
// ----------------------------------------------------------------------------
export function crossOriginFor(src: string): 'anonymous' | undefined {
  if (!/^https:\/\//u.test(src)) return undefined;
  try {
    return CORS_HOSTS.some((host) => host.test(new URL(src).hostname)) ? 'anonymous' : undefined;
  } catch {
    return undefined;
  }
}
