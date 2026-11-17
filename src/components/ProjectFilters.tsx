// ============================================================================
// ProjectFilters — Recherche, catégories OR, tri et remise à zéro
// ----------------------------------------------------------------------------
// Les contrôles restent standards et accessibles. Ils émettent un GalleryState
// complet ; aucune valeur de catégorie n'est codée en dur dans ce composant.
// ============================================================================
import type { KeyboardEvent } from 'react';
import type { Category } from '../domain/project.ts';
import type { Locale } from '../domain/locale.ts';
import type { GalleryState } from '../domain/routes.ts';
import { MESSAGES } from '../i18n/messages.ts';

export type ProjectFiltersProps = {
  categories: readonly Category[];
  locale: Locale;
  state: GalleryState;
  onChange: (next: GalleryState) => void;
  onSearchCommit?: () => void;
};

// ----------------------------------------------------------------------------
// Rend les commandes de galerie et transmet chaque changement sous forme immuable.
// ----------------------------------------------------------------------------
export default function ProjectFilters({ categories, locale, state, onChange, onSearchCommit }: ProjectFiltersProps) {
  const messages = MESSAGES[locale];
  const hasCriteria = state.categories.length > 0 || state.q.length > 0 || state.sort !== 'updated';

  // ----------------------------------------------------------------------------
  // Termine une session de recherche lorsqu'Entrée confirme la valeur courante.
  // ----------------------------------------------------------------------------
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') onSearchCommit?.();
  }

  return (
    <div className="project-filters" aria-label={messages.allProjects}>
      <div className="filter-row filter-row--primary">
        <label className="search-control">
          <span className="sr-only">{messages.searchProjects}</span>
          <input type="search" value={state.q} placeholder={messages.searchPlaceholder}
            onChange={(event) => onChange({ ...state, categories: [...state.categories], q: event.currentTarget.value })}
            onBlur={onSearchCommit} onKeyDown={handleSearchKeyDown} />
        </label>
        <label className="sort-control">
          <span>{messages.sortBy}</span>
          <select value={state.sort} onChange={(event) => onChange({ ...state, categories: [...state.categories], sort: event.currentTarget.value as GalleryState['sort'] })}>
            <option value="updated">{messages.recentlyUpdated}</option>
            <option value="created">{messages.newestProjects}</option>
          </select>
        </label>
        <button type="button" className="reset-button" disabled={!hasCriteria} onClick={() => onChange({ categories: [], sort: 'updated', q: '' })}>{messages.resetFilters}</button>
      </div>
      <fieldset className="category-filters">
        <legend>{messages.categories}</legend>
        <div className="category-filter-list">
          {categories.map((category) => (
            <label key={category.id} className="category-chip">
              <input type="checkbox" checked={state.categories.includes(category.id)} onChange={() => onChange(toggleCategory(state, category.id))} />
              <span>{category.label[locale]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Ajoute ou retire une catégorie sans modifier l'ordre des autres critères.
// ----------------------------------------------------------------------------
function toggleCategory(state: GalleryState, id: string): GalleryState {
  const selected = new Set(state.categories);
  if (selected.has(id)) selected.delete(id); else selected.add(id);
  return { ...state, categories: [...selected].sort() };
}
