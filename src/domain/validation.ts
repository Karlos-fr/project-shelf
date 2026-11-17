// ============================================================================
// CatalogueValidation — Prédicats sémantiques des données éditoriales
// ----------------------------------------------------------------------------
// Ces fonctions pures complètent le futur schéma Zod sans analyser les objets.
// Elles ne lisent aucun fichier, ne corrigent aucune donnée et ne font aucun réseau.
// ============================================================================

// ----------------------------------------------------------------------------
// Vérifie une date grégorienne réelle, sans coercition ou report de calendrier.
// Paramètres : value est la donnée brute du catalogue.
// Retour : vrai uniquement pour une date YYYY-MM-DD, entre les années 1 et 9999.
// ----------------------------------------------------------------------------
export function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  // Le contrôle aller-retour rejette notamment les 30 février normalisés par Date.
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

// ----------------------------------------------------------------------------
// Vérifie un identifiant ASCII stable commun aux routes et aux catégories.
// Paramètres : value est l'identifiant brut, sans normalisation préalable.
// Retour : vrai si les groupes alphanumériques minuscules sont séparés par un tiret.
// ----------------------------------------------------------------------------
export function isSlug(value: unknown): boolean {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

// ----------------------------------------------------------------------------
// Vérifie une mesure finie strictement positive, sans convertir les chaînes.
// Paramètres : value représente une durée ou une dimension à affiner par le schéma.
// Retour : vrai pour un nombre positif fini ; l'exigence d'entier reste au schéma.
// ----------------------------------------------------------------------------
export function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// ----------------------------------------------------------------------------
// Décode un seul segment sans permettre de séparateur ou de second décodage.
// Paramètres : raw est un segment URL, éventuellement encodé en UTF-8.
// Retour : segment de fichier sûr, ou null en cas d'ambiguïté.
// ----------------------------------------------------------------------------
export function decodePathSegment(raw: string): string | null {
  if (!raw || /[\s\\\u0000-\u001f\u007f-\u009f]/u.test(raw)) return null;
  try {
    // Une séquence % restante est interdite pour empêcher les encodages imbriqués.
    const decoded = decodeURIComponent(raw);
    if (decoded === '.' || decoded === '..' || /[%/\\?#:"<>|*\u0000-\u001f\u007f-\u009f]/u.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Vérifie un chemin logique de média sans l'exposer au système de fichiers.
// Paramètres : value doit rester sous /media/ et nommer un fichier, pas un dossier.
// Retour : vrai pour des segments sûrs ; aucune traversée n'est normalisée.
// ----------------------------------------------------------------------------
export function isLocalMediaPath(value: unknown): boolean {
  if (typeof value !== 'string' || !value.startsWith('/media/')) return false;
  // Les segments sont contrôlés avant que URL ou path.resolve réduise les traversées.
  const segments = value.slice('/media/'.length).split('/');
  return segments.every(isSafeSegment);
}

// ----------------------------------------------------------------------------
// Adapte le contrôle de segment au parcours d'un tableau.
// Paramètres : segment est un segment de chemin non encore décodé.
// Retour : vrai si un décodage unique produit un segment autorisé.
// ----------------------------------------------------------------------------
function isSafeSegment(segment: string): boolean {
  return decodePathSegment(segment) !== null;
}

// ----------------------------------------------------------------------------
// Vérifie un lien externe HTTPS sans credentials ni normalisation masquée.
// Paramètres : value est l'adresse brute ; aucun accès au réseau n'est réalisé.
// Retour : vrai si l'adresse et ses encodages satisfont le contrat de publication.
// ----------------------------------------------------------------------------
export function isSafeHttpsUrl(value: unknown): boolean {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f-\u009f]/u.test(value)) return false;
  // Séparer la forme brute permet de refuser ../ avant la normalisation WHATWG.
  const parts = /^https:\/\/([^/?#]+)([^?#]*)(?:[?#].*)?$/iu.exec(value);
  if (!parts || parts[1]!.includes('@') || parts[1]!.includes('%')) return false;
  try {
    // Le décodage global détecte aussi les contrôles encodés dans la requête.
    const decoded = decodeURIComponent(value);
    if (/[\\\u0000-\u001f\u007f-\u009f]/u.test(decoded) || /%[0-9a-f]{2}/iu.test(decoded)) return false;
    // Les segments non vides seuls comptent pour les liens de répertoire externes.
    const pathSegments = parts[2]!.split('/').filter(Boolean);
    if (!pathSegments.every(isSafeSegment)) return false;
    // URL assure ici la grammaire de l'hôte et du port, pas la politique de chemin.
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !!parsed.hostname && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
