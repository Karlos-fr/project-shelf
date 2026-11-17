// ============================================================================
// NavigationHistoryUnit — Adaptateur Vitest des contrats History API
// ----------------------------------------------------------------------------
// Le faux Window reste déterministe et indépendant de jsdom dans cette suite.
// ============================================================================
import { it } from 'vitest';
import { registerHistoryTests } from '../contracts/history.ts';

registerHistoryTests(it);
