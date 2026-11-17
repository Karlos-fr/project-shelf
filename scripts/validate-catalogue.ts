// ============================================================================
// ValidateCatalogue — Validation éditoriale du fichier projects.ts
// ----------------------------------------------------------------------------
// Ce script analyse le catalogue tel qu'il est écrit et affiche tous les chemins
// Zod fautifs. Il ne contacte ni GitHub ni un LLM et ne répare aucune valeur.
// ============================================================================
import * as z from 'zod/mini';
import { PROJECT_CATALOGUE } from '../src/data/projects.ts';
import { parseCatalogue } from '../src/domain/schema.ts';

// Messages Zod en français pour la relecture éditoriale ; la locale n'est chargée
// que par ce script et ne rejoint jamais le paquet navigateur.
z.config(z.locales.fr());

try {
  parseCatalogue(PROJECT_CATALOGUE);
  console.log('Catalogue ProjectShelf valide.');
} catch (error) {
  if (error instanceof z.core.$ZodError) {
    for (const issue of error.issues) console.error(`${formatPath(issue.path)}: ${issue.message}`);
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
}

// ----------------------------------------------------------------------------
// Formate un chemin Zod lisible par un éditeur ou un agent de contenu.
// Paramètres : path contient clés et indices de l'issue ; retour : notation pointée.
// ----------------------------------------------------------------------------
function formatPath(path: PropertyKey[]): string {
  return path.length ? path.map(String).join('.') : '<catalogue>';
}
