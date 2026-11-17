// ============================================================================
// MediaCoordinatorNative — Adaptateur Node des contrats d'arbitrage média
// ----------------------------------------------------------------------------
// Ce fichier exécute les mêmes scénarios que Vitest sans dépendance navigateur.
// Il ne remplace pas les tests de composants ou de lecture vidéo réelle.
// ============================================================================
import test from 'node:test';
import { registerCoordinatorTests } from '../contracts/coordinator.ts';

registerCoordinatorTests(test);
