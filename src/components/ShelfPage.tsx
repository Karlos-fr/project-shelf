// ============================================================================
// ShelfPage — Page autonome de l'étagère 3D, à part de la vitrine
// ----------------------------------------------------------------------------
// L'étagère vit seule sur /{langue}/shelf/ : la vitrine reste légère sur tous les
// appareils, et la scène 3D ne se charge que pour qui vient la voir. Sans JavaScript,
// la page garde le titre et la liste des liens vers les fiches complètes.
// ============================================================================
import { useMemo } from 'react';
import type { SiteConfig } from '../config/site.ts';
import type { Locale } from '../domain/locale.ts';
import type { ProjectSummary } from '../domain/project.ts';
import type { RouteState } from '../domain/routes.ts';
import { MESSAGES } from '../i18n/messages.ts';
import { MediaCoordinatorContext } from '../media/context.tsx';
import { createMediaCoordinator } from '../media/coordinator.ts';
import ProjectShelf from './ProjectShelf.tsx';

export type ShelfPageProps = {
  config: SiteConfig;
  summaries: ProjectSummary[];
  locale: Locale;
};

// ----------------------------------------------------------------------------
// Rend l'en-tête de retour, l'étagère et le pied de page.
// Les liens de l'étagère mènent aux fiches complètes (pas de popin sur cette page).
// ----------------------------------------------------------------------------
export default function ShelfPage({ config, summaries, locale }: ShelfPageProps) {
  const mediaCoordinator = useMemo(() => createMediaCoordinator(), []);
  const messages = MESSAGES[locale];
  const route: RouteState = { locale, projectId: null, categories: [], sort: 'updated', q: '' };
  const root = config.base.endsWith('/') ? config.base : `${config.base}/`;
  const other: Locale = locale === 'fr' ? 'en' : 'fr';
  return (
    <MediaCoordinatorContext.Provider value={mediaCoordinator}>
      <div className="site-shell shelf-page">
        <header className="shelf-page__header">
          <a href={`${root}${locale}/`}>{messages.shelfBack}</a>
          <a href={`${root}${other}/shelf/`} hrefLang={other} lang={other}>{messages.shelfOtherLocale}</a>
        </header>
        <main>
          <ProjectShelf projects={summaries} route={route} base={config.base} suspended={false} />
        </main>
        <footer className="site-footer"><span>ProjectShelf</span><a href={config.githubUrl}>GitHub</a></footer>
      </div>
    </MediaCoordinatorContext.Provider>
  );
}
