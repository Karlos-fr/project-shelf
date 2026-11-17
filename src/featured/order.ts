// ============================================================================
// FeaturedOrder — Ordre éditorial des résumés mis en avant
// ----------------------------------------------------------------------------
// Cette vue structurelle reçoit uniquement des résumés déjà publiés par T3.
// Elle ne décide pas de la confidentialité et ne trie pas la grille générale.
// ============================================================================
export type FeaturedEntry = { id: string; featured: boolean; featuredOrder?: number; updatedAt: string };

// ----------------------------------------------------------------------------
// Sélectionne les Featured puis applique ordre explicite, date décroissante et id.
// Paramètres : projects contient des résumés publics avec ordre fini s'il est renseigné.
// Retour : nouveau tableau préservant le type complet et les objets fournis.
// ----------------------------------------------------------------------------
export function selectFeaturedProjects<T extends FeaturedEntry>(projects: readonly T[]): T[] {
  return projects.filter(isFeatured).sort(compareFeatured);
  // ----------------------------------------------------------------------------
  // Ne retient que les projets appartenant explicitement à la sélection éditoriale.
  // Paramètres : project est un résumé public ; retour : appartenance à Featured.
  // ----------------------------------------------------------------------------
  function isFeatured(project: T): boolean { return project.featured; }
  // ----------------------------------------------------------------------------
  // Compare les critères dans leur ordre de priorité, sans mutation des résumés.
  // Paramètres : left et right sont des Featured validés ; retour : ordre de comparaison.
  // ----------------------------------------------------------------------------
  function compareFeatured(left: T, right: T): number {
    // Un ordre absent vient après tous les ordres finis du catalogue.
    const leftOrder = left.featuredOrder ?? Infinity;
    // La même sentinelle évite de choisir une borne éditoriale arbitraire.
    const rightOrder = right.featuredOrder ?? Infinity;
    if (leftOrder !== rightOrder) return leftOrder < rightOrder ? -1 : 1;
    if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? -1 : 1;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  }
}
