// ============================================================================
// ProjectModal — Présentation dialog de la fiche après hydratation
// ----------------------------------------------------------------------------
// Le dialog réutilise ProjectDetails et laisse la route directe fournir le fallback
// HTML sans JavaScript. showModal rend automatiquement l'arrière-plan inert.
// ============================================================================
import { useEffect, useRef } from 'react';
import type { Locale } from '../domain/locale.ts';
import type { Category, PublicProject } from '../domain/project.ts';
import { formatRoute } from '../domain/routes.ts';
import { MESSAGES } from '../i18n/messages.ts';
import ProjectDetails from './ProjectDetails.tsx';

export type ProjectModalProps = {
  projectId: string;
  project?: PublicProject;
  categories: readonly Category[];
  locale: Locale;
  base: string;
  loading: boolean;
  error: boolean;
  onClose: () => void;
  onSwitchLocale: (locale: Locale) => void;
};

// ----------------------------------------------------------------------------
// Ouvre un dialog natif, verrouille le scroll et délègue le contenu à ProjectDetails.
// ----------------------------------------------------------------------------
export default function ProjectModal({ projectId, project, categories, locale, base, loading, error, onClose, onSwitchLocale }: ProjectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messages = MESSAGES[locale];

  // ----------------------------------------------------------------------------
  // Ouvre le dialog après montage et restaure l'état de scroll au démontage.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    const title = dialog.querySelector<HTMLElement>('h1,[data-modal-title]');
    title?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [projectId]);

  // ----------------------------------------------------------------------------
  // Replace le focus sur le titre réel lorsque le chargement asynchrone se termine.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (project === undefined) return;
    dialogRef.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [project]);

  // ----------------------------------------------------------------------------
  // Transforme l'événement cancel natif (Échap) en fermeture applicative History.
  // ----------------------------------------------------------------------------
  function handleCancel(event: React.SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    onClose();
  }

  const fullRoute = formatRoute({ locale, projectId, categories: [], sort: 'updated', q: '' }, base);
  return (
    <dialog ref={dialogRef} className="project-modal" aria-label={project?.name ?? messages.loadingProject} onCancel={handleCancel}>
      <div className="project-modal__frame">
        <div className="project-modal__toolbar">
        <div className="project-modal__languages" aria-label={messages.language}>
          <button type="button" aria-pressed={locale === 'en'} onClick={() => onSwitchLocale('en')} data-nav="">EN</button>
          <span aria-hidden="true">/</span>
          <button type="button" aria-pressed={locale === 'fr'} onClick={() => onSwitchLocale('fr')} data-nav="">FR</button>
        </div>
        <button type="button" className="project-modal__close" aria-label={messages.closeProject} onClick={onClose} data-nav="">×</button>
        </div>
        {project !== undefined && <ProjectDetails project={project} locale={locale} base={base} categories={categories} />}
        {project === undefined && loading && <p data-modal-title tabIndex={-1}>{messages.loadingProject}</p>}
        {project === undefined && error && (
          <div className="project-load-error" data-modal-title tabIndex={-1}>
            <p>{messages.projectLoadError}</p>
            <a className="button button--secondary" href={fullRoute}>{messages.openFullPage}</a>
          </div>
        )}
      </div>
    </dialog>
  );
}
