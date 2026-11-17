// ============================================================================
// PackageStatic — Copie locale contrôlée de l'export statique
// ----------------------------------------------------------------------------
// Ce script fabrique un paquet de fichiers depuis dist après audit. Il ne publie
// rien, ne contacte aucun hébergeur et ne modifie jamais un répertoire distant.
// ============================================================================
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditDist } from './audit-dist.ts';

export type PackageStaticOptions = { source: string; destination: string };

// ----------------------------------------------------------------------------
// Analyse --from et --to sans accepter d'option inconnue ni de valeur manquante.
// ----------------------------------------------------------------------------
export function parsePackageOptions(args: readonly string[]): PackageStaticOptions {
  let source = 'dist';
  let destination = '.artifacts/project-shelf';
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token !== '--from' && token !== '--to') throw new Error(`Option de paquet inconnue : ${String(token)}.`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Valeur manquante pour ${token}.`);
    index += 1;
    if (token === '--from') source = value; else destination = value;
  }
  return { source, destination };
}

// ----------------------------------------------------------------------------
// Copie un export après audit et refuse une destination située dans la source.
// Paramètres : options contient deux chemins locaux ; retour : destination absolue.
// Effets de bord : remplace uniquement le dossier destination après audit réussi.
// ----------------------------------------------------------------------------
export async function packageStatic(options: PackageStaticOptions): Promise<string> {
  const source = resolve(options.source);
  const destination = resolve(options.destination);
  if (sameOrInside(destination, source)) throw new Error('La destination ne peut pas être contenue dans la source.');
  await auditDist(source, []);
  await mkdir(dirname(destination), { recursive: true });
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true, force: false, errorOnExist: true });
  return destination;
}

// ----------------------------------------------------------------------------
// Détermine si candidate désigne root lui-même ou un descendant réel de root.
// ----------------------------------------------------------------------------
function sameOrInside(candidate: string, root: string): boolean {
  const path = relative(root, candidate);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

// ----------------------------------------------------------------------------
// Exécute le mode CLI uniquement lorsque ce fichier est le point d'entrée Node.
// ----------------------------------------------------------------------------
async function runCli(): Promise<void> {
  try {
    const destination = await packageStatic(parsePackageOptions(process.argv.slice(2)));
    console.log(`Paquet statique prêt : ${destination}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void runCli();
