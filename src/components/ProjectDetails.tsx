// ============================================================================
// ProjectDetails — Contenu unique de la fiche projet, utilisable avec ou sans JS
// ----------------------------------------------------------------------------
// Ce composant rend le même article dans la route directe et, plus tard, la popin.
// Il n'invente aucun lien pour une source privée ni aucune section éditoriale vide.
// ============================================================================
import type { Locale } from '../domain/locale.ts';
import type { Category, ProjectLinkType, PublicProject } from '../domain/project.ts';
import { formatProjectDate } from '../domain/locale.ts';
import { MESSAGES } from '../i18n/messages.ts';
import MediaGallery from './MediaGallery.tsx';

export type ProjectDetailsProps = {
  project: PublicProject;
  locale: Locale;
  base: string;
  categories: readonly Category[];
};

// ----------------------------------------------------------------------------
// Rend le média initial manuel, la description, les fonctionnalités et les liens honnêtes.
// ----------------------------------------------------------------------------
export default function ProjectDetails({ project, locale, base, categories }: ProjectDetailsProps) {
  const content = project.content[locale];
  const messages = MESSAGES[locale];
  // Les libellés viennent du catalogue publié ; l'identifiant reste un repli défensif.
  const labelById = new Map(categories.map((category) => [category.id, category.label[locale]] as const));
  const categoryLabels = project.categories.map((id) => labelById.get(id) ?? id);
  return (
    <article className="project-details" data-project-id={project.id} aria-labelledby={`project-title-${project.id}`}>
      <header className="project-details__header">
        <div>
          <p className="project-details__categories">{categoryLabels.join(' · ')}</p>
          <h1 id={`project-title-${project.id}`} tabIndex={-1}>{project.name}</h1>
          <p className="project-details__tagline">{content.tagline}</p>
        </div>
        <span className="status-badge">{messages[project.status]}</span>
      </header>
      <MediaGallery project={project} locale={locale} base={base} />
      <div className="project-details__content">
        <p>{content.description}</p>
        {content.features.length > 0 && <DetailList title={messages.features} items={content.features} />}
        {content.limitations !== undefined && content.limitations.length > 0 && <DetailList title={messages.limits} items={content.limitations} />}
        {content.about !== undefined && <section><h2>{messages.motivation}</h2><p>{content.about}</p></section>}
        <section><h2>{messages.technologies}</h2><p>{project.stack.join(' · ')}</p></section>
        <dl className="project-dates">
          <div><dt>{messages.createdOn}</dt><dd><time dateTime={project.createdAt}>{formatProjectDate(project.createdAt, locale)}</time></dd></div>
          <div><dt>{messages.updatedOn}</dt><dd><time dateTime={project.updatedAt}>{formatProjectDate(project.updatedAt, locale)}</time></dd></div>
        </dl>
        <div className="project-actions">
          {project.repositoryVisibility === 'public' && project.repositoryUrl !== undefined
            ? <a className="button button--primary" href={project.repositoryUrl}>{messages.viewSource}</a>
            : <span className="private-repository">{messages.privateRepository}</span>}
          {project.links.map((link) => <a key={`${link.type}-${link.url}`} className="button button--secondary" href={link.url}>{linkLabel(link.type, locale)}</a>)}
        </div>
      </div>
    </article>
  );
}

// ----------------------------------------------------------------------------
// Rend une liste éditoriale uniquement lorsqu'elle contient de vraies valeurs.
// ----------------------------------------------------------------------------
function DetailList({ title, items }: { title: string; items: readonly string[] }) {
  return <section><h2>{title}</h2><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

// ----------------------------------------------------------------------------
// Traduit le type fermé d'un lien sans utiliser un libellé fourni par le projet.
// ----------------------------------------------------------------------------
function linkLabel(type: ProjectLinkType, locale: Locale): string {
  const messages = MESSAGES[locale];
  if (type === 'demo') return messages.tryDemo;
  if (type === 'website') return messages.visitWebsite;
  if (type === 'release') return messages.viewRelease;
  return messages.documentation;
}
