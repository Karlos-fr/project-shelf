// ============================================================================
// NativeSpatialNavTests — Contrats de navigation aux flèches sans dépendance npm
// ----------------------------------------------------------------------------
// Ce runner teste le choix de voisin pur, sans DOM.
// ============================================================================
import test from 'node:test';
import { registerSpatialNavTests } from '../contracts/spatial-nav.ts';

registerSpatialNavTests(test);
