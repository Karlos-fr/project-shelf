// @vitest-environment jsdom
// ============================================================================
// ProjectGridComponents — Interactions de filtre et état vide de la galerie
// ----------------------------------------------------------------------------
// Ces tests montent le composant avec le catalogue public synthétique de T2.
// ==========================================================================
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import ShowcaseApp from '../../src/components/ShowcaseApp.tsx';
import { showcaseFixtureProps } from '../fixtures/catalogue.ts';

// ----------------------------------------------------------------------------
// Vérifie que catégorie et recherche restent combinées sans masquer les commandes.
// ----------------------------------------------------------------------------
it('combine catégorie et recherche et conserve les commandes', () => {
  render(<ShowcaseApp {...showcaseFixtureProps()} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Audio' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'introuvable' } });
  expect(screen.getByRole('status')).toHaveTextContent('0 projects');
  expect(screen.getByRole('searchbox')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Reset filters' })).toBeVisible();
});
