import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TobyLikeCard } from '../TobyLikeCard';

vi.mock('../../sidebar/categories', () => ({
  useCategories: () => ({ categories: [{ id: 'default', name: 'Default' }] }),
}));
vi.mock('../../templates/TemplatesProvider', () => ({
  useTemplates: () => ({ templates: [] }),
}));

describe('TobyLikeCard interactions', () => {
  it('renders title/description and toggles selection', () => {
    const onToggle = vi.fn();
    render(
      <TobyLikeCard
        title="T"
        description="D"
        selected={false}
        onToggleSelect={onToggle}
      />
    );
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    const overlay = screen.getAllByRole('checkbox', { hidden: true })[0];
    fireEvent.click(overlay);
    expect(onToggle).toHaveBeenCalled();
  });

  it('opens edit modal and saves updates', () => {
    const onSave = vi.fn();
    render(
      <TobyLikeCard
        title="Old"
        description="OldD"
        url="https://x.test"
        faviconText="WW"
        onSave={onSave}
      />
    );
    const editBtn = screen.getByTitle('編輯');
    fireEvent.click(editBtn);
    const dialog = screen.getByText(/edit webpage/i).closest('div') as HTMLElement;
    expect(dialog).toBeInTheDocument();
    const [titleInput, urlInput] = within(dialog).getAllByRole('textbox');
    fireEvent.change(titleInput, {
      target: { value: 'New' },
    });
    fireEvent.change(urlInput, {
      target: { value: 'https://n.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New',
        url: 'https://n.test',
        description: 'OldD',
      })
    );
  });

  it('closes modal when clicking outside and with X and Cancel', () => {
    render(
      <TobyLikeCard
        title="Old"
        description="OldD"
        url="https://x.test"
      />
    );
    fireEvent.click(screen.getByTitle('編輯'));
    const dialog = screen.getByText(/Edit Webpage/i);
    expect(dialog).toBeInTheDocument();
    // Click overlay (outside dialog) should close
    const modal = dialog.closest('div') as HTMLElement;
    const overlay = modal.parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(screen.queryByText(/Edit Webpage/i)).toBeNull();
    // Reopen and close with X / Cancel
    fireEvent.click(screen.getByTitle('編輯'));
    const closeBtn = screen.getByText('✕').closest('button') as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Edit Webpage/i)).toBeNull();
    fireEvent.click(screen.getByTitle('編輯'));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(screen.queryByText(/Edit Webpage/i)).toBeNull();
  });
});
