// ============================================================================
// SiteHeader — Bandeau d'identité sur une ligne, façon affichage de télévision
// ----------------------------------------------------------------------------
// Le pseudo GitHub, un voyant « à l'antenne » et une phrase dont la fin défile
// tiennent sur une ligne. L'accroche complète reste dans le titre principal pour
// les lecteurs d'écran et les moteurs de recherche. Les liens restent natifs ;
// après hydratation, un changement de langue peut être intercepté par History.
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
  const handle = githubHandle(config.githubUrl);
  const lines = [messages.rollLine1, messages.rollLine2, messages.rollLine3, messages.rollLine4];
  return (
    <header className="site-header">
      <a className="site-name" href={formatRoute({ ...route, projectId: null }, config.base)} data-nav="">
        <span className="site-name__dot" aria-hidden="true" />{handle}
      </a>
      <div className="site-tagline">
        {/* Le titre principal porte l'accroche complète ; la phrase qui défile reste
            décorative et hors du titre pour ne pas être lue plusieurs fois. */}
        <h1 id="hero-title" className="sr-only">{config.intro[route.locale]}</h1>
        {/* La première ligne est répétée en fin de piste pour boucler sans saut. */}
        <span className="site-tagline__roll" aria-hidden="true">
          <span className="site-tagline__track">
            {[...lines, lines[0]].map((line, index) => <span key={`${index}-${line}`}>{line}</span>)}
          </span>
        </span>
      </div>
      <nav className="site-header__nav" aria-label={messages.language}>
        <a href={config.githubUrl} rel="me" data-nav="">GitHub</a>
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
// Extrait le pseudo affiché du lien GitHub de la configuration.
// Paramètres : url est le profil GitHub ; retour : dernier segment, ou « GitHub ».
// ----------------------------------------------------------------------------
function githubHandle(url: string): string {
  return url.split('/').filter(Boolean).pop() ?? 'GitHub';
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
    <a href={formatRoute({ ...route, locale }, base)} lang={locale} aria-current={route.locale === locale ? 'page' : undefined} onClick={handleClick} data-nav="">
      {locale.toUpperCase()}
    </a>
  );
}
