// ============================================================================
// DetailsLoaderCases — Contrats du chargement JSON d'une fiche publique
// ----------------------------------------------------------------------------
// Ces cas remplacent fetch par une réponse synthétique locale. Ils ne démarrent
// aucun serveur et vérifient l'id, les erreurs HTTP et les champs inconnus.
// ============================================================================
import assert from 'node:assert/strict';
import { loadProject } from '../../src/navigation/details-loader.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les cas du chargeur auprès du runner actif.
// ----------------------------------------------------------------------------
export function registerDetailsLoaderTests(register: RegisterCase): void {
  register('charge un détail public dont l id correspond', validProjectCase);
  register('refuse une réponse HTTP en échec', httpFailureCase);
  register('refuse un id différent de la route demandée', mismatchedIdCase);
  register('refuse un champ public inconnu', unknownFieldCase);
}

// Projet JSON minimal conforme au contrat public de détail.
const VALID_PROJECT = {
  id: 'example-audio', name: 'Example Audio', categories: ['audio'], createdAt: '2026-09-01', updatedAt: '2026-09-02',
  status: 'active', repositoryVisibility: 'private', featured: true, featuredOrder: 1, stack: ['TypeScript'],
  preview: { poster: '/media/example/poster.webp' }, media: [], links: [],
  content: {
    en: { tagline: 'Audio example', description: 'Synthetic example', features: ['Playback'] },
    fr: { tagline: 'Exemple audio', description: 'Exemple synthétique', features: ['Lecture'] },
  },
  indexable: true,
};

// ----------------------------------------------------------------------------
// Exécute une fonction avec fetch remplacé puis le restaure systématiquement.
// ----------------------------------------------------------------------------
async function withFetch(response: Response, run: () => Promise<void>): Promise<void> {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => response;
  try { await run(); } finally { globalThis.fetch = previous; }
}

// ----------------------------------------------------------------------------
// Vérifie le chemin nominal et l'URL préfixée demandée par le chargeur.
// ----------------------------------------------------------------------------
async function validProjectCase(): Promise<void> {
  let requested = '';
  const previous = globalThis.fetch;
  globalThis.fetch = async (input) => {
    requested = String(input);
    return Response.json(VALID_PROJECT);
  };
  try {
    const project = await loadProject('example-audio', '/shelf/', new AbortController().signal);
    assert.equal(project.id, 'example-audio');
    assert.equal(requested, '/shelf/data/projects/example-audio.json');
  } finally { globalThis.fetch = previous; }
}

// ----------------------------------------------------------------------------
// Vérifie qu'une 404 JSON ne produit jamais une fiche partielle.
// ----------------------------------------------------------------------------
async function httpFailureCase(): Promise<void> {
  await withFetch(new Response('missing', { status: 404 }), async function expectHttpFailure() {
    await assert.rejects(loadProject('example-audio', '/', new AbortController().signal), /404/);
  });
}

// ----------------------------------------------------------------------------
// Vérifie qu'un endpoint ne peut pas substituer silencieusement une autre fiche.
// ----------------------------------------------------------------------------
async function mismatchedIdCase(): Promise<void> {
  await withFetch(Response.json({ ...VALID_PROJECT, id: 'other-project' }), async function expectIdFailure() {
    await assert.rejects(loadProject('example-audio', '/', new AbortController().signal), /identifiant/i);
  });
}

// ----------------------------------------------------------------------------
// Vérifie la projection stricte également au chargement côté navigateur.
// ----------------------------------------------------------------------------
async function unknownFieldCase(): Promise<void> {
  await withFetch(Response.json({ ...VALID_PROJECT, internalNotes: 'PRIVATE_NOTE_CANARY' }), async function expectUnknownFailure() {
    await assert.rejects(loadProject('example-audio', '/', new AbortController().signal), /champ/i);
  });
}
