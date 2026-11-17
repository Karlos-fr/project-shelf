// ============================================================================
// DetailsLoader — Chargement et validation d'une fiche publique pré-générée
// ----------------------------------------------------------------------------
// Ce module charge un seul JSON public depuis le même montage que la page. Il
// refuse les réponses HTTP, identifiants incohérents et champs hors contrat, en
// réutilisant le schéma public strict plutôt qu'une seconde liste de champs.
// Le schéma est importé à la demande : Zod ne pèse pas sur le chargement initial.
// ============================================================================
import type { PublicProject } from '../domain/project.ts';
import { normalizeBasePath } from '../domain/paths.ts';
import { isSlug } from '../domain/validation.ts';

// ----------------------------------------------------------------------------
// Charge le détail public d'un projet pour la popin.
// Paramètres : id est l'identifiant de route ; base le montage ; signal annule
// une ouverture devenue obsolète.
// Retour : projet public validé dont l'id correspond à la demande.
// Erreurs : HTTP en échec, JSON hors contrat ou identifiant substitué.
// ----------------------------------------------------------------------------
export async function loadProject(id: string, base: string, signal: AbortSignal): Promise<PublicProject> {
  if (!isSlug(id)) throw new Error('Identifiant de projet invalide.');
  const path = `${normalizeBasePath(base)}data/projects/${id}.json`;
  const response = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Chargement du projet impossible (${response.status}).`);
  const raw: unknown = await response.json();
  const project = await parsePublicProject(raw);
  if (project.id !== id) throw new Error('Le détail reçu ne correspond pas à l’identifiant demandé.');
  return project;
}

// ----------------------------------------------------------------------------
// Valide strictement un détail public reçu du réseau.
// Paramètres : value est le JSON décodé ; retour : nouvel objet conforme.
// Effets de bord : charge le module de schéma lors de la première ouverture.
// Erreurs : un message court nomme le premier champ fautif, sans recopier sa valeur.
// ----------------------------------------------------------------------------
export async function parsePublicProject(value: unknown): Promise<PublicProject> {
  const { PublicProjectSchema } = await import('../domain/schema.ts');
  const result = PublicProjectSchema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const keys = issue !== undefined && 'keys' in issue && Array.isArray(issue.keys) ? issue.keys : [];
  const path = [...(issue?.path ?? []), ...keys].map(String).join('.') || '<racine>';
  throw new Error(`Champ public invalide : ${path}.`);
}
