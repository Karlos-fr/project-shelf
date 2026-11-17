// ============================================================================
// MediaFileCases — Contrats de confinement et d'audit des fichiers distribués
// ----------------------------------------------------------------------------
// Ces tests utilisent de vrais fichiers temporaires synthétiques, jamais les
// médias d'un projet réel. Ils ne remplacent pas un audit de dist produit par Astro.
// ============================================================================
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectMedia, resolveLocalMedia } from '../../scripts/media-manifest.ts';
import { auditDist } from '../../scripts/audit-dist.ts';
import type { RegisterCase } from './validation.ts';

type MediaFixture = { temp: string; root: string; outside: string; dist: string };
type MediaScenario = (fixture: MediaFixture) => Promise<void>;

// ----------------------------------------------------------------------------
// Enregistre les scénarios disque auprès du runner, avec nettoyage systématique.
// Paramètres : register est l'API de Node ou Vitest ; retour : aucun.
// Effets de bord : enregistrement uniquement ; chaque cas gère ses propres fichiers.
// ----------------------------------------------------------------------------
export function registerMediaFileTests(register: RegisterCase): void {
  register('collecte seulement les références de média prévues', collectionCase);
  register('refuse un média hors du contrat de source', invalidCollectionCase);
  register('résout un fichier Unicode dans la racine', withFixture(unicodeFileCase));
  register('accepte un lien symbolique restant dans la racine', withFixture(internalSymlinkCase));
  register('refuse un lien vers un répertoire voisin', withFixture(externalSymlinkCase));
  register('refuse un répertoire intermédiaire symbolique sortant', withFixture(parentSymlinkCase));
  register('refuse un fichier absent ou une référence de répertoire', withFixture(missingFileCase));
  register('refuse la traversée avant accès au disque', withFixture(traversalCase));
  register('audite un export propre avec fichiers binaires', withFixture(cleanExportCase));
  register('détecte une sentinelle à cheval sur deux blocs', withFixture(chunkBoundaryCase));
  register('détecte une sentinelle dans un nom de fichier', withFixture(filenameCase));
  register('détecte un contenu JSON échappé', withFixture(escapedCase));
  register('détecte une adresse encodée dans un export', withFixture(encodedCase));
  register('refuse les liens symboliques distribués', withFixture(exportSymlinkCase));
  register('refuse une sentinelle vide', withFixture(emptySentinelCase));
}

// ----------------------------------------------------------------------------
// Vérifie la sélection explicite et dédupliquée des ressources locales.
// Aucun accès distant ou à un catalogue d'origine n'est nécessaire à ce scénario.
// ----------------------------------------------------------------------------
function collectionCase(): void {
  // Objet public minimal avec champs supplémentaires simulant une donnée non sélectionnée.
  const project = {
    preview: { poster: '/media/poster.webp', video: '/media/preview.mp4' },
    media: [
      { type: 'image', src: '/media/écran.webp' },
      { type: 'video', src: 'https://cdn.example.test/demo.mp4', poster: '/media/poster.webp', thumbnail: '/media/thumbnail.webp', captions: [{ src: '/media/fr.vtt' }] },
    ],
    content: { en: { seo: { image: '/media/share.webp' } }, fr: { seo: { image: '/media/share.webp' } } },
    internalNote: '/media/never-copy.webp',
  };
  assert.deepEqual(collectMedia([project]), [
    '/media/%C3%A9cran.webp', '/media/fr.vtt', '/media/poster.webp',
    '/media/preview.mp4', '/media/share.webp', '/media/thumbnail.webp',
  ]);
  assert.equal(project.media[0]!.src, '/media/écran.webp');
}

// ----------------------------------------------------------------------------
// Exige le rejet d'une ressource dangereuse, pas son oubli silencieux.
// ----------------------------------------------------------------------------
function invalidCollectionCase(): void {
  // ----------------------------------------------------------------------------
  // Soumet un schéma actif à la collecte sans effectuer de lecture réseau.
  // Erreurs : l’assertion attend une exception ; aucune valeur invalide n’est publiée.
  // ----------------------------------------------------------------------------
  assert.throws(function invalidSource() {
    collectMedia([{ preview: { poster: 'javascript:alert(1)' }, media: [], content: { en: {}, fr: {} } }]);
  });
}

// ----------------------------------------------------------------------------
// Encadre une fonction de scénario par un répertoire temporaire dédié.
// Paramètres : scenario est le test à exécuter avec des ressources synthétiques.
// Retour : fonction compatible avec les runners, dont la promesse couvre le nettoyage.
// Effets de bord : crée puis supprime uniquement son propre répertoire temporaire.
// ----------------------------------------------------------------------------
function withFixture(scenario: MediaScenario): () => Promise<void> {
  // ----------------------------------------------------------------------------
  // Exécute un scénario avec une racine média et un voisin hors de cette racine.
  // Effets de bord : prépare les fichiers de test et les nettoie même sur échec.
  // ----------------------------------------------------------------------------
  return async function scopedMediaCase(): Promise<void> {
    // Répertoire unique : aucun chemin du dépôt ou fichier utilisateur n'est supprimé.
    const temp = await mkdtemp(join(tmpdir(), 'project-shelf-media-'));
    // Le voisin partage un préfixe pour détecter les comparaisons startsWith fragiles.
    const fixture = { temp, root: join(temp, 'media'), outside: join(temp, 'media-private'), dist: join(temp, 'dist') };
    try {
      await mkdir(fixture.root); await mkdir(fixture.outside); await mkdir(fixture.dist);
      await writeFile(join(fixture.root, 'écran public.webp'), 'synthetic-public-fixture');
      await writeFile(join(fixture.outside, 'private.webp'), 'PRIVATE_CANARY');
      await scenario(fixture);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  };
}

// ----------------------------------------------------------------------------
// Crée un lien de répertoire portable pour tester les frontières de fichiers.
// Paramètres : target et destination sont des chemins temporaires absolus.
// Effets de bord : crée une jonction sous Windows, un lien symbolique ailleurs.
// ----------------------------------------------------------------------------
async function createDirectoryLink(target: string, destination: string): Promise<void> {
  await symlink(target, destination, process.platform === 'win32' ? 'junction' : 'dir');
}

// ----------------------------------------------------------------------------
// Vérifie le décodage du nom local sans changer de racine média.
// Paramètres : fixture fournit la racine synthétique ; aucun autre fichier n'est lu.
// ----------------------------------------------------------------------------
async function unicodeFileCase(fixture: MediaFixture): Promise<void> {
  assert.equal(await resolveLocalMedia(fixture.root, '/media/%C3%A9cran%20public.webp'), await realpath(join(fixture.root, 'écran public.webp')));
}

// ----------------------------------------------------------------------------
// Autorise un lien source dont la cible réelle reste dans la racine autorisée.
// Paramètres : fixture fournit uniquement des fichiers synthétiques temporaires.
// ----------------------------------------------------------------------------
async function internalSymlinkCase(fixture: MediaFixture): Promise<void> {
  const targetDir = join(fixture.root, 'internal-target');
  await mkdir(targetDir);
  await writeFile(join(targetDir, 'public.webp'), 'synthetic-public-fixture');
  await createDirectoryLink(targetDir, join(fixture.root, 'alias'));
  assert.equal(await resolveLocalMedia(fixture.root, '/media/alias/public.webp'), await realpath(join(targetDir, 'public.webp')));
}

// ----------------------------------------------------------------------------
// Refuse un lien source vers une cible partageant seulement le préfixe du dossier.
// Paramètres : fixture inclut un voisin privé synthétique et une racine publique.
// ----------------------------------------------------------------------------
async function externalSymlinkCase(fixture: MediaFixture): Promise<void> {
  await createDirectoryLink(fixture.outside, join(fixture.root, 'leak'));
  await assert.rejects(resolveLocalMedia(fixture.root, '/media/leak/private.webp'));
}

// ----------------------------------------------------------------------------
// Refuse une sortie masquée dans un répertoire parent symbolique.
// Paramètres : fixture contient un voisin hors du périmètre autorisé.
// ----------------------------------------------------------------------------
async function parentSymlinkCase(fixture: MediaFixture): Promise<void> {
  const nested = join(fixture.root, 'nested');
  await mkdir(nested);
  await createDirectoryLink(fixture.outside, join(nested, 'outside'));
  await assert.rejects(resolveLocalMedia(fixture.root, '/media/nested/outside/private.webp'));
}

// ----------------------------------------------------------------------------
// Refuse les références qui ne désignent pas un fichier régulier présent.
// Paramètres : fixture est la racine temporaire, sans média absent à inventer.
// ----------------------------------------------------------------------------
async function missingFileCase(fixture: MediaFixture): Promise<void> {
  await mkdir(join(fixture.root, 'folder'));
  await assert.rejects(resolveLocalMedia(fixture.root, '/media/missing.webp'));
  await assert.rejects(resolveLocalMedia(fixture.root, '/media/folder'));
}

// ----------------------------------------------------------------------------
// Vérifie le rejet d'une traversée brute ou encodée avant l'accès au fichier cible.
// Paramètres : fixture fournit la racine autorisée, pas un accès au voisin.
// ----------------------------------------------------------------------------
async function traversalCase(fixture: MediaFixture): Promise<void> {
  await assert.rejects(resolveLocalMedia(fixture.root, '/media/../media-private/private.webp'));
  await assert.rejects(resolveLocalMedia(fixture.root, '/media/%2e%2e/media-private/private.webp'));
  await assert.rejects(resolveLocalMedia(fixture.root, 'https://example.test/remote.webp'));
}

// ----------------------------------------------------------------------------
// Vérifie qu'un audit propre inspecte aussi les sous-répertoires binaires.
// Paramètres : fixture contient un dist isolé ; aucun export applicatif n'est simulé.
// ----------------------------------------------------------------------------
async function cleanExportCase(fixture: MediaFixture): Promise<void> {
  await mkdir(join(fixture.dist, 'media'));
  await writeFile(join(fixture.dist, 'index.html'), '<h1>Public</h1>');
  await writeFile(join(fixture.dist, 'media', 'file.bin'), Buffer.from([0, 255, 0, 1]));
  await auditDist(fixture.dist, ['PRIVATE_CANARY']);
}

// ----------------------------------------------------------------------------
// Vérifie le chevauchement entre blocs du scanner, y compris dans les binaires.
// Paramètres : fixture reçoit un fichier synthétique plus grand qu'un bloc de lecture.
// ----------------------------------------------------------------------------
async function chunkBoundaryCase(fixture: MediaFixture): Promise<void> {
  await writeFile(join(fixture.dist, 'file.bin'), Buffer.concat([Buffer.alloc(65533, 0), Buffer.from('PRIVATE_CANARY'), Buffer.alloc(200)]));
  await assert.rejects(auditDist(fixture.dist, ['PRIVATE_CANARY']), /interdit/i);
}

// ----------------------------------------------------------------------------
// Vérifie les noms de fichiers, même lorsque leur contenu est vide.
// Paramètres : fixture reçoit un nom de sentinelle volontairement publiable au test.
// ----------------------------------------------------------------------------
async function filenameCase(fixture: MediaFixture): Promise<void> {
  await writeFile(join(fixture.dist, 'hidden-canary.json'), '{}');
  await assert.rejects(auditDist(fixture.dist, ['hidden-canary']), /interdit/i);
}

// ----------------------------------------------------------------------------
// Vérifie un secret synthétique dont les guillemets sont échappés par JSON.
// Paramètres : fixture fournit uniquement le répertoire de sortie temporaire.
// ----------------------------------------------------------------------------
async function escapedCase(fixture: MediaFixture): Promise<void> {
  await writeFile(join(fixture.dist, 'data.json'), JSON.stringify({ note: 'hidden"canary' }));
  await assert.rejects(auditDist(fixture.dist, ['hidden"canary']), /interdit/i);
}

// ----------------------------------------------------------------------------
// Vérifie qu'un encodage URL simple ne masque pas la sentinelle à l'audit.
// Paramètres : fixture est le répertoire de sortie synthétique.
// ----------------------------------------------------------------------------
async function encodedCase(fixture: MediaFixture): Promise<void> {
  await writeFile(join(fixture.dist, 'data.txt'), encodeURIComponent('https://example.test/private-source'));
  await assert.rejects(auditDist(fixture.dist, ['https://example.test/private-source']), /interdit/i);
}

// ----------------------------------------------------------------------------
// Refuse de distribuer un lien symbolique, même sans sentinelle configurée.
// Paramètres : fixture fournit une cible voisine, jamais un fichier utilisateur.
// ----------------------------------------------------------------------------
async function exportSymlinkCase(fixture: MediaFixture): Promise<void> {
  await createDirectoryLink(fixture.outside, join(fixture.dist, 'alias'));
  await assert.rejects(auditDist(fixture.dist, []), /symbolique/i);
}

// ----------------------------------------------------------------------------
// Refuse une sentinelle vide dont la correspondance serait toujours vraie.
// Paramètres : fixture fournit le dist temporaire, sans effet sur le dépôt.
// ----------------------------------------------------------------------------
async function emptySentinelCase(fixture: MediaFixture): Promise<void> {
  await assert.rejects(auditDist(fixture.dist, ['']), /sentinelle/i);
}
