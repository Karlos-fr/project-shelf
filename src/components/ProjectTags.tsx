// ============================================================================
// ProjectTags — Étiquettes visibles d'un projet : catégorie, statut, technologies
// ----------------------------------------------------------------------------
// Ce composant présente des données déjà publiques et traduites. La catégorie est
// mise en avant, le statut porte une pastille, les technologies restent sobres.
// Il ne lit ni le catalogue brut ni l'état de navigation.
// ============================================================================
import type { Locale } from '../domain/locale.ts';
import type { ProjectStatus } from '../domain/project.ts';
import { MESSAGES } from '../i18n/messages.ts';

export type ProjectTagsProps = {
  categoryLabels: readonly string[];
  status: ProjectStatus;
  stack: readonly string[];
  locale: Locale;
};

// ----------------------------------------------------------------------------
// Rend une liste d'étiquettes ; l'ordre fixe aide à comparer les cartes entre elles.
// ----------------------------------------------------------------------------
export default function ProjectTags({ categoryLabels, status, stack, locale }: ProjectTagsProps) {
  const messages = MESSAGES[locale];
  return (
    <ul className="project-tags">
      {categoryLabels.map((label) => <li key={`c-${label}`} className="project-tag project-tag--category">{label}</li>)}
      <li className={`project-tag project-tag--status project-tag--${status}`}>{messages[status]}</li>
      {stack.map((item) => <li key={`s-${item}`} className="project-tag">{item}</li>)}
    </ul>
  );
}
