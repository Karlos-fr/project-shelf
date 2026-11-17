// ============================================================================
// SiteHeader — Identité, GitHub et navigation linguistique de ProjectShelf
// ----------------------------------------------------------------------------
// Les liens restent natifs et partageables. Après hydratation, un changement de
// langue simple peut être intercepté par le contrôleur History.
// ============================================================================
import type { MouseEvent } from 'react';
import type { SiteConfig } from '../config/site.ts';
import type { Locale } from '../domain/locale.ts';
import { formatRoute, type RouteState } from '../domain/routes.ts';
import { MESSAGES } from '../i18n/messages.ts';

export type SiteHeaderProps = {
  config: SiteConfig;
  route: RouteState;
  onSwitchLocale?: (locale: Locale) => void;
};

// ----------------------------------------------------------------------------
// Rend l'identité principale et deux liens de langue conservant l'état partageable.
// ----------------------------------------------------------------------------
export default function SiteHeader({ config, route, onSwitchLocale }: SiteHeaderProps) {
  const messages = MESSAGES[route.locale];
  return (
    <header className="site-header">
      <div className="site-header__identity">
        <a className="site-name" href={formatRoute({ ...route, projectId: null }, config.base)}>{config.name}</a>
      </div>
      <nav className="site-header__nav" aria-label={messages.language}>
        <a href={config.githubUrl} rel="me">GitHub</a>
        <span className="language-switch" aria-label={messages.language}>
          <LanguageLink locale="en" route={route} base={config.base} onSwitch={onSwitchLocale} />
          <span aria-hidden="true">/</span>
          <LanguageLink locale="fr" route={route} base={config.base} onSwitch={onSwitchLocale} />
        </span>
      </nav>
    </header>
  );
}

// ----------------------------------------------------------------------------
// Rend une langue et intercepte uniquement un clic principal sans modificateur.
// ----------------------------------------------------------------------------
function LanguageLink({ locale, route, base, onSwitch }: { locale: Locale; route: RouteState; base: string; onSwitch?: (locale: Locale) => void }) {
  // --------------------------------------------------------------------------
  // Préserve nouvel onglet, Ctrl/Cmd, Shift et Alt ; sinon délègue à History.
  // --------------------------------------------------------------------------
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    if (onSwitch === undefined || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSwitch(locale);
  }
  return (
    <a href={formatRoute({ ...route, locale }, base)} lang={locale} aria-current={route.locale === locale ? 'page' : undefined} onClick={handleClick}>
      {locale.toUpperCase()}
    </a>
  );
}
