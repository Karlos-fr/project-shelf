// ============================================================================
// BuildOptionsUnit — Adaptateur Vitest des contrats d'options de build
// ----------------------------------------------------------------------------
// Ces scénarios restent purs et ne lancent pas le processus Astro.
// ============================================================================
import { it } from 'vitest';
import { registerBuildOptionsTests } from '../contracts/build-options.ts';

registerBuildOptionsTests(it);
