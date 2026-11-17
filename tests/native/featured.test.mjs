// ============================================================================
// NativeFeaturedTests — Exécution hors ligne de la machine de rotation
// ----------------------------------------------------------------------------
// Les cas partagés ne prétendent pas valider le composant React ou une vidéo.
// ============================================================================
import { test } from 'node:test';
import { registerFeaturedTests } from '../contracts/featured.ts';
registerFeaturedTests(test);
