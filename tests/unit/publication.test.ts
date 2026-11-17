// ============================================================================
// PublicationUnit — Adaptateur Vitest des contrats de projection publique
// ----------------------------------------------------------------------------
// Ce fichier exécute les mêmes scénarios de confidentialité que le runner Node.
// ============================================================================
import { it } from 'vitest';
import { registerPublicationTests } from '../contracts/publication.ts';

registerPublicationTests(it);
