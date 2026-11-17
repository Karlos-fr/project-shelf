// ============================================================================
// NativeValidationTests — Exécution des contrats sémantiques hors ligne
// ----------------------------------------------------------------------------
// Le runner natif charge le vrai code TypeScript ; il ne remplace pas Zod.
// ============================================================================
import { test } from 'node:test';
import { registerValidationTests } from '../contracts/validation.ts';
registerValidationTests(test);
