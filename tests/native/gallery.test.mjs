// ============================================================================
// NativeGalleryTests — Contrats de galerie exécutés sans dépendance npm
// ----------------------------------------------------------------------------
// Ce runner teste les modules purs, pas l'interface ni l'historique du navigateur.
// ============================================================================
import { test } from 'node:test';
import { registerGalleryTests, registerMessagesTests } from '../contracts/gallery.ts';
registerGalleryTests(test);
registerMessagesTests(test);
