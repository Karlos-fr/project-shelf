// ============================================================================
// LocalePolicy — Choix de langue et affichage des dates calendaires
// ----------------------------------------------------------------------------
// Ce module reste pur : URL, préférences et stockage sont lus par ses appelants.
// Le rendu et le schéma pourront partager ces identifiants sans nouvelle liste.
// ============================================================================
import { isCalendarDate } from './validation.ts';

// Langues disponibles dans le contenu publié ; l'anglais est le repli du produit.
export const SUPPORTED_LOCALES = Object.freeze(['en', 'fr'] as const);
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type Localized<T> = Record<Locale, T>;

// ----------------------------------------------------------------------------
// Applique URL explicite, choix mémorisé, navigateur, puis repli anglais.
// Paramètres : explicit vient de la route ; saved du stockage protégé ; browser
// conserve l'ordre des préférences du navigateur, y compris les variantes régionales.
// Retour : langue prise en charge ; ne modifie ni l'URL ni la préférence stockée.
// ----------------------------------------------------------------------------
export function detectLocale(explicit: Locale | null, saved: string | null, browser: readonly string[]): Locale {
  if (explicit === 'en' || explicit === 'fr') return explicit;
  if (saved === 'en' || saved === 'fr') return saved;
  // Seules les préférences valides participent au choix, dans leur ordre initial.
  for (const tag of browser) {
    try {
      // Intl rejette notamment les pseudo-tags contenant des underscores.
      const language = new Intl.Locale(tag).language;
      if (language === 'en' || language === 'fr') return language;
    } catch {
      // Une préférence malformée n'empêche pas d'examiner la suivante.
    }
  }
  return 'en';
}

// ----------------------------------------------------------------------------
// Affiche une date du catalogue sans la décaler selon le fuseau du visiteur.
// Paramètres : value est une date YYYY-MM-DD validée ; locale règle la présentation.
// Retour : date lisible dans la langue demandée, calculée en UTC.
// Erreurs : refuse une date invalide au lieu d'afficher un autre jour.
// ----------------------------------------------------------------------------
export function formatProjectDate(value: string, locale: Locale): string {
  if (!isCalendarDate(value)) throw new Error('Date de projet invalide.');
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`));
}
