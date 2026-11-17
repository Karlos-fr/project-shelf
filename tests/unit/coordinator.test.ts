// ============================================================================
// MediaCoordinatorUnit — Adaptateur Vitest des contrats d'arbitrage média
// ----------------------------------------------------------------------------
// Le runner Vitest partage les scénarios déjà validés avec Node natif.
// ============================================================================
import { it } from 'vitest';
import { registerCoordinatorTests } from '../contracts/coordinator.ts';

registerCoordinatorTests(it);
