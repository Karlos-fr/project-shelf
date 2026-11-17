// ============================================================================
// PlaybackNative — Adaptateur Node des contrats de lecture média
// ----------------------------------------------------------------------------
// Le runner vérifie les fonctions pures sans prétendre lancer un codec vidéo.
// ============================================================================
import test from 'node:test';
import { registerPlaybackTests } from '../contracts/playback.ts';

registerPlaybackTests(test);
