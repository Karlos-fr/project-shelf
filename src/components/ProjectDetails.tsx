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
import ProjectTags from './ProjectTags.tsx';

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
        <h1 id={`project-title-${project.id}`} tabIndex={-1}>{project.name}</h1>
        <ProjectTags categoryLabels={categoryLabels} status={project.status} stack={project.stack.slice(0, 3)} locale={locale} />
        <p className="project-details__tagline">{content.tagline}</p>
      </header>
      <MediaGallery project={project} locale={locale} base={base} />
      <div className="project-details__content">
        <div className="project-details__main">
          <p className="project-details__description">{content.description}</p>
          {content.about !== undefined && <section><h2>{messages.motivation}</h2><p>{content.about}</p></section>}
          {/* Le téléchargement passe en premier : c'est l'action attendue sur une fiche. */}
          <div className="project-actions">
            {orderedLinks(project.links).map((link) => (
              <a key={`${link.type}-${link.url}`} className={link.type === 'release' || link.type === 'demo' ? 'button button--primary' : 'button button--secondary'} href={link.url} data-nav="">
                {linkLabel(link.type, locale)}
              </a>
            ))}
            {project.repositoryVisibility === 'public' && project.repositoryUrl !== undefined
              ? <a className="button button--secondary" href={project.repositoryUrl} data-nav="">{messages.viewSource}</a>
              : <span className="private-repository">{messages.privateRepository}</span>}
          </div>
          <dl className="project-dates">
            <div><dt>{messages.createdOn}</dt><dd><time dateTime={project.createdAt}>{formatProjectDate(project.createdAt, locale)}</time></dd></div>
            <div><dt>{messages.updatedOn}</dt><dd><time dateTime={project.updatedAt}>{formatProjectDate(project.updatedAt, locale)}</time></dd></div>
          </dl>
        </div>
        <div className="project-details__side">
          {content.features.length > 0 && <DetailList title={messages.features} items={content.features} />}
          {content.limitations !== undefined && content.limitations.length > 0 && <DetailList title={messages.limits} items={content.limitations} />}
          <section><h2>{messages.technologies}</h2><p className="project-details__stack">{project.stack.join(' · ')}</p></section>
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

// Ordre d'affichage des actions : ce qui se lance ou se télécharge d'abord.
const LINK_ORDER: Readonly<Record<ProjectLinkType, number>> = { release: 0, demo: 1, website: 2, documentation: 3 };

// ----------------------------------------------------------------------------
// Trie les liens d'action sans modifier la liste publiée.
// ----------------------------------------------------------------------------
function orderedLinks<T extends { type: ProjectLinkType }>(links: readonly T[]): T[] {
  return [...links].sort((left, right) => LINK_ORDER[left.type] - LINK_ORDER[right.type]);
}
