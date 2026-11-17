// ============================================================================
// AmbilightTests — Les mêmes contrats Ambilight dans Vitest
// ----------------------------------------------------------------------------
// Ce fichier enregistre les cas partagés lorsque le runner du plan est installé.
// ============================================================================
import { it } from 'vitest';
import { registerAmbilightTests } from '../contracts/ambilight.ts';

registerAmbilightTests(it);
