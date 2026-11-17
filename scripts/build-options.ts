// ============================================================================
// BuildOptions — Lecture déterministe des paramètres de construction statique
// ----------------------------------------------------------------------------
// Ce module fusionne arguments CLI et environnement sans lancer de processus ni
// toucher au disque. La validation détaillée des URL reste la responsabilité de SiteConfig.
// ============================================================================

export type BuildOptions = {
  mode: 'preview' | 'production';
  origin?: string;
  base: string;
  fixture: boolean;
};

// ----------------------------------------------------------------------------
// Fusionne l'environnement puis les flags, ces derniers ayant toujours priorité.
// Paramètres : args exclut node/script ; env contient éventuellement les clés SITE_*.
// Retour : options normalisées sans valeurs inventées en production.
// Erreurs : refuse option inconnue, valeur manquante et mode non pris en charge.
// ----------------------------------------------------------------------------
export function parseBuildOptions(
  args: readonly string[],
  env: Record<string, string | undefined>,
): BuildOptions {
  let mode = normalizeMode(env.SITE_MODE ?? 'preview');
  let origin = env.SITE_ORIGIN;
  let base = env.SITE_BASE ?? '/';
  let fixture = env.SITE_FIXTURE === 'true';

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--fixture') {
      fixture = true;
      continue;
    }
    if (token === '--mode' || token === '--origin' || token === '--base') {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`Valeur manquante pour ${token}.`);
      index += 1;
      if (token === '--mode') mode = normalizeMode(value);
      else if (token === '--origin') origin = value;
      else base = value;
      continue;
    }
    throw new Error(`Option de build inconnue : ${String(token)}.`);
  }

  const result: BuildOptions = { mode, base, fixture };
  if (origin !== undefined) result.origin = origin;
  return result;
}

// ----------------------------------------------------------------------------
// Valide la seule valeur de mode admise avant de construire SiteConfig.
// Paramètres : value provient de CLI ou SITE_MODE ; retour : union de mode sûre.
// ----------------------------------------------------------------------------
function normalizeMode(value: string): BuildOptions['mode'] {
  if (value === 'preview' || value === 'production') return value;
  throw new Error('Le mode de build doit valoir preview ou production.');
}
