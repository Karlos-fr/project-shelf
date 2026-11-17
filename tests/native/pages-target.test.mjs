// ============================================================================
// NativePagesTargetTests — Contrats GitHub Pages exécutés sans dépendance npm
// ----------------------------------------------------------------------------
// Ce runner teste la déduction de cible et les limites, sans git ni build.
// ============================================================================
import test from 'node:test';
import { registerPagesTargetTests } from '../contracts/pages-target.ts';

registerPagesTargetTests(test);
