// ============================================================================
// DetailsLoaderUnit — Adaptateur Vitest des contrats du chargeur de fiche
// ----------------------------------------------------------------------------
// Le contenu des cas reste partagé avec la suite native afin d'éviter deux règles.
// ============================================================================
import { it } from 'vitest';
import { registerDetailsLoaderTests } from '../contracts/details-loader.ts';

registerDetailsLoaderTests(it);
