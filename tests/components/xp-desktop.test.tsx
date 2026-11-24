// @vitest-environment jsdom
// ============================================================================
// XpDesktopComponent — Clavier et focus du bureau Windows XP de la chambre
// ----------------------------------------------------------------------------
// Vérifie que le menu Démarrer se parcourt au clavier et rend le focus à son bouton,
// qu'une fenêtre ouverte reçoit le focus, et qu'une fenêtre réduite le passe à son bouton
// de la barre des tâches. Le lecteur vidéo n'est pas lu : jsdom n'a pas de média.
// ============================================================================
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import XpDesktop from '../../src/xp/XpDesktop.tsx';
import type { XpCatalog } from '../../src/xp/xp-apps.ts';

// Deux projets de démonstration : une page web et une vidéo.
const catalog: XpCatalog = {
  apps: {
    alpha: { id: 'alpha', name: 'Alpha', icon: '/alpha.webp', kind: 'browser', url: 'https://alpha.example.test/' },
    beta: { id: 'beta', name: 'Beta', icon: '/beta.webp', kind: 'player', video: '/beta.mp4', poster: '/beta.webp' },
  },
  order: ['alpha', 'beta'],
  folders: [{ id: 'games', label: 'Jeux', appIds: ['alpha'] }],
};

// ----------------------------------------------------------------------------
// Monte le bureau, écran regardé, en français.
// ----------------------------------------------------------------------------
function renderDesktop() {
  return render(<XpDesktop locale="fr" catalog={catalog} base="/" active onTurnOff={() => undefined} />);
}

describe('XpDesktop', () => {
  // jsdom ne sait ni lire une vidéo ni charger une iframe : ces appels sont neutralisés.
  beforeAll(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  it('entre dans le menu Démarrer au clavier, le parcourt et rend le focus avec Échap', () => {
    renderDesktop();
    const start = screen.getByRole('button', { name: 'démarrer' });
    fireEvent.click(start, { detail: 0 });
    const items = screen.getAllByRole('menuitem').filter((item) => !(item as HTMLButtonElement).disabled);
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(start);
  });

  it('donne le focus à la fenêtre ouverte, puis au bouton de tâche quand on la réduit', () => {
    renderDesktop();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Alpha' }), { key: 'Enter' });
    const win = screen.getByRole('dialog', { name: /Alpha/ });
    expect(document.activeElement).toBe(win);
    fireEvent.click(screen.getByRole('button', { name: 'Réduire' }));
    const task = document.querySelector('[data-task-id="app:alpha"]');
    expect(task).not.toBeNull();
    expect(document.activeElement).toBe(task);
  });
});
