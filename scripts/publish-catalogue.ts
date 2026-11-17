// ============================================================================
// PublishCatalogue — Projection explicite du catalogue vers les données publiques
// ----------------------------------------------------------------------------
// Ce module filtre les projets masqués et reconstruit chaque détail par la liste
// blanche du schéma (src/domain/schema.ts). Il dérive aussi les sentinelles de
// l'audit de dist. Il ne valide pas le catalogue brut et n'écrit aucun fichier.
// ============================================================================
import { projectPublicProject } from '../src/domain/schema.ts';
import type {
  Catalogue, Category, Project, ProjectSummary, PublishedCatalogue, PublicProject,
} from '../src/domain/project.ts';

// ----------------------------------------------------------------------------
// Projette un catalogue déjà validé vers les seules données autorisées au navigateur.
// Paramètres : catalogue provient du parseur T2 ; retour : catégories utilisées,
// résumés de grille et détails indexés par identifiant.
// Confidentialité : supprime hidden et toute repositoryUrl d'une source privée.
// ----------------------------------------------------------------------------
export function publishCatalogue(catalogue: Catalogue): PublishedCatalogue {
  const visible = catalogue.projects.filter(isPublishedProject);
  const usedCategoryIds = new Set(visible.flatMap((project) => project.categories));
  const categories = catalogue.categories.filter((category) => usedCategoryIds.has(category.id)).map(projectCategory);
  const categoryById = new Map(categories.map((category) => [category.id, category] as const));
  const details: Record<string, PublicProject> = {};
  const summaries: ProjectSummary[] = [];
  for (const source of visible) {
    const detail = projectDetail(source);
    details[detail.id] = detail;
    summaries.push(projectSummary(detail, categoryById));
  }
  return { categories, summaries, details };
}

// ----------------------------------------------------------------------------
// Dérive les sentinelles qui ne doivent jamais survivre dans dist.
// Paramètres : catalogue est la source validée avant projection.
// Retour : routes et identifiants des projets masqués, liens de dépôt privés, et
// noms/libellés exclusivement masqués. Un nom ou libellé qui figure aussi dans le
// texte source d'un élément visible est une homonymie légitime : il n'est pas
// retenu, car il produirait un faux positif. Ce filtrage s'appuie sur la source
// visible, pas sur la sortie : une fuite due à la projection reste détectée.
// ----------------------------------------------------------------------------
export function forbiddenMarkers(catalogue: Catalogue): string[] {
  const visibleProjects = catalogue.projects.filter(isPublishedProject);
  const visibleCategoryIds = new Set(visibleProjects.flatMap((project) => project.categories));
  const visibleCorpus = JSON.stringify([
    visibleProjects,
    catalogue.categories.filter((category) => visibleCategoryIds.has(category.id)),
  ]);
  const strict = new Set<string>();
  const textual = new Set<string>();
  for (const project of catalogue.projects) {
    if (project.hidden) {
      strict.add(`projects/${project.id}/`);
      strict.add(`projects/${project.id}.json`);
      textual.add(project.id);
      textual.add(project.name);
    }
    if ((project.hidden || project.repositoryVisibility === 'private') && project.repositoryUrl !== undefined) {
      strict.add(project.repositoryUrl);
    }
  }
  for (const category of catalogue.categories) {
    if (visibleCategoryIds.has(category.id)) continue;
    textual.add(category.id);
    textual.add(category.label.en);
    textual.add(category.label.fr);
  }
  const markers = new Set(strict);
  for (const value of textual) if (!visibleCorpus.includes(value)) markers.add(value);
  return [...markers].filter((value) => value.length > 0);
}

// ----------------------------------------------------------------------------
// Indique si un projet source est explicitement publiable.
// Paramètres : project est déjà structurellement validé ; retour : inverse de hidden.
// ----------------------------------------------------------------------------
function isPublishedProject(project: Project): boolean {
  return !project.hidden;
}

// ----------------------------------------------------------------------------
// Reconstruit une catégorie publique sans conserver la référence de l'objet source.
// ----------------------------------------------------------------------------
function projectCategory(category: Category): Category {
  return { id: category.id, label: { en: category.label.en, fr: category.label.fr } };
}

// ----------------------------------------------------------------------------
// Reconstruit le détail public d'un projet visible.
// Paramètres : source est un projet visible ; retour : objet public indépendant.
// Confidentialité : hidden est retiré, le dépôt n'est conservé que s'il est public,
// puis le schéma public reconstruit l'objet et écarte toute autre clé.
// ----------------------------------------------------------------------------
function projectDetail(source: Project): PublicProject {
  const { hidden: _hidden, repositoryUrl, ...fields } = source;
  const publicRepository = source.repositoryVisibility === 'public' && repositoryUrl !== undefined;
  return projectPublicProject(publicRepository ? { ...fields, repositoryUrl } : fields);
}

// ----------------------------------------------------------------------------
// Produit le résumé d'une carte et son index de recherche bilingue dérivé.
// Paramètres : project est déjà public ; categories permet d'ajouter les libellés.
// Retour : résumé indépendant limité aux champs de carte, de tri et de Featured.
// ----------------------------------------------------------------------------
function projectSummary(project: PublicProject, categories: ReadonlyMap<string, Category>): ProjectSummary {
  const summary: ProjectSummary = {
    id: project.id,
    name: project.name,
    categories: [...project.categories],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    featured: project.featured,
    preview: structuredClone(project.preview),
    tagline: { en: project.content.en.tagline, fr: project.content.fr.tagline },
    categoryLabels: {
      en: categoryLabels(project, categories, 'en'),
      fr: categoryLabels(project, categories, 'fr'),
    },
    searchText: searchText(project, categories),
  };
  if (project.featuredOrder !== undefined) summary.featuredOrder = project.featuredOrder;
  return summary;
}

// ----------------------------------------------------------------------------
// Résout les libellés de catégories d'une langue dans l'ordre du projet.
// ----------------------------------------------------------------------------
function categoryLabels(project: PublicProject, categories: ReadonlyMap<string, Category>, locale: 'en' | 'fr'): string[] {
  return project.categories.flatMap((id) => {
    const category = categories.get(id);
    return category === undefined ? [] : [category.label[locale]];
  });
}

// ----------------------------------------------------------------------------
// Assemble l'index de recherche depuis les champs explicitement publiables.
// Paramètres : project est public ; categories résout seulement ses catégories visibles.
// Retour : chaîne dérivée contenant les deux langues, la stack et les libellés.
// ----------------------------------------------------------------------------
function searchText(project: PublicProject, categories: ReadonlyMap<string, Category>): string {
  const categoryLabels = project.categories.flatMap((id) => {
    const category = categories.get(id);
    return category === undefined ? [] : [category.label.en, category.label.fr];
  });
  return [
    project.name,
    project.content.en.tagline,
    project.content.en.description,
    ...project.content.en.features,
    ...(project.content.en.limitations ?? []),
    project.content.fr.tagline,
    project.content.fr.description,
    ...project.content.fr.features,
    ...(project.content.fr.limitations ?? []),
    ...project.stack,
    ...categoryLabels,
  ].join(' ');
}
