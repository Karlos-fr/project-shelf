// ============================================================================
// DetailsLoaderNative — Adaptateur Node des contrats du chargeur de fiche
// ----------------------------------------------------------------------------
// Ce fichier exécute exactement les mêmes cas que Vitest sans paquet tiers.
// ============================================================================
import { test } from 'node:test';
import { registerDetailsLoaderTests } from '../contracts/details-loader.ts';

registerDetailsLoaderTests(test);
