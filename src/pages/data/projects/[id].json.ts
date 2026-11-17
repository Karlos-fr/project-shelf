// ============================================================================
// ProjectJsonEndpoint — Détail public pré-généré pour l'ouverture cliente
// ----------------------------------------------------------------------------
// Cet endpoint expose un seul PublicProject déjà projeté. Il n'importe jamais
// projects.ts et ne retourne ni catalogue source, ni projet hidden, ni lien privé.
// ============================================================================
import type { APIRoute, GetStaticPaths } from 'astro';
import { loadPublishedCatalogue } from '../../../data/published.ts';
import type { PublicProject } from '../../../domain/project.ts';

// ----------------------------------------------------------------------------
// Pré-génère un endpoint par projet public.
// ----------------------------------------------------------------------------
export const getStaticPaths: GetStaticPaths = async () => {
  const catalogue = await loadPublishedCatalogue();
  return Object.values(catalogue.details).map((project) => ({ params: { id: project.id }, props: { project } }));
};

// ----------------------------------------------------------------------------
// Sérialise uniquement la fiche demandée avec un type JSON explicite.
// ----------------------------------------------------------------------------
export const GET: APIRoute = ({ props }) => {
  const project = props.project as PublicProject;
  return new Response(`${JSON.stringify(project)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
};
