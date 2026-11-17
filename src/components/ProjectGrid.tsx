// ============================================================================
// ProjectGrid — Résultats filtrés et état vide de la bibliothèque
// ----------------------------------------------------------------------------
// Ce composant ne filtre pas lui-même les données ; ShowcaseApp lui transmet le
// résultat de selectProjects afin de conserver une seule logique métier.
// ============================================================================
import type { ProjectSummary } from '../domain/project.ts';
import type { RouteState } from '../domain/routes.ts';
import type { Locale } from '../domain/locale.ts';
import { MESSAGES } from '../i18n/messages.ts';
import ProjectCard from './ProjectCard.tsx';

export type ProjectGridProps = {
  projects: readonly ProjectSummary[];
  route: RouteState;
  base: string;
  onOpen?: (projectId: string, triggerId: string) => void;
};

// ----------------------------------------------------------------------------
// Rend le compteur, la grille responsive ou l'aide d'état vide localisée.
// ----------------------------------------------------------------------------
export default function ProjectGrid({ projects, route, base, onOpen }: ProjectGridProps) {
  const messages = MESSAGES[route.locale];
  return (
    <div className="project-results">
      <p className="result-count" role="status" aria-live="polite">{formatResultCount(projects.length, route.locale)}</p>
      {projects.length > 0 ? (
        <div className="project-grid" data-project-grid>
          {projects.map((project) => <ProjectCard key={project.id} project={project} route={route} base={base} variant="grid" onOpen={onOpen} />)}
        </div>
      ) : (
        <div className="empty-state">
          <strong>{messages.noResults}</strong>
          <p>{messages.noResultsHint}</p>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Formate le nombre de résultats avec l'accord de la langue active.
// Paramètres : count est le nombre de cartes affichées ; locale règle le pluriel
// (le français accorde 0 au singulier, l'anglais au pluriel).
// ----------------------------------------------------------------------------
function formatResultCount(count: number, locale: Locale): string {
  const messages = MESSAGES[locale];
  const noun = new Intl.PluralRules(locale).select(count) === 'one' ? messages.projectOne : messages.projectOther;
  return `${count} ${noun}`;
}
