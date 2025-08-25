import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../app/AppContext';
import { AppLayout, Home } from '../app/App';

function renderApp(path: string = '/') {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppLayout />
        {path === '/' && <Home />}
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
    expect(screen.getByText(/LinkTrove Home/i)).toBeInTheDocument();
  });
});

