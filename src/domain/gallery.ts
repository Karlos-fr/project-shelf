// ============================================================================
// GallerySelection — Recherche, catégories et tri de résumés publics
// ----------------------------------------------------------------------------
// Les vues structurelles minimales conservent le type complet fourni par l'appelant.
// Elles ne constituent pas un second schéma de projet et n'acceptent pas le catalogue brut.
// ============================================================================
import type { Locale, Localized } from './locale.ts';
import type { GalleryState } from './routes.ts';

export type GalleryEntry = {
  id: string; categories: readonly string[]; createdAt: string;
  updatedAt: string; searchText: string;
};
export type LocalizedCategory = { id: string; label: Localized<string> };

// ----------------------------------------------------------------------------
// Normalise uniquement le texte de comparaison, pas les données éditoriales.
// Paramètres : value est la requête ou l'index bilingue explicitement publiable.
// Retour : texte sans accents, en minuscules, avec espaces normalisés.
// ----------------------------------------------------------------------------
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/gu, ' ').trim();
}

// ----------------------------------------------------------------------------
// Sélectionne les projets selon (catégories OR) ET (tous les mots), puis les trie.
// Paramètres : projects contient seulement des résumés publics ; state les critères.
// Retour : nouveau tableau conservant les objets et le type complet de l'entrée.
// Aucun tableau ni objet de l'appelant n'est modifié.
// ----------------------------------------------------------------------------
export function selectProjects<T extends GalleryEntry>(projects: readonly T[], state: GalleryState): T[] {
  // Une sélection vide signifie toutes les catégories ; les doublons sont sans effet.
  const selected = new Set(state.categories);
  // Une requête blanche ne crée pas de contrainte de recherche.
  const words = normalizeSearch(state.q).split(' ').filter(Boolean);
  // Le nouveau tableau est le seul objet mutable utilisé pour le résultat.
  const matches: T[] = [];
  // Les résumés sont déjà assainis par la future frontière de publication T3.
  for (const project of projects) {
    if (selected.size && !project.categories.some(inSelectedCategory)) continue;
    // La même normalisation s'applique aux textes EN et FR du résumé.
    const haystack = normalizeSearch(project.searchText);
    if (words.every(inHaystack)) matches.push(project);
    // ----------------------------------------------------------------------------
    // Vérifie un mot dans l'index du seul projet courant.
    // Paramètres : word est un mot normalisé ; retour : présence dans l'index.
    // ----------------------------------------------------------------------------
    function inHaystack(word: string): boolean { return haystack.includes(word); }
  }
  return matches.sort(compareProjects);

  // ----------------------------------------------------------------------------
  // Vérifie l'appartenance OR aux catégories sélectionnées.
  // Paramètres : id est une catégorie du résumé ; retour : présence dans le filtre.
  // ----------------------------------------------------------------------------
  function inSelectedCategory(id: string): boolean { return selected.has(id); }

  // ----------------------------------------------------------------------------
  // Départage les projets par date choisie, autre date, puis identifiant ASCII.
  // Paramètres : left et right sont des résumés dont les dates ont été validées.
  // Retour : ordre de tri, sans modifier les résumés.
  // ----------------------------------------------------------------------------
  function compareProjects(left: T, right: T): number {
    // Les dates ISO réelles ont le même ordre lexical et chronologique.
    const primary = state.sort === 'created' ? 'createdAt' : 'updatedAt';
    // Une autre date explicite rend les égalités reproductibles.
    const secondary = state.sort === 'created' ? 'updatedAt' : 'createdAt';
    return compareText(right[primary], left[primary])
      || compareText(right[secondary], left[secondary]) || compareText(left.id, right.id);
  }
}

// ----------------------------------------------------------------------------
// Trie les filtres par leur libellé traduit, sans altérer leurs identifiants.
// Paramètres : categories contient les catégories publiées ; locale règle l'alphabet.
// Retour : nouveau tableau ; les identifiants départagent les libellés égaux.
// ----------------------------------------------------------------------------
export function sortCategories<T extends LocalizedCategory>(categories: readonly T[], locale: Locale): T[] {
  // La collation dépend explicitement de la langue du site, pas de celle du serveur.
  const collator = new Intl.Collator(locale);
  return [...categories].sort(compareCategories);
  // ----------------------------------------------------------------------------
  // Compare deux libellés puis leur identifiant pour un ordre stable.
  // Paramètres : left et right sont des catégories ; retour : comparaison locale.
  // ----------------------------------------------------------------------------
  function compareCategories(left: T, right: T): number {
    return collator.compare(left.label[locale], right.label[locale]) || compareText(left.id, right.id);
  }
}

// ----------------------------------------------------------------------------
// Compare deux identifiants ou dates ISO sans dépendre de la locale d'exécution.
// Paramètres : left et right sont des chaînes validées ; retour : ordre lexical.
// ----------------------------------------------------------------------------
function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
