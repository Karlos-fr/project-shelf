// ============================================================================
// CatalogueFixtures — Données synthétiques bilingues des tests ProjectShelf
// ----------------------------------------------------------------------------
// Ces objets ne représentent aucun projet réel et ne doivent jamais alimenter un
// build de production sans le flag --fixture explicitement prévu par le pipeline.
// ============================================================================
import type {
  Category, Project, ProjectMedia, ProjectSummary, PublishedCatalogue, PublicProject,
} from '../../src/domain/project.ts';
import type { SiteConfig } from '../../src/config/site.ts';
import type { RouteState } from '../../src/domain/routes.ts';
import { publishCatalogue } from '../../scripts/publish-catalogue.ts';

// Catégories synthétiques couvrant tri, filtre OR et exclusion d'une catégorie masquée.
export const fixtureCategories: Category[] = [
  { id: 'audio', label: { en: 'Audio', fr: 'Audio' } },
  { id: 'games', label: { en: 'Games & ports', fr: 'Jeux et portages' } },
  { id: 'hardware', label: { en: 'Hardware', fr: 'Matériel' } },
  { id: 'web', label: { en: 'Web', fr: 'Web' } },
  { id: 'hidden-only', label: { en: 'Hidden only', fr: 'Masqué uniquement' } },
];

// ----------------------------------------------------------------------------
// Produit le projet minimal de référence sans partager de tableau entre appels.
// Paramètres : overrides remplace les champs nécessaires au scénario.
// Retour : projet synthétique valide attendu par le schéma T2.
// ----------------------------------------------------------------------------
export function minimalProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'example-audio',
    name: 'Example Audio',
    categories: ['audio'],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-02',
    status: 'active',
    repositoryVisibility: 'public',
    repositoryUrl: 'https://github.com/example/example-audio',
    hidden: false,
    featured: true,
    featuredOrder: 1,
    stack: ['TypeScript', 'Web Audio'],
    preview: { poster: '/media/example/poster.svg' },
    media: [],
    links: [{ type: 'demo', url: 'https://example.test/demo' }],
    content: {
      en: { tagline: 'Audio example', description: 'Synthetic audio example', features: ['Playback'] },
      fr: { tagline: 'Exemple audio', description: 'Exemple audio synthétique', features: ['Lecture'] },
    },
    indexable: true,
    ...structuredClone(overrides),
  };
}

// ----------------------------------------------------------------------------
// Produit les cinq projets synthétiques attendus par les scénarios de galerie.
// Retour : quatre visibles et un hidden-canary avec catégorie dédiée.
// ----------------------------------------------------------------------------
export function fixtureProjects(): Project[] {
  return [
    minimalProject(),
    minimalProject({
      id: 'example-port', name: 'Example Port', categories: ['games'], createdAt: '2026-08-20',
      updatedAt: '2026-09-02', featuredOrder: 2,
      content: {
        en: { tagline: 'Game port', description: 'Synthetic game port', features: ['Rendering'] },
        fr: { tagline: 'Portage de jeu', description: 'Portage synthétique', features: ['Rendu'] },
      },
    }),
    minimalProject({
      id: 'example-web', name: 'Example Web', categories: ['web'], createdAt: '2026-08-15',
      updatedAt: '2026-09-01', featuredOrder: 3,
      content: {
        en: { tagline: 'Web app', description: 'Synthetic web project', features: ['Responsive UI'] },
        fr: { tagline: 'Application web', description: 'Projet web synthétique', features: ['Interface responsive'] },
      },
    }),
    minimalProject({
      id: 'example-hardware', name: 'Example Hardware', categories: ['hardware'], createdAt: '2026-08-15',
      updatedAt: '2026-09-01', featured: false, featuredOrder: undefined,
      content: {
        en: { tagline: 'Hardware experiment', description: 'Synthetic hardware experiment', features: ['Serial link'] },
        fr: { tagline: 'Expérimentation matérielle', description: 'Expérimentation synthétique', features: ['Liaison série'] },
      },
    }),
    minimalProject({
      id: 'hidden-canary', name: 'HIDDEN_SENTINEL', categories: ['hidden-only'], hidden: true,
      featured: false, featuredOrder: undefined, repositoryUrl: 'https://example.test/private-hidden-source',
    }),
  ];
}

// ----------------------------------------------------------------------------
// Produit la configuration de build fixture de référence.
// ----------------------------------------------------------------------------
export function siteFixture(): SiteConfig {
  return {
    origin: 'https://example.test', base: '/', mode: 'production', name: 'ProjectShelf',
    intro: { en: 'Games, apps, and experiments.', fr: 'Jeux, applications et expérimentations.' },
    githubUrl: 'https://github.com/example',
  };
}

// ----------------------------------------------------------------------------
// Produit la projection publique complète des fixtures visibles.
// ----------------------------------------------------------------------------
export function publishedFixture(): PublishedCatalogue {
  return publishCatalogue({ categories: structuredClone(fixtureCategories), projects: fixtureProjects() });
}

// ----------------------------------------------------------------------------
// Retourne un détail public indépendant pour les tests de fiche et SEO.
// ----------------------------------------------------------------------------
export function publicProjectFixture(): PublicProject {
  const value = publishedFixture().details['example-audio'];
  if (value === undefined) throw new Error('Fixture example-audio absente.');
  return structuredClone(value);
}

export type ShowcaseFixtureProps = {
  config: SiteConfig;
  categories: Category[];
  summaries: ProjectSummary[];
  initialRoute: RouteState;
  initialProject?: PublicProject;
};

// ----------------------------------------------------------------------------
// Produit exactement les données initiales d'un accueil anglais T5/T6.
// ----------------------------------------------------------------------------
export function showcaseFixtureProps(): ShowcaseFixtureProps {
  const published = publishedFixture();
  return {
    config: siteFixture(),
    categories: structuredClone(published.categories),
    summaries: structuredClone(published.summaries),
    initialRoute: { locale: 'en', projectId: null, categories: [], sort: 'updated', q: '' },
  };
}

// ----------------------------------------------------------------------------
// Produit une fiche média avec vidéo placée après une image pour tester le réordonnancement.
// ----------------------------------------------------------------------------
export function mediaProject(): PublicProject {
  const project = publicProjectFixture();
  const media: ProjectMedia[] = [
    { type: 'image', src: '/media/example/screenshot-1.webp', alt: { en: 'Full example window', fr: 'Fenêtre complète de l’exemple' } },
    {
      type: 'video', src: '/media/example/demo.mp4', poster: '/media/example/video-poster.webp',
      thumbnail: '/media/example/video-thumb.webp', title: { en: 'Video', fr: 'Vidéo' },
      description: { en: 'Synthetic demonstration', fr: 'Démonstration synthétique' },
      uploadDate: '2026-09-02', durationSeconds: 7,
      captions: [{ src: '/media/example/en.vtt', language: 'en', label: { en: 'English captions', fr: 'Sous-titres anglais' } }],
    },
  ];
  project.media = media;
  return project;
}
