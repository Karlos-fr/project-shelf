// ============================================================================
// NativeMediaFileTests — Vérification réelle des frontières disque hors ligne
// ----------------------------------------------------------------------------
// Ces tests natifs ne remplacent pas le build Astro ni la lecture d'un codec.
// ============================================================================
import { test } from 'node:test';
import { registerMediaFileTests } from '../contracts/media-files.ts';
registerMediaFileTests(test);
