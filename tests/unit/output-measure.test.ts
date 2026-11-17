// ============================================================================
// OutputMeasureUnit — Adaptateur Vitest des contrats de mesure du build
// ----------------------------------------------------------------------------
// Il garde la matrice de comportements identique à la recette Node native.
// ============================================================================
import { it } from 'vitest';
import { registerOutputMeasureTests } from '../contracts/output-measure.ts';

registerOutputMeasureTests(it);
