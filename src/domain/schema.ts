// ============================================================================
// ProjectSchema — Source unique de la forme d'un projet, source et publique
// ----------------------------------------------------------------------------
// Ce module décrit chaque champ une seule fois avec zod/mini. Les types (z.infer),
// la projection publique du build et la validation du détail côté navigateur en
// dérivent. Il refuse les corrections silencieuses et conserve les chemins d'erreur.
// ============================================================================
import * as z from 'zod/mini';
import { isCalendarDate, isLocalMediaPath, isSafeHttpsUrl, isSlug } from './validation.ts';

// Texte éditorial non vide ; aucun HTML n'est interprété par le schéma.
const NonEmptyTextSchema = z.string().check(z.minLength(1));
// Identifiant stable ASCII commun aux projets et catégories.
const SlugSchema = z.string().check(z.refine(isSlug, 'Identifiant stable invalide.'));
// Date calendrier stricte au format YYYY-MM-DD.
const CalendarDateSchema = z.string().check(z.refine(isCalendarDate, 'Date calendrier invalide.'));
// Nombre fini strictement positif utilisé par dimensions et durées.
const PositiveNumberSchema = z.number().check(z.positive());
// Source locale /media/ ou URL HTTPS explicitement autorisée.
const MediaSourceSchema = z.string().check(z.refine(isMediaSource, 'Source média invalide.'));
// URL HTTPS externe destinée aux actions et dépôts.
const HttpsUrlSchema = z.string().check(z.refine(isSafeHttpsUrl, 'URL HTTPS invalide.'));
// Traduction obligatoire des deux langues du produit.
const LocalizedTextSchema = z.strictObject({ en: NonEmptyTextSchema, fr: NonEmptyTextSchema });
// Pourcentage de cadrage dans le poster 16:9.
const PercentSchema = z.number().check(z.gte(0), z.lte(100));
// Position de cadrage exprimée en pourcentage dans le poster 16:9.
const PreviewFocusSchema = z.strictObject({ x: PercentSchema, y: PercentSchema });
// Catégorie déclarative traduite ; l'unicité est contrôlée au niveau catalogue.
export const CategorySchema = z.strictObject({ id: SlugSchema, label: LocalizedTextSchema });
// Types d'actions externes reconnus par la fiche.
const ProjectLinkTypeSchema = z.enum(['demo', 'website', 'release', 'documentation']);
// Lien de fiche vers une ressource externe, sans type arbitraire. window marque une démo
// qui imite un programme de bureau (le Démineur) : sur le PC de la chambre, elle s'ouvre
// dans sa propre fenêtre au lieu d'Internet Explorer.
const ProjectLinkSchema = z.strictObject({ type: ProjectLinkTypeSchema, url: HttpsUrlSchema, window: z.optional(z.literal(true)) });
// Piste de sous-titres associée à une vidéo publiable.
const CaptionTrackSchema = z.strictObject({
  src: MediaSourceSchema,
  language: z.enum(['en', 'fr']),
  label: LocalizedTextSchema,
});
// Capture de galerie ; les dimensions restent facultatives mais strictement positives.
const ImageMediaSchema = z.strictObject({
  type: z.literal('image'),
  src: MediaSourceSchema,
  thumbnail: z.optional(MediaSourceSchema),
  alt: LocalizedTextSchema,
  width: z.optional(PositiveNumberSchema),
  height: z.optional(PositiveNumberSchema),
});
// Vidéo de fiche ; uploadDate est facultative car elle ne doit jamais être inventée.
const VideoMediaSchema = z.strictObject({
  type: z.literal('video'),
  src: MediaSourceSchema,
  poster: MediaSourceSchema,
  thumbnail: z.optional(MediaSourceSchema),
  title: LocalizedTextSchema,
  description: z.optional(LocalizedTextSchema),
  captions: z.optional(z.array(CaptionTrackSchema)),
  durationSeconds: z.optional(PositiveNumberSchema),
  uploadDate: z.optional(CalendarDateSchema),
  width: z.optional(PositiveNumberSchema),
  height: z.optional(PositiveNumberSchema),
});
// Média discriminé pour empêcher un poster d'être traité comme vidéo.
const ProjectMediaSchema = z.discriminatedUnion('type', [ImageMediaSchema, VideoMediaSchema]);
// Aperçu de carte : poster obligatoire, vidéo courte et temporisation facultatives.
const ProjectPreviewSchema = z.strictObject({
  poster: MediaSourceSchema,
  video: z.optional(MediaSourceSchema),
  posterDurationMs: z.optional(PositiveNumberSchema),
  focus: z.optional(PreviewFocusSchema),
});
// Surcharge SEO locale, sans meta keywords ni HTML libre.
const ProjectSeoContentSchema = z.strictObject({
  title: z.optional(NonEmptyTextSchema),
  description: z.optional(NonEmptyTextSchema),
  image: z.optional(MediaSourceSchema),
});
// Contenu éditorial d'une langue ; les tableaux peuvent être vides sans placeholder.
const ProjectLocaleContentSchema = z.strictObject({
  tagline: NonEmptyTextSchema,
  description: NonEmptyTextSchema,
  features: z.array(NonEmptyTextSchema),
  limitations: z.optional(z.array(NonEmptyTextSchema)),
  about: z.optional(NonEmptyTextSchema),
  seo: z.optional(ProjectSeoContentSchema),
});
// Métadonnées logicielles facultatives utilisées seulement pour JSON-LD factuel.
const ApplicationInfoSchema = z.strictObject({
  category: NonEmptyTextSchema,
  operatingSystems: z.optional(z.array(NonEmptyTextSchema)),
});
// Dates éditoriales indépendantes par langue pour le sitemap.
const PageUpdatedAtSchema = z.strictObject({
  en: z.optional(CalendarDateSchema),
  fr: z.optional(CalendarDateSchema),
}).check(z.refine((value) => value.en !== undefined || value.fr !== undefined, 'Au moins une date éditoriale est requise.'));

// Champs communs au projet source et au détail public : la liste blanche unique.
const PUBLIC_PROJECT_FIELDS = {
  id: SlugSchema,
  name: NonEmptyTextSchema,
  categories: z.array(SlugSchema).check(z.minLength(1)),
  createdAt: CalendarDateSchema,
  updatedAt: CalendarDateSchema,
  status: z.enum(['prototype', 'active', 'stable', 'archived']),
  repositoryVisibility: z.enum(['public', 'private']),
  repositoryUrl: z.optional(HttpsUrlSchema),
  featured: z.boolean(),
  featuredOrder: z.optional(z.int().check(z.positive())),
  stack: z.array(NonEmptyTextSchema),
  preview: ProjectPreviewSchema,
  media: z.array(ProjectMediaSchema),
  links: z.array(ProjectLinkSchema),
  content: z.strictObject({ en: ProjectLocaleContentSchema, fr: ProjectLocaleContentSchema }),
  pageUpdatedAt: z.optional(PageUpdatedAtSchema),
  application: z.optional(ApplicationInfoSchema),
  indexable: z.boolean(),
};

// Forme d'un projet source ; le type est dérivé avant l'ajout des relations.
const ProjectShapeSchema = z.strictObject({ ...PUBLIC_PROJECT_FIELDS, hidden: z.boolean() });
// Projet complet avant projection publique ; les champs supplémentaires sont refusés.
const ProjectSchema = ProjectShapeSchema.check(z.superRefine(validateProjectRelations));
// Forme du catalogue racine, sans contrôle de relations.
const CatalogueShapeSchema = z.strictObject({
  categories: z.array(CategorySchema),
  projects: z.array(ProjectSchema),
});
// Catalogue racine ; les relations entre projets et catégories sont contrôlées ensuite.
const CatalogueSchema = CatalogueShapeSchema.check(z.superRefine(validateCatalogueRelations));
// Détail public strict : sans hidden, et sans lien de dépôt d'une source privée.
export const PublicProjectSchema = z.strictObject(PUBLIC_PROJECT_FIELDS)
  .check(z.refine(hasPublicRepositoryOnly, { message: 'URL de dépôt d’une source privée.', path: ['repositoryUrl'] }));
// Variante de projection : les clés inconnues de premier niveau sont retirées, pas copiées.
const PublicProjectProjectionSchema = z.object(PUBLIC_PROJECT_FIELDS)
  .check(z.refine(hasPublicRepositoryOnly, { message: 'URL de dépôt d’une source privée.', path: ['repositoryUrl'] }));

export type Category = z.infer<typeof CategorySchema>;
export type ProjectLinkType = z.infer<typeof ProjectLinkTypeSchema>;
export type ProjectLink = z.infer<typeof ProjectLinkSchema>;
export type PreviewFocus = z.infer<typeof PreviewFocusSchema>;
export type ProjectPreview = z.infer<typeof ProjectPreviewSchema>;
export type CaptionTrack = z.infer<typeof CaptionTrackSchema>;
export type ImageMedia = z.infer<typeof ImageMediaSchema>;
export type VideoMedia = z.infer<typeof VideoMediaSchema>;
export type ProjectMedia = z.infer<typeof ProjectMediaSchema>;
export type ProjectSeoContent = z.infer<typeof ProjectSeoContentSchema>;
export type ProjectLocaleContent = z.infer<typeof ProjectLocaleContentSchema>;
export type ApplicationInfo = z.infer<typeof ApplicationInfoSchema>;
export type Project = z.infer<typeof ProjectShapeSchema>;
export type Catalogue = z.infer<typeof CatalogueShapeSchema>;
export type PublicProject = z.infer<typeof PublicProjectSchema>;

// ----------------------------------------------------------------------------
// Valide le catalogue complet sans coercition ni réparation automatique.
// Paramètres : input peut provenir du fichier déclaratif ou d'une fixture de test.
// Retour : objet validé conforme au contrat Catalogue.
// Erreurs : $ZodError conserve chaque chemin fautif pour le script éditorial.
// ----------------------------------------------------------------------------
export function parseCatalogue(input: unknown): Catalogue {
  return CatalogueSchema.parse(input);
}

// ----------------------------------------------------------------------------
// Reconstruit un détail public depuis les seuls champs de la liste blanche.
// Paramètres : candidate est un projet visible dont hidden et le dépôt privé ont
// déjà été retirés. Retour : nouvel objet ; les clés inconnues de premier niveau
// disparaissent, et toute donnée imbriquée inattendue fait échouer le build.
// ----------------------------------------------------------------------------
export function projectPublicProject(candidate: unknown): PublicProject {
  return PublicProjectProjectionSchema.parse(candidate);
}

// ----------------------------------------------------------------------------
// Accepte uniquement une source locale de média ou une URL HTTPS sûre.
// ----------------------------------------------------------------------------
function isMediaSource(value: string): boolean {
  return isLocalMediaPath(value) || isSafeHttpsUrl(value);
}

// ----------------------------------------------------------------------------
// Refuse un lien de dépôt lorsque la source est déclarée privée.
// ----------------------------------------------------------------------------
function hasPublicRepositoryOnly(project: { repositoryVisibility: string; repositoryUrl?: string | undefined }): boolean {
  return project.repositoryUrl === undefined || project.repositoryVisibility === 'public';
}

// ----------------------------------------------------------------------------
// Contrôle les relations internes d'un projet après validation de ses champs.
// Paramètres : project est la valeur Zod ; context reçoit les chemins d'erreur précis.
// ----------------------------------------------------------------------------
function validateProjectRelations(project: Project, context: z.core.$RefinementCtx<Project>): void {
  if (project.updatedAt < project.createdAt) {
    context.addIssue({ code: 'custom', input: project.updatedAt, path: ['updatedAt'], message: 'updatedAt doit être postérieure ou égale à createdAt.' });
  }
  addDuplicateIssues(project.categories, 'categories', context);
  addDuplicateIssues(project.stack, 'stack', context);
  addDuplicateIssues(project.links.map((link) => link.type), 'links', context);
}

// ----------------------------------------------------------------------------
// Contrôle unicité globale et références de catégories connues.
// ----------------------------------------------------------------------------
function validateCatalogueRelations(catalogue: Catalogue, context: z.core.$RefinementCtx<Catalogue>): void {
  addDuplicateIssues(catalogue.categories.map((category) => category.id), 'categories', context);
  addDuplicateIssues(catalogue.projects.map((project) => project.id), 'projects', context);
  const categoryIds = new Set(catalogue.categories.map((category) => category.id));
  catalogue.projects.forEach((project, projectIndex) => {
    project.categories.forEach((categoryId, categoryIndex) => {
      if (!categoryIds.has(categoryId)) {
        context.addIssue({
          code: 'custom',
          input: categoryId,
          path: ['projects', projectIndex, 'categories', categoryIndex],
          message: `Catégorie inconnue : ${categoryId}.`,
        });
      }
    });
  });
}

// ----------------------------------------------------------------------------
// Ajoute une erreur sur chaque valeur répétée dans une collection structurée.
// Paramètres : values sont les identifiants ; field nomme la collection ; context
// agrège les erreurs sans arrêter le diagnostic au premier doublon.
// ----------------------------------------------------------------------------
function addDuplicateIssues<T>(values: readonly string[], field: string, context: z.core.$RefinementCtx<T>): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({ code: 'custom', input: value, path: [field, index], message: `Valeur dupliquée : ${value}.` });
    } else {
      seen.add(value);
    }
  });
}
