import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '../app/AppContext';
import { AppLayout, Home } from '../app/App';

function renderApp(path: string = '/') {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AppProvider>
  );
}

describe('App foundation (task 3.1)', () => {
  it('applies dark theme to document', () => {
    renderApp('/');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('renders home heading', async () => {
    renderApp('/');
    const headings = screen.getAllByText(/LinkTrove Home/i);
    expect(headings.length).toBeGreaterThan(0);
  });
});
