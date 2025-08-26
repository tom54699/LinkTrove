import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreeColumnLayout } from '../../layout/ThreeColumn';
import { CategoriesProvider, useCategories } from '../categories';
import { Sidebar } from '../sidebar';

const ContentProbe: React.FC = () => {
  const { selectedId } = useCategories();
  return <div data-testid="content-probe">Current: {selectedId}</div>;
};

describe('Sidebar (task 7.1)', () => {
  it('shows default categories and allows selection', () => {
    render(
      <CategoriesProvider>
        <Sidebar />
      </CategoriesProvider>
    );

    // Default entries: All + Default
    expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Default/i })
    ).toBeInTheDocument();

    // Initially All is selected
    const all = screen.getByRole('button', { name: /All/i });
    expect(all.getAttribute('data-active')).toBe('true');

    // Click Default selects it
    const def = screen.getByRole('button', { name: /Default/i });
    fireEvent.click(def);
    expect(def.getAttribute('data-active')).toBe('true');
  });

  it('updates content area when switching category', () => {
    render(
      <CategoriesProvider>
        <ThreeColumnLayout sidebar={<Sidebar />} content={<ContentProbe />} />
      </CategoriesProvider>
    );

    // Initially shows All
    expect(screen.getByTestId('content-probe').textContent).toContain('all');
    fireEvent.click(screen.getByRole('button', { name: /Default/i }));
    expect(screen.getByTestId('content-probe').textContent).toContain(
      'default'
    );
  });
});
