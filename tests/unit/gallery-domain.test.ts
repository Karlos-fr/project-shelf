// ============================================================================
// GalleryDomainTests — Les mêmes contrats de T4 dans Vitest
// ----------------------------------------------------------------------------
// Ce fichier enregistre les cas partagés lorsque le runner du plan est installé.
// ============================================================================
import { it } from 'vitest';
import { registerGalleryTests, registerMessagesTests } from '../contracts/gallery.ts';
registerGalleryTests(it);
registerMessagesTests(it);
