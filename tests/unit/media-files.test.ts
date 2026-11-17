// ============================================================================
// MediaFileTests — Enregistrement des contrats disque dans Vitest
// ----------------------------------------------------------------------------
// Les mêmes scénarios utilisent des répertoires temporaires isolés et nettoyés.
// ============================================================================
import { it } from 'vitest';
import { registerMediaFileTests } from '../contracts/media-files.ts';
registerMediaFileTests(it);
