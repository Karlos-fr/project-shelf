// ============================================================================
// FeaturedTests — Enregistrement Vitest de la machine pure de T10
// ----------------------------------------------------------------------------
// Le même ensemble de cas reste disponible avec l'outillage officiel du plan.
// ============================================================================
import { it } from 'vitest';
import { registerFeaturedTests } from '../contracts/featured.ts';
registerFeaturedTests(it);
