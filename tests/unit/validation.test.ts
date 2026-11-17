// ============================================================================
// ValidationTests — Enregistrement des mêmes contrats dans Vitest
// ----------------------------------------------------------------------------
// Cette entrée utilise le runner du plan lorsqu'il est installé localement.
// ============================================================================
import { it } from 'vitest';
import { registerValidationTests } from '../contracts/validation.ts';
registerValidationTests(it);
