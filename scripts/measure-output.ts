// ============================================================================
// MeasureOutput — Mesure locale du poids de l'export statique
// ----------------------------------------------------------------------------
// Ce script additionne les fichiers présents dans un dossier de build. Il ne
// transmet aucune donnée, n'invente aucun budget et refuse les liens symboliques.
// ============================================================================
import { lstat, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type OutputBudgets = {
  maxJavascriptBytes?: number;
  maxMediaFileBytes?: number;
};

export type OutputMeasureOptions = {
  root: string;
  budgets: OutputBudgets;
};

export type OutputMeasureReport = {
  root: string;
  files: number;
  totalBytes: number;
  javascriptBytes: number;
  imageBytes: number;
  videoBytes: number;
  otherBytes: number;
  largestMedia?: { path: string; bytes: number };
};

// Extensions JavaScript émises par les bundlers statiques usuels.
const JAVASCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
// Extensions d'images admises par le rapport de poids, indépendamment du catalogue.
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
// Extensions vidéo comptabilisées comme médias lourds potentiels.
const VIDEO_EXTENSIONS = new Set(['.m4v', '.mp4', '.webm', '.mov']);

// ----------------------------------------------------------------------------
// Analyse le dossier et les budgets optionnels fournis explicitement en CLI.
// Paramètres : args ne contient pas node ni le nom du script.
// Retour : options normalisées sans seuil implicite.
// ----------------------------------------------------------------------------
export function parseMeasureOptions(args: readonly string[]): OutputMeasureOptions {
  let root = 'dist';
  const budgets: OutputBudgets = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token !== '--root' && token !== '--max-js-bytes' && token !== '--max-media-bytes') {
      throw new Error(`Option de mesure inconnue : ${String(token)}.`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Valeur manquante pour ${token}.`);
    index += 1;
    if (token === '--root') root = value;
    else if (token === '--max-js-bytes') budgets.maxJavascriptBytes = parsePositiveInteger(value, token);
    else budgets.maxMediaFileBytes = parsePositiveInteger(value, token);
  }
  return { root, budgets };
}

// ----------------------------------------------------------------------------
// Mesure tous les fichiers réguliers d'un export sans suivre de lien symbolique.
// Paramètres : root est un dossier local déjà produit ; retour : totaux bruts en octets.
// Effets de bord : lit uniquement les métadonnées du système de fichiers.
// ----------------------------------------------------------------------------
export async function measureOutput(root: string): Promise<OutputMeasureReport> {
  const absoluteRoot = resolve(root);
  const report: OutputMeasureReport = {
    root: absoluteRoot,
    files: 0,
    totalBytes: 0,
    javascriptBytes: 0,
    imageBytes: 0,
    videoBytes: 0,
    otherBytes: 0,
  };
  await walkOutput(absoluteRoot, absoluteRoot, report);
  return report;
}

// ----------------------------------------------------------------------------
// Applique seulement les budgets explicitement fournis par la recette courante.
// Paramètres : report est une mesure locale ; budgets peut être vide.
// Erreurs : signale le premier dépassement avec la valeur réellement mesurée.
// ----------------------------------------------------------------------------
export function verifyOutputBudgets(report: OutputMeasureReport, budgets: OutputBudgets): void {
  if (budgets.maxJavascriptBytes !== undefined && report.javascriptBytes > budgets.maxJavascriptBytes) {
    throw new Error(`Budget JavaScript dépassé : ${report.javascriptBytes} octets > ${budgets.maxJavascriptBytes}.`);
  }
  if (budgets.maxMediaFileBytes !== undefined && report.largestMedia !== undefined
      && report.largestMedia.bytes > budgets.maxMediaFileBytes) {
    throw new Error(`Budget média dépassé : ${report.largestMedia.path} pèse ${report.largestMedia.bytes} octets > ${budgets.maxMediaFileBytes}.`);
  }
}

// ----------------------------------------------------------------------------
// Parcourt récursivement un dossier et classe chaque fichier selon son extension.
// Paramètres : root sert aux chemins relatifs ; current est le dossier courant.
// Effets de bord : met à jour le rapport fourni par référence.
// ----------------------------------------------------------------------------
async function walkOutput(root: string, current: string, report: OutputMeasureReport): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(current, entry.name);
    const stat = await lstat(fullPath);
    if (stat.isSymbolicLink()) throw new Error(`Lien symbolique interdit dans la mesure : ${relative(root, fullPath)}.`);
    if (stat.isDirectory()) {
      await walkOutput(root, fullPath, report);
      continue;
    }
    if (!stat.isFile()) continue;
    addFile(report, relative(root, fullPath), stat.size);
  }
}

// ----------------------------------------------------------------------------
// Ajoute un fichier au rapport en conservant des catégories mutuellement exclusives.
// Paramètres : report est mutable ; path est relatif ; bytes est la taille disque.
// ----------------------------------------------------------------------------
function addFile(report: OutputMeasureReport, path: string, bytes: number): void {
  report.files += 1;
  report.totalBytes += bytes;
  const extension = extname(path).toLowerCase();
  if (JAVASCRIPT_EXTENSIONS.has(extension)) report.javascriptBytes += bytes;
  else if (IMAGE_EXTENSIONS.has(extension)) {
    report.imageBytes += bytes;
    updateLargestMedia(report, path, bytes);
  } else if (VIDEO_EXTENSIONS.has(extension)) {
    report.videoBytes += bytes;
    updateLargestMedia(report, path, bytes);
  } else report.otherBytes += bytes;
}

// ----------------------------------------------------------------------------
// Conserve le média individuel le plus lourd pour le diagnostic éditorial.
// ----------------------------------------------------------------------------
function updateLargestMedia(report: OutputMeasureReport, path: string, bytes: number): void {
  if (report.largestMedia === undefined || bytes > report.largestMedia.bytes) report.largestMedia = { path, bytes };
}

// ----------------------------------------------------------------------------
// Parse un entier positif sans accepter décimale, zéro, signe ou notation exotique.
// ----------------------------------------------------------------------------
function parsePositiveInteger(value: string, option: string): number {
  if (!/^[1-9]\d*$/u.test(value)) throw new Error(`${option} exige un entier positif en octets.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${option} dépasse la plage entière sûre.`);
  return parsed;
}

// ----------------------------------------------------------------------------
// Exécute la mesure CLI, affiche un rapport JSON et applique les seuils demandés.
// ----------------------------------------------------------------------------
async function runCli(): Promise<void> {
  try {
    const options = parseMeasureOptions(process.argv.slice(2));
    const report = await measureOutput(options.root);
    verifyOutputBudgets(report, options.budgets);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void runCli();
