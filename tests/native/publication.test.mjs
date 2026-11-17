// ============================================================================
// PublicationNative — Adaptateur Node des contrats de publication publique
// ----------------------------------------------------------------------------
// Ce fichier exécute les scénarios de confidentialité sans Astro ni Vitest.
// ============================================================================
import test from 'node:test';
import { registerPublicationTests } from '../contracts/publication.ts';

registerPublicationTests(test);
