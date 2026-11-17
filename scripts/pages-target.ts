// ============================================================================
// PagesTarget — Cible et limites d'une publication GitHub Pages
// ----------------------------------------------------------------------------
// Ce module pur déduit l'origine et le préfixe d'un site Pages depuis le dépôt
// distant ou des options explicites, et contrôle les limites de taille de Pages.
// Il n'exécute ni git, ni build, ni accès disque ou réseau.
// ============================================================================

export type DeployOptions = {
  origin?: string;
  base?: string;
  cname?: string;
  fixture: boolean;
  push: boolean;
};

export type PagesTarget = {
  origin: string;
  base: string;
  url: string;
  cname?: string;
};

export type DistributedFile = { path: string; bytes: number };

// Taille maximale d'un fichier accepté par GitHub (refus au push au-delà).
export const PAGES_MAX_FILE_BYTES = 100 * 1024 * 1024;
// Taille à partir de laquelle GitHub avertit au push.
export const PAGES_WARN_FILE_BYTES = 50 * 1024 * 1024;
// Taille maximale documentée d'un site GitHub Pages publié.
export const PAGES_MAX_SITE_BYTES = 1024 * 1024 * 1024;

// ----------------------------------------------------------------------------
// Analyse les options de publication sans accepter d'option inconnue.
// Paramètres : args vient de la ligne de commande, après le nom du script.
// Retour : options explicites ; push et fixture valent false par défaut.
// Erreurs : option inconnue, valeur manquante, ou fixture combinée à push.
// ----------------------------------------------------------------------------
export function parseDeployOptions(args: readonly string[]): DeployOptions {
  const options: DeployOptions = { fixture: false, push: false };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--fixture') { options.fixture = true; continue; }
    if (token === '--push') { options.push = true; continue; }
    if (token === '--origin' || token === '--base' || token === '--cname') {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`Valeur manquante pour ${token}.`);
      index += 1;
      if (token === '--origin') options.origin = value;
      else if (token === '--base') options.base = value;
      else options.cname = value;
      continue;
    }
    throw new Error(`Option de publication inconnue : ${String(token)}.`);
  }
  // Les projets de test ne doivent jamais atteindre un site réellement publié.
  if (options.fixture && options.push) throw new Error('--fixture est réservé aux essais locaux et ne peut pas être poussé.');
  return options;
}

// ----------------------------------------------------------------------------
// Déduit propriétaire et dépôt d'une URL distante GitHub (HTTPS ou SSH).
// Paramètres : remoteUrl est la sortie de « git remote get-url origin ».
// Retour : propriétaire et nom du dépôt, sans suffixe .git.
// Erreurs : URL qui ne désigne pas un dépôt github.com.
// ----------------------------------------------------------------------------
export function parseGitHubRemote(remoteUrl: string): { owner: string; repo: string } {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/u.exec(remoteUrl.trim());
  if (match === null || match[1] === undefined || match[2] === undefined) {
    throw new Error('Le dépôt distant origin n’est pas un dépôt github.com : passer --origin et --base explicitement.');
  }
  return { owner: match[1], repo: match[2] };
}

// ----------------------------------------------------------------------------
// Calcule l'adresse publique du site selon les règles de GitHub Pages.
// Paramètres : options explicites ; remoteUrl sert seulement aux valeurs absentes.
// Retour : origine HTTPS, préfixe terminé par « / » et URL complète du site.
// Règles : domaine personnalisé → racine ; dépôt <owner>.github.io → racine ;
// autre dépôt → https://<owner>.github.io/<repo>/. Les options explicites priment.
// ----------------------------------------------------------------------------
export function resolvePagesTarget(options: DeployOptions, remoteUrl: string | undefined): PagesTarget {
  let origin: string | undefined;
  let base: string | undefined;
  if (options.cname !== undefined) {
    if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/u.test(options.cname)) {
      throw new Error('--cname doit être un nom de domaine en minuscules, sans protocole ni chemin.');
    }
    origin = `https://${options.cname}`;
    base = '/';
  } else if (options.origin === undefined || options.base === undefined) {
    if (remoteUrl === undefined) throw new Error('Aucun dépôt distant origin : passer --origin et --base explicitement.');
    const { owner, repo } = parseGitHubRemote(remoteUrl);
    const userSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
    origin = `https://${owner.toLowerCase()}.github.io`;
    base = userSite ? '/' : `/${repo}/`;
  }
  origin = options.origin ?? origin;
  base = options.base ?? base;
  if (origin === undefined || base === undefined) throw new Error('Cible de publication incomplète.');
  const target: PagesTarget = { origin, base, url: `${origin}${base}` };
  if (options.cname !== undefined) target.cname = options.cname;
  return target;
}

// ----------------------------------------------------------------------------
// Contrôle les limites de taille de GitHub Pages sur les fichiers à publier.
// Paramètres : files liste chemins relatifs et tailles de dist.
// Retour : avertissements pour les fichiers de plus de 50 Mo.
// Erreurs : un fichier de plus de 100 Mo ou un site de plus de 1 Go.
// ----------------------------------------------------------------------------
export function checkPagesLimits(files: readonly DistributedFile[]): string[] {
  const warnings: string[] = [];
  let total = 0;
  for (const file of files) {
    total += file.bytes;
    if (file.bytes > PAGES_MAX_FILE_BYTES) throw new Error(`${file.path} dépasse 100 Mo : GitHub refusera le push.`);
    if (file.bytes > PAGES_WARN_FILE_BYTES) warnings.push(`${file.path} dépasse 50 Mo (${formatMegabytes(file.bytes)}) : GitHub avertira au push.`);
  }
  if (total > PAGES_MAX_SITE_BYTES) throw new Error(`Le site pèse ${formatMegabytes(total)} : GitHub Pages limite un site à 1 Go.`);
  return warnings;
}

// ----------------------------------------------------------------------------
// Formate une taille en mégaoctets avec une décimale.
// ----------------------------------------------------------------------------
function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
