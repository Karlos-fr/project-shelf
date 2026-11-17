// ============================================================================
// NativeAmbilightTests — Contrats Ambilight exécutés sans dépendance npm
// ----------------------------------------------------------------------------
// Ce runner teste les couleurs moyennes pures, sans canevas.
// ============================================================================
import test from 'node:test';
import { registerAmbilightTests } from '../contracts/ambilight.ts';

registerAmbilightTests(test);
