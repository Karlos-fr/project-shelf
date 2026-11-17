// ============================================================================
// PublishedCatalogueLoader — Lecture build-time du catalogue déjà assaini
// ----------------------------------------------------------------------------
// Ce module n'importe jamais projects.ts. Astro ne lit que le JSON produit par
// scripts/build.ts après validation, filtrage hidden et suppression des liens privés.
// ============================================================================
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PublishedCatalogue } from '../domain/project.ts';

// Chemin par défaut du catalogue assaini ; le script de build peut le surcharger explicitement.
const DEFAULT_PUBLISHED_PATH = '.generated/catalogue.json';

// ----------------------------------------------------------------------------
// Charge les données publiques préparées avant le démarrage d'Astro.
// Retour : catalogue sérialisé par publishCatalogue ; aucune donnée source n'est consultée.
// Effets de bord : lit un fichier local assaini et échoue si le pipeline ne l'a pas préparé.
// ----------------------------------------------------------------------------
export async function loadPublishedCatalogue(): Promise<PublishedCatalogue> {
  const path = resolve(process.env.PROJECT_SHELF_PUBLISHED_CATALOGUE ?? DEFAULT_PUBLISHED_PATH);
  const raw = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!isPublishedCatalogue(parsed)) throw new Error('Catalogue public généré invalide.');
  return parsed;
}

// ----------------------------------------------------------------------------
// Vérifie seulement l'enveloppe générée afin de détecter un fichier absent/corrompu.
// La validation métier a déjà eu lieu avant la projection et n'est pas dupliquée ici.
// ----------------------------------------------------------------------------
function isPublishedCatalogue(value: unknown): value is PublishedCatalogue {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PublishedCatalogue>;
  return Array.isArray(candidate.categories)
    && Array.isArray(candidate.summaries)
    && typeof candidate.details === 'object'
    && candidate.details !== null;
}
