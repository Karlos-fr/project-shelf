// ============================================================================
// PublicationCases — Contrats de projection du catalogue vers le public
// ----------------------------------------------------------------------------
// Ces tests manipulent uniquement des objets synthétiques. Ils vérifient qu'aucun
// champ source non autorisé, projet masqué ou URL privée ne franchit la frontière.
// ============================================================================
import assert from 'node:assert/strict';
import { forbiddenMarkers, publishCatalogue } from '../../scripts/publish-catalogue.ts';
import type { Catalogue, Project } from '../../src/domain/project.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios de publication auprès du runner actif.
// Paramètres : register reçoit un nom et une fonction de test.
// ----------------------------------------------------------------------------
export function registerPublicationTests(register: RegisterCase): void {
  register('retire projet masqué et URL de dépôt privé', privacyCase);
  register('retire les champs inconnus par projection explicite', unknownFieldCase);
  register('retire les catégories uniquement utilisées par un projet masqué', hiddenCategoryCase);
  register('construit un index de recherche bilingue sans modifier la source', searchIndexCase);
  register('publie le lien de dépôt uniquement lorsque la visibilité est publique', publicRepositoryCase);
  register('limite le résumé de carte aux champs affichés', compactSummaryCase);
  register('dérive les sentinelles des projets masqués et dépôts privés', markersCase);
  register('ignore une homonymie entre projet masqué et texte visible', markerCollisionCase);
}

// ----------------------------------------------------------------------------
// Vérifie les deux règles de confidentialité principales sur un même catalogue.
// ----------------------------------------------------------------------------
function privacyCase(): void {
  const hidden = project({ id: 'hidden-canary', hidden: true, repositoryUrl: 'https://example.test/hidden' });
  const visible = project({ repositoryVisibility: 'private', repositoryUrl: 'https://example.test/private-source' });
  const published = publishCatalogue(catalogue([hidden, visible]));
  const serialized = JSON.stringify(published);
  assert.equal(published.summaries.length, 1);
  assert.equal(Object.keys(published.details).length, 1);
  assert.doesNotMatch(serialized, /hidden-canary|private-source/);
  assert.equal(published.details['example-audio']?.repositoryVisibility, 'private');
  assert.equal(published.details['example-audio']?.repositoryUrl, undefined);
}

// ----------------------------------------------------------------------------
// Vérifie que l'opérateur de projection n'étale jamais un objet source inconnu.
// ----------------------------------------------------------------------------
function unknownFieldCase(): void {
  const source = { ...project(), internalNotes: 'PRIVATE_NOTE_CANARY', secretFlag: true } as Project;
  const published = publishCatalogue(catalogue([source]));
  assert.doesNotMatch(JSON.stringify(published), /PRIVATE_NOTE_CANARY|secretFlag|internalNotes/);
}

// ----------------------------------------------------------------------------
// Vérifie que les filtres publics ne révèlent pas une catégorie sans projet visible.
// ----------------------------------------------------------------------------
function hiddenCategoryCase(): void {
  const visible = project({ categories: ['audio'] });
  const hidden = project({ id: 'hidden-canary', categories: ['private'], hidden: true });
  const published = publishCatalogue({
    categories: [category('audio', 'Audio', 'Audio'), category('private', 'Private', 'Privé')],
    projects: [visible, hidden],
  });
  assert.deepEqual(published.categories.map((entry) => entry.id), ['audio']);
}

// ----------------------------------------------------------------------------
// Vérifie que l'index publié couvre les deux langues et reste dérivé, pas édité.
// ----------------------------------------------------------------------------
function searchIndexCase(): void {
  const source = project();
  const snapshot = structuredClone(source);
  const published = publishCatalogue(catalogue([source]));
  const summary = published.summaries[0];
  assert.match(summary?.searchText ?? '', /English tagline/);
  assert.match(summary?.searchText ?? '', /Accroche française/);
  assert.match(summary?.searchText ?? '', /TypeScript/);
  assert.match(summary?.searchText ?? '', /Audio/);
  assert.deepEqual(source, snapshot);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une source publique conserve son lien explicitement autorisé.
// ----------------------------------------------------------------------------
function publicRepositoryCase(): void {
  const source = project({ repositoryVisibility: 'public', repositoryUrl: 'https://github.com/example/project' });
  const published = publishCatalogue(catalogue([source]));
  assert.equal(published.details['example-audio']?.repositoryUrl, 'https://github.com/example/project');
}

// ----------------------------------------------------------------------------
// Vérifie que chaque page n'embarque pas le contenu complet de toutes les fiches.
// ----------------------------------------------------------------------------
function compactSummaryCase(): void {
  const published = publishCatalogue(catalogue([project()]));
  const summary = published.summaries[0];
  assert.deepEqual(summary?.tagline, { en: 'English tagline', fr: 'Accroche française' });
  assert.equal('content' in (summary ?? {}), false);
  assert.equal('stack' in (summary ?? {}), false);
}

// ----------------------------------------------------------------------------
// Vérifie les sentinelles nominales : routes, identifiant, nom et dépôt privé.
// ----------------------------------------------------------------------------
function markersCase(): void {
  const hidden = project({ id: 'hidden-canary', name: 'Hidden Canary', hidden: true });
  const visible = project({ repositoryUrl: 'https://example.test/private-source' });
  const markers = forbiddenMarkers(catalogue([hidden, visible]));
  for (const expected of ['projects/hidden-canary/', 'projects/hidden-canary.json', 'hidden-canary', 'Hidden Canary', 'https://example.test/private-source']) {
    assert.ok(markers.includes(expected), expected);
  }
  assert.equal(markers.includes('Example Audio'), false);
}

// ----------------------------------------------------------------------------
// Vérifie qu'un nom courant d'un projet masqué ne bloque pas un texte visible
// légitime, tandis que ses routes restent surveillées.
// ----------------------------------------------------------------------------
function markerCollisionCase(): void {
  const hidden = project({ id: 'snake', name: 'Snake', hidden: true });
  const visible = project({
    content: {
      en: { tagline: 'A Snake clone', description: 'Classic snake game', features: [] },
      fr: { tagline: 'Un clone de Snake', description: 'Jeu snake classique', features: [] },
    },
  });
  const markers = forbiddenMarkers(catalogue([hidden, visible]));
  assert.equal(markers.includes('Snake'), false);
  assert.equal(markers.includes('snake'), false);
  assert.ok(markers.includes('projects/snake/'));
}

// ----------------------------------------------------------------------------
// Produit un catalogue minimal dont toutes les valeurs sont synthétiques.
// Paramètres : projects est la liste à projeter ; retour : catalogue source de test.
// ----------------------------------------------------------------------------
function catalogue(projects: Project[]): Catalogue {
  return { categories: [category('audio', 'Audio', 'Audio')], projects };
}

// ----------------------------------------------------------------------------
// Produit une catégorie traduite pour les scénarios de publication.
// ----------------------------------------------------------------------------
function category(id: string, en: string, fr: string) {
  return { id, label: { en, fr } };
}

// ----------------------------------------------------------------------------
// Produit un projet synthétique valide au niveau structurel nécessaire à T3.
// Paramètres : overrides remplace uniquement les champs utiles au scénario.
// Retour : nouvel objet indépendant ; aucune donnée réelle de dépôt n'est utilisée.
// ----------------------------------------------------------------------------
function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'example-audio',
    name: 'Example Audio',
    categories: ['audio'],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-02',
    status: 'active',
    repositoryVisibility: 'private',
    hidden: false,
    featured: true,
    featuredOrder: 1,
    stack: ['TypeScript'],
    preview: { poster: '/media/example/poster.webp' },
    media: [],
    links: [{ type: 'demo', url: 'https://example.test/demo' }],
    content: {
      en: { tagline: 'English tagline', description: 'English description', features: ['Feature one'] },
      fr: { tagline: 'Accroche française', description: 'Description française', features: ['Fonction une'] },
    },
    indexable: true,
    ...overrides,
  };
}
