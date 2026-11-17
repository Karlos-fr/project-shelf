// ============================================================================
// OutputMeasureNative — Adaptateur Node des contrats de mesure du build
// ----------------------------------------------------------------------------
// Ce fichier exécute les mêmes scénarios que Vitest sans dépendance npm.
// ============================================================================
import { test } from 'node:test';
import { registerOutputMeasureTests } from '../contracts/output-measure.ts';

registerOutputMeasureTests(test);
