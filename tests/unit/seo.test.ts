// ============================================================================
// SeoUnit — Adaptateur Vitest des contrats SEO purs
// ----------------------------------------------------------------------------
// Les scénarios ne contactent aucun moteur de recherche ni service externe.
// ============================================================================
import { it } from 'vitest';
import { registerSeoTests } from '../contracts/seo.ts';

registerSeoTests(it);
