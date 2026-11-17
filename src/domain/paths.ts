// ============================================================================
// DeploymentPaths — Normalisation du montage statique partagé
// ----------------------------------------------------------------------------
// Le build et les liens clients utilisent la même représentation URL du préfixe.
// Aucun chemin système ni objet navigateur n'est manipulé par ce module.
// ============================================================================
import { decodePathSegment } from './validation.ts';

// ----------------------------------------------------------------------------
// Normalise un préfixe sûr et UTF-8 sans réduire les traversées de répertoire.
// Paramètres : raw est un chemin absolu, encodé ou Unicode, avec barre finale optionnelle.
// Retour : préfixe encodé de manière stable, terminé par une barre oblique.
// Erreurs : refuse segment vide, séparateur encodé, traversée et double décodage.
// ----------------------------------------------------------------------------
export function normalizeBasePath(raw: string): string {
  if (raw === '/') return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) throw new Error('Préfixe invalide.');
  // La barre terminale est syntaxique ; les segments intermédiaires doivent exister.
  const body = raw.endsWith('/') ? raw.slice(1, -1) : raw.slice(1);
  return `/${body.split('/').map(encodeBaseSegment).join('/')}/`;
}

// ----------------------------------------------------------------------------
// Produit un segment canonique après un unique décodage contrôlé.
// Paramètres : raw contient un seul segment brut du préfixe.
// Retour : segment UTF-8 encodé ; aucune réduction de chemin n'est effectuée.
// Erreurs : signale le contrat de préfixe sans recopier une entrée potentiellement sensible.
// ----------------------------------------------------------------------------
function encodeBaseSegment(raw: string): string {
  // Le validateur conserve les espaces encodés mais refuse les contrôles.
  const decoded = decodePathSegment(raw);
  if (decoded === null) throw new Error('Préfixe invalide.');
  return encodeURIComponent(decoded);
}
