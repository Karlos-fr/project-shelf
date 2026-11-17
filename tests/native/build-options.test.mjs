// ============================================================================
// BuildOptionsNative — Adaptateur Node des contrats d'options de build
// ----------------------------------------------------------------------------
// Ce fichier ne lance ni npm ni Astro et reste indépendant du registre.
// ============================================================================
import test from 'node:test';
import { registerBuildOptionsTests } from '../contracts/build-options.ts';

registerBuildOptionsTests(test);
