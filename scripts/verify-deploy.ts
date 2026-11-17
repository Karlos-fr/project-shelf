// ============================================================================
// VerifyDeploy — Recette HTTP explicite d'un déploiement déjà existant
// ----------------------------------------------------------------------------
// Ce script vérifie un site fourni par l'utilisateur. Il ne déploie rien, ne
// déclenche aucun job GitHub et ne déduit jamais une URL de production.
// ============================================================================

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type VerifyOptions = {
  baseUrl: string;
  projectId?: string;
  mediaPath?: string;
};

// ----------------------------------------------------------------------------
// Analyse l'URL cible et les ressources optionnelles de la recette HTTP.
// ----------------------------------------------------------------------------
export function parseVerifyOptions(args: readonly string[]): VerifyOptions {
  let baseUrl: string | undefined;
  let projectId: string | undefined;
  let mediaPath: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token !== '--url' && token !== '--project' && token !== '--media') throw new Error(`Option de vérification inconnue : ${String(token)}.`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Valeur manquante pour ${token}.`);
    index += 1;
    if (token === '--url') baseUrl = value;
    else if (token === '--project') projectId = value;
    else mediaPath = value;
  }
  if (baseUrl === undefined) throw new Error('--url est obligatoire.');
  const parsed = new URL(baseUrl);
  if (!/^https?:$/u.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('--url doit être une URL HTTP(S) explicite sans identifiants, query ni fragment.');
  }
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/';
  const options: VerifyOptions = { baseUrl: parsed.href };
  if (projectId !== undefined) options.projectId = projectId;
  if (mediaPath !== undefined) options.mediaPath = mediaPath;
  return options;
}

// ----------------------------------------------------------------------------
// Vérifie les statuts et métadonnées essentielles d'un site déjà servi.
// Paramètres : options provient uniquement de la ligne de commande explicite.
// Effets de bord : effectue des requêtes GET en lecture seule vers la cible donnée.
// ----------------------------------------------------------------------------
export async function verifyDeployment(options: VerifyOptions): Promise<void> {
  const english = await fetchRequired(new URL('en/', options.baseUrl), 200);
  const french = await fetchRequired(new URL('fr/', options.baseUrl), 200);
  await assertIndexable(english, 'accueil anglais');
  await assertIndexable(french, 'accueil français');

  const missing = new URL('__project-shelf-missing__/', options.baseUrl);
  await fetchRequired(missing, 404);

  if (options.projectId !== undefined) {
    const projectPath = `en/projects/${encodeURIComponent(options.projectId)}/`;
    const projectPage = await fetchRequired(new URL(projectPath, options.baseUrl), 200);
    await assertIndexable(projectPage, 'fiche projet');
    const json = await fetchRequired(new URL(`data/projects/${encodeURIComponent(options.projectId)}.json`, options.baseUrl), 200);
    if (!(json.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
      throw new Error('Le détail projet ne possède pas un Content-Type JSON.');
    }
  }

  if (options.mediaPath !== undefined) {
    const media = await fetchRequired(new URL(options.mediaPath.replace(/^\/+/, ''), options.baseUrl), 200);
    const type = (media.headers.get('content-type') ?? '').toLowerCase();
    if (!/^(image|video|text\/vtt)/u.test(type)) throw new Error(`MIME média inattendu : ${type || '<absent>'}.`);
    if (media.headers.get('cache-control') === null) throw new Error('Le média ne possède pas de Cache-Control.');
  }
}

// ----------------------------------------------------------------------------
// Effectue une requête et exige exactement le statut HTTP attendu.
// ----------------------------------------------------------------------------
async function fetchRequired(url: URL, status: number): Promise<Response> {
  const response = await fetch(url, { redirect: 'manual' });
  if (response.status !== status) throw new Error(`${url.href} retourne ${response.status}, attendu ${status}.`);
  return response;
}

// ----------------------------------------------------------------------------
// Refuse une page de production qui contient encore une directive noindex.
// ----------------------------------------------------------------------------
async function assertIndexable(response: Response, label: string): Promise<void> {
  const html = await response.text();
  if (/name=["']robots["'][^>]+noindex|noindex[^>]+name=["']robots["']/iu.test(html)) {
    throw new Error(`${label} contient encore noindex.`);
  }
}

// ----------------------------------------------------------------------------
// Exécute la recette CLI sans aucune mutation de l'hébergement testé.
// ----------------------------------------------------------------------------
async function runCli(): Promise<void> {
  try {
    const options = parseVerifyOptions(process.argv.slice(2));
    await verifyDeployment(options);
    console.log('Recette HTTP ProjectShelf réussie.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void runCli();
