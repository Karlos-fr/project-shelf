// ============================================================================
// PagesTargetTests — Les mêmes contrats GitHub Pages dans Vitest
// ----------------------------------------------------------------------------
// Ce fichier enregistre les cas partagés lorsque le runner du plan est installé.
// ============================================================================
import { it } from 'vitest';
import { registerPagesTargetTests } from '../contracts/pages-target.ts';

registerPagesTargetTests(it);
