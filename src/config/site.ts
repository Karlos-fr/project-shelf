// ============================================================================
// SiteConfig — Validation de l'identité et du montage statique
// ----------------------------------------------------------------------------
// Ce module transforme des valeurs explicites du build en configuration publique.
// Il ne lit ni process.env, ni le catalogue, ni le navigateur, ni le réseau.
// ============================================================================

import { normalizeBasePath } from '../domain/paths.ts';
import type { Localized } from '../domain/locale.ts';

export type SiteConfig = {
  origin: string;
  base: string;
  mode: 'preview' | 'production';
  name: string;
  intro: Localized<string>;
  githubUrl: string;
};

// Origine locale réservée au développement ; ce n'est pas un domaine publié.
const PREVIEW_ORIGIN = 'http://localhost:4321';

// ----------------------------------------------------------------------------
// Valide le montage avec la même politique UTF-8 que les liens côté client.
// Paramètres : raw est le préfixe fourni avant toute normalisation de chemin.
// Retour : préfixe canonique terminé par une barre oblique.
// Erreurs : signale SITE_BASE sans recopier de valeur sensible.
// ----------------------------------------------------------------------------
function normalizeBase(raw: string): string {
  try { return normalizeBasePath(raw); }
  catch { throw new Error('SITE_BASE doit être un préfixe absolu sans traversée ni encodage ambigu.'); }
}

// ----------------------------------------------------------------------------
// Valide une origine distincte du préfixe ; aucune requête HTTP n'est effectuée.
// Paramètres : raw est l'origine ; mode règle HTTPS ; fixture autorise les domaines
// réservés des tests, mais ne permet ni identifiants, ni chemin, ni protocole actif.
// Retour : origine canonique sans barre finale.
// Erreurs : lève une erreur SITE_ORIGIN sans recopier une éventuelle valeur secrète.
// ----------------------------------------------------------------------------
function normalizeOrigin(raw: string, mode: SiteConfig['mode'], fixture: boolean): string {
  if (/[\s\\?#\u0000-\u001f\u007f]/u.test(raw) || !/^https?:\/\/[^/]+\/?$/i.test(raw)) {
    throw new Error('SITE_ORIGIN doit être une origine HTTP(S) sans paramètres ni contrôle.');
  }
  // Le contrôle de la forme brute refuse les chemins avant que URL ne réduise les .. .
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('SITE_ORIGIN ne contient pas une URL valide.');
  }
  if (parsed.username || parsed.password || raw.includes('@') || parsed.pathname !== '/') {
    throw new Error('SITE_ORIGIN ne doit contenir ni identifiants ni chemin.');
  }
  if (mode === 'production' && parsed.protocol !== 'https:') {
    throw new Error('SITE_ORIGIN doit utiliser HTTPS en production.');
  }
  // Ces domaines de documentation ou de boucle locale ne désignent pas une cible réelle.
  const reserved = /(^|\.)(?:localhost|test|invalid|example)$/i.test(parsed.hostname)
    || /^(?:example\.(?:com|net|org)|127(?:\.\d+){3}|0\.0\.0\.0|\[::1\])$/i.test(parsed.hostname);
  if (mode === 'production' && reserved && !fixture) {
    throw new Error('SITE_ORIGIN réservé aux tests : une production exige son domaine réel.');
  }
  return parsed.origin;
}

// ----------------------------------------------------------------------------
// Produit la configuration publique d'un build sans accéder à l'environnement global.
// Paramètres : env contient SITE_MODE, SITE_ORIGIN et SITE_BASE ; SITE_FIXTURE=true
// autorise uniquement l'emploi explicite de domaines réservés pour une recette.
// Retour : configuration indépendante, avec l'identité connue et les deux accroches.
// Erreurs : refuse un mode inconnu, une origine absente en production ou un montage
// invalide. Les valeurs inconnues ne sont pas copiées vers la sortie publique.
// ----------------------------------------------------------------------------
export function loadSiteConfig(env: Record<string, string | undefined>): SiteConfig {
  // Un mode absent signifie une prévisualisation ; une chaîne vide est une erreur.
  const mode = env.SITE_MODE ?? 'preview';
  if (mode !== 'preview' && mode !== 'production') {
    throw new Error('SITE_MODE doit valoir preview ou production.');
  }
  if (mode === 'production' && !env.SITE_ORIGIN) {
    throw new Error('SITE_ORIGIN est obligatoire en production.');
  }
  if (env.SITE_FIXTURE !== undefined && env.SITE_FIXTURE !== 'true' && env.SITE_FIXTURE !== 'false') {
    throw new Error('SITE_FIXTURE doit valoir true ou false.');
  }
  return {
    origin: normalizeOrigin(env.SITE_ORIGIN ?? PREVIEW_ORIGIN, mode, env.SITE_FIXTURE === 'true'),
    base: normalizeBase(env.SITE_BASE ?? '/'),
    mode,
    name: 'ProjectShelf',
    intro: {
      en: 'Games, apps, and experiments. Built out of curiosity.',
      fr: 'Jeux, applications et expérimentations. Créés par curiosité.',
    },
    githubUrl: 'https://github.com/Karlos-fr',
  };
}
