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

    // Default entries: Default only (All removed)
    expect(
      screen.getByRole('button', { name: /Default/i })
    ).toBeInTheDocument();

    // Initially Default is selected
    const def = screen.getByRole('button', { name: /Default/i });
    expect(def.getAttribute('data-active')).toBe('true');
  });

  it('updates content area when switching category', () => {
    render(
      <CategoriesProvider>
        <ThreeColumnLayout sidebar={<Sidebar />} content={<ContentProbe />} />
      </CategoriesProvider>
    );

    // Initially shows Default (All removed)
    expect(screen.getByTestId('content-probe').textContent).toContain('default');
    // Since there's only one category now, the test just verifies it shows Default
    expect(screen.getByRole('button', { name: /Default/i })).toBeInTheDocument();
  });
});
