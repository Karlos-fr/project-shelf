// ============================================================================
// DistPrivacyAudit — Inspection des sentinelles interdites dans un export
// ----------------------------------------------------------------------------
// Cet audit parcourt les fichiers et noms de chemins, y compris les binaires.
// Il complète la projection par liste blanche ; ce n'est pas un détecteur universel
// de secrets ni un décodeur de données arbitrairement chiffrées ou transformées.
// ============================================================================
import { createReadStream } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

type Marker = { bytes: Buffer; index: number };

// Taille d'un bloc de lecture ; les médias lourds ne sont pas chargés intégralement.
const AUDIT_CHUNK_BYTES = 64 * 1024;

// ----------------------------------------------------------------------------
// Refuse un export contenant une sentinelle interdite ou un lien symbolique.
// Paramètres : dir est la racine d'export ; forbidden contient les marqueurs à exclure.
// Retour : promesse résolue après inspection de tous les fichiers réguliers.
// Effets de bord : lit uniquement l'export ; aucune suppression ou publication n'a lieu.
// Erreurs : indique l'indice du marqueur, jamais sa valeur ni le contenu du fichier.
// ----------------------------------------------------------------------------
export async function auditDist(dir: string, forbidden: readonly string[]): Promise<void> {
  // L'audit garde les valeurs interdites en mémoire, sans les recopier dans les erreurs.
  const markers = compileMarkers(forbidden);
  // Un export composé lui-même d'un lien symbolique n'est pas une distribution portable.
  const root = await lstat(dir);
  if (root.isSymbolicLink()) throw new Error('Lien symbolique interdit dans l’export.');
  if (!root.isDirectory()) throw new Error('Racine d’export invalide.');
  // Le chevauchement maximal permet de détecter un marqueur séparé entre deux blocs.
  const overlap = Math.max(0, ...markers.map(markerLength)) - 1;
  await visit(dir, '');

  // ----------------------------------------------------------------------------
  // Parcourt un répertoire réel en refusant les liens et les fichiers spéciaux.
  // Paramètres : folder est le chemin disque ; prefix son chemin relatif dans l'export.
  // Effets de bord : lit les entrées puis leurs fichiers ; aucun lien n'est suivi.
  // ----------------------------------------------------------------------------
  async function visit(folder: string, prefix: string): Promise<void> {
    // La traversée reste séquentielle pour borner les descripteurs et la mémoire.
    const entries = await readdir(folder, { withFileTypes: true });
    // Les noms eux-mêmes peuvent divulguer un projet masqué.
    for (const entry of entries) {
      // Chemin logique indépendant du séparateur de fichiers du poste.
      const logical = `${prefix}${entry.name}`;
      checkBuffer(Buffer.from(logical), markers);
      if (entry.isSymbolicLink()) throw new Error('Lien symbolique interdit dans l’export.');
      // Chemin disque créé uniquement depuis le répertoire déjà parcouru.
      const target = join(folder, entry.name);
      if (entry.isDirectory()) await visit(target, `${logical}/`);
      else if (entry.isFile()) {
        if (markers.length) await scanFile(target, markers, Math.max(0, overlap));
      } else throw new Error('Fichier spécial interdit dans l’export.');
    }
  }
}

// ----------------------------------------------------------------------------
// Prépare les représentations brutes, JSON et URL simples des marqueurs.
// Paramètres : forbidden est une liste explicite de chaînes non vides.
// Retour : séquences d'octets reliées à leur indice, sans expressions régulières.
// Erreurs : refuse les marqueurs vides ou malformés, sans journaliser leur valeur.
// ----------------------------------------------------------------------------
function compileMarkers(forbidden: readonly string[]): Marker[] {
  // Une liste incorrecte ne doit pas devenir un contrôle silencieusement vide.
  const markers: Marker[] = [];
  // L'index permet un diagnostic sans divulguer la chaîne cherchée.
  for (const [index, value] of forbidden.entries()) {
    if (typeof value !== 'string' || !value.length) throw new Error('Sentinelle d’audit invalide.');
    // Un même encodage n'est inspecté qu'une fois pour cette sentinelle.
    const representations = new Set([value, JSON.stringify(value).slice(1, -1), encodeURIComponent(value)]);
    // Les variantes sont explicitement bornées ; aucun décodage récursif n'est promis.
    for (const representation of representations) markers.push({ bytes: Buffer.from(representation), index });
  }
  return markers;
}

// ----------------------------------------------------------------------------
// Retourne la taille d'un marqueur pour dimensionner la fenêtre de chevauchement.
// Paramètres : marker est une séquence de test ; retour : taille en octets.
// ----------------------------------------------------------------------------
function markerLength(marker: Marker): number { return marker.bytes.length; }

// ----------------------------------------------------------------------------
// Recherche chaque marqueur dans un bloc, sans recopier son contenu dans l'erreur.
// Paramètres : data est le bloc inspecté ; markers les représentations interdites.
// Erreurs : interrompt l'audit à la première correspondance.
// ----------------------------------------------------------------------------
function checkBuffer(data: Buffer, markers: readonly Marker[]): void {
  // Les comparaisons binaires couvrent aussi les ressources non textuelles.
  for (const marker of markers) {
    if (data.includes(marker.bytes)) throw new Error(`Export interdit : sentinelle ${marker.index}.`);
  }
}

// ----------------------------------------------------------------------------
// Inspecte un fichier par blocs en conservant les frontières de correspondance.
// Paramètres : path est un fichier régulier ; markers les marqueurs ; overlap la
// longueur à conserver, en octets. Retour : promesse résolue si le fichier est propre.
// Effets de bord : ouvre puis ferme un flux de lecture, même en cas d'échec d'audit.
// ----------------------------------------------------------------------------
async function scanFile(path: string, markers: readonly Marker[], overlap: number): Promise<void> {
  let tail: Buffer = Buffer.alloc(0);
  // for-await ferme le flux lorsqu'une erreur interrompt le contrôle.
  const stream = createReadStream(path, { highWaterMark: AUDIT_CHUNK_BYTES });
  // Le flux n'a pas d'encodage texte afin de conserver les octets exacts des médias.
  for await (const chunk of stream) {
    // Concaténer la fin précédente permet une correspondance traversant deux blocs.
    const data = Buffer.concat([tail, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
    checkBuffer(data, markers);
    tail = data.subarray(Math.max(0, data.length - overlap));
  }
}
