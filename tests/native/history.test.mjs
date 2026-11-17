// ============================================================================
// NavigationHistoryNative — Adaptateur Node des contrats History API
// ----------------------------------------------------------------------------
// Le faux Window rend les transitions reproductibles sans navigateur ni jsdom.
// ============================================================================
import test from 'node:test';
import { registerHistoryTests } from '../contracts/history.ts';

registerHistoryTests(test);
