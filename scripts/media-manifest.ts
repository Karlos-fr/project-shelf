// ============================================================================
// MediaManifest — Liste blanche et confinement des fichiers médias
// ----------------------------------------------------------------------------
// Ce module reçoit uniquement des projets déjà autorisés par le pipeline T3.
// Il ne décide pas de leur publication et ne télécharge aucune ressource distante.
// ============================================================================
import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { Localized } from '../src/domain/locale.ts';
import { assetUrl } from '../src/domain/routes.ts';
import { decodePathSegment, isLocalMediaPath, isSafeHttpsUrl } from '../src/domain/validation.ts';

// Vue minimale des seules positions pouvant contenir une référence média publique.
export type PublicMediaReferences = {
  preview: { poster: string; video?: string };
  media: readonly { src: string; poster?: string; thumbnail?: string; captions?: readonly { src: string }[] }[];
  content: Localized<{ seo?: { image?: string } }>;
};

// ----------------------------------------------------------------------------
// Collecte explicitement les médias locaux nécessaires, sans explorer les autres champs.
// Paramètres : projects contient les données déjà validées et autorisées à être publiques.
// Retour : chemins logiques canoniques, uniques et triés ; les URL HTTPS sont exclues.
// Erreurs : refuse une source invalide au lieu de la copier ou de l'ignorer silencieusement.
// ----------------------------------------------------------------------------
export function collectMedia(projects: readonly PublicMediaReferences[]): string[] {
  // Les chemins canoniques réunissent les références Unicode et déjà encodées.
  const sources = new Set<string>();
  // L'énumération explicite évite de découvrir des liens dans des notes internes.
  for (const project of projects) {
    addSource(project.preview.poster); addSource(project.preview.video);
    addSource(project.content.en.seo?.image); addSource(project.content.fr.seo?.image);
    // Chaque média peut référencer son fichier, son poster, sa miniature et ses sous-titres.
    for (const media of project.media) {
      addSource(media.src); addSource(media.poster); addSource(media.thumbnail);
      // Les pistes de sous-titres locales appartiennent aussi à la liste blanche.
      for (const caption of media.captions ?? []) addSource(caption.src);
    }
  }
  return [...sources].sort();
  // ----------------------------------------------------------------------------
  // Ajoute une référence locale canonique ou laisse une ressource HTTPS distante.
  // Paramètres : src est une position média facultative, jamais un objet entier.
  // Effets de bord : ajoute uniquement le chemin logique à l'ensemble de cet appel.
  // ----------------------------------------------------------------------------
  function addSource(src: string | undefined): void {
    if (src === undefined || isSafeHttpsUrl(src)) return;
    if (!isLocalMediaPath(src)) throw new Error('Référence de média invalide.');
    sources.add(assetUrl(src, '/'));
  }
}

// ----------------------------------------------------------------------------
// Résout un média local en vérifiant sa cible réelle après les liens symboliques.
// Paramètres : root est la racine d'originaux autorisée ; logicalPath commence par /media/.
// Retour : chemin réel d'un fichier régulier contenu dans root.
// Effets de bord : consulte le système de fichiers, sans copier ni modifier les originaux.
// Erreurs : refuse traversée, cible absente, répertoire ou lien sortant de la racine.
// Cette vérification suppose des originaux immobiles pendant le build ; elle ne verrouille pas le disque.
// ----------------------------------------------------------------------------
export async function resolveLocalMedia(root: string, logicalPath: string): Promise<string> {
  if (!isLocalMediaPath(logicalPath)) throw new Error('Chemin logique de média invalide.');
  // La racine réelle est la frontière ; son simple préfixe textuel ne suffit pas.
  const realRoot = await realpath(root);
  if (!(await stat(realRoot)).isDirectory()) throw new Error('Racine de médias invalide.');
  // Un décodage unique retrouve le nom réel utilisé par les serveurs statiques.
  const segments = logicalPath.slice('/media/'.length).split('/').map(decodeMediaSegment);
  // realpath révèle les liens symboliques placés à tout niveau du chemin.
  const target = await realpath(resolve(realRoot, ...segments));
  // Sur Windows, un changement de lecteur peut produire une distance absolue.
  const distance = relative(realRoot, target);
  if (distance === '..' || distance.startsWith(`..${sep}`) || isAbsolute(distance)) {
    throw new Error('Média local hors de la racine autorisée.');
  }
  if (!(await stat(target)).isFile()) throw new Error('Le média local doit être un fichier régulier.');
  return target;
}

// ----------------------------------------------------------------------------
// Convertit un segment logique vérifié vers le nom de fichier correspondant.
// Paramètres : segment représente un seul élément URL du chemin média.
// Retour : nom décodé ; aucune résolution de répertoire n'est effectuée ici.
// ----------------------------------------------------------------------------
function decodeMediaSegment(segment: string): string {
  // Le contrôle est répété à cette frontière plutôt que d'utiliser une assertion de type.
  const decoded = decodePathSegment(segment);
  if (decoded === null) throw new Error('Segment de média invalide.');
  return decoded;
}
