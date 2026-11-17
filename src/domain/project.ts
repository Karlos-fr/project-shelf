// ============================================================================
// ProjectModels — Contrats du catalogue source et des données publiques
// ----------------------------------------------------------------------------
// Les types de projet sont dérivés du schéma Zod (z.infer) : aucune seconde liste
// de champs n'est maintenue ici. Ce fichier ajoute seulement les vues publiées.
// ============================================================================
import type { Localized } from './locale.ts';
import type { Category, Project, PublicProject } from './schema.ts';

export type {
  ApplicationInfo, CaptionTrack, Catalogue, Category, ImageMedia, PreviewFocus, Project,
  ProjectLink, ProjectLinkType, ProjectLocaleContent, ProjectMedia, ProjectPreview,
  ProjectSeoContent, PublicProject, VideoMedia,
} from './schema.ts';

export type ProjectStatus = Project['status'];
export type RepositoryVisibility = Project['repositoryVisibility'];

// Résumé de carte embarqué dans chaque page : seuls les champs affichés ou filtrés.
// Le détail complet reste dans la fiche HTML et son JSON chargé à l'ouverture.
export type ProjectSummary = Pick<PublicProject,
  'id' | 'name' | 'categories' | 'createdAt' | 'updatedAt' | 'featured' | 'featuredOrder' | 'preview'> & {
  tagline: Localized<string>;
  categoryLabels: Localized<string[]>;
  searchText: string;
};

export type PublishedCatalogue = {
  categories: Category[];
  summaries: ProjectSummary[];
  details: Record<string, PublicProject>;
};
