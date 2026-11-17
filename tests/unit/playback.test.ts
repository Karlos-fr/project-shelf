// ============================================================================
// PlaybackUnit — Adaptateur Vitest des contrats de lecture média
// ----------------------------------------------------------------------------
// Ces tests ne prétendent pas valider un codec ou une lecture navigateur réelle.
// ============================================================================
import { it } from 'vitest';
import { registerPlaybackTests } from '../contracts/playback.ts';

registerPlaybackTests(it);
