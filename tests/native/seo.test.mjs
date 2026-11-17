// ============================================================================
// SeoNative — Adaptateur Node des contrats SEO purs
// ----------------------------------------------------------------------------
// Ce fichier vérifie les modèles sans générer ni analyser de document Astro.
// ============================================================================
import test from 'node:test';
import { registerSeoTests } from '../contracts/seo.ts';

registerSeoTests(test);
