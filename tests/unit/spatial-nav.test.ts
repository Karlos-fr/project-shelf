// ============================================================================
// SpatialNavTests — Les mêmes contrats de navigation aux flèches dans Vitest
// ----------------------------------------------------------------------------
// Ce fichier enregistre les cas partagés lorsque le runner du plan est installé.
// ============================================================================
import { it } from 'vitest';
import { registerSpatialNavTests } from '../contracts/spatial-nav.ts';

registerSpatialNavTests(it);
