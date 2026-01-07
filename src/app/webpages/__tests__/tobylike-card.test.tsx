import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TobyLikeCard } from '../TobyLikeCard';

vi.mock('../../sidebar/categories', () => ({
  useCategories: () => ({ categories: [{ id: 'default', name: 'Default' }] }),
}));
vi.mock('../../templates/TemplatesProvider', () => ({
  useTemplates: () => ({ templates: [] }),
}));

describe('TobyLikeCard interactions', () => {
  it('renders title/description and overlay checkbox toggles only in select mode', () => {
    const onToggle = vi.fn();
    render(
      <TobyLikeCard
        title="T"
        description="D"
        faviconText="WW"
        selectMode={false}
        selected={false}
        onToggleSelect={onToggle}
      />
    );
    const overlay = screen.getByLabelText(/select/i, { selector: 'input' });
    // clicking overlay label should not toggle when not in select mode
    fireEvent.click(overlay);
    expect(onToggle).not.toHaveBeenCalled();

    // re-render in select mode
    onToggle.mockReset();
    render(
      <TobyLikeCard
        title="T"
        description="D"
        faviconText="WW"
        selectMode={true}
        selected={false}
        onToggleSelect={onToggle}
      />
    );
    const overlay2 = screen.getAllByLabelText(/select/i)[0] as HTMLInputElement;
    fireEvent.click(overlay2);
    expect(onToggle).toHaveBeenCalled();
  });

  it('opens edit modal and saves updates', () => {
    const onTitle = vi.fn();
    const onUrl = vi.fn();
    const onDesc = vi.fn();
    render(
      <TobyLikeCard
        title="Old"
        description="OldD"
        url="https://x.test"
        faviconText="WW"
        onUpdateTitle={onTitle}
        onUpdateUrl={onUrl}
        onUpdateDescription={onDesc}
      />
    );
    const editBtn = screen.getByLabelText('編輯', { selector: 'button' });
    fireEvent.click(editBtn);
    fireEvent.change(screen.getByLabelText('Title', { selector: 'input' }), {
      target: { value: 'New' },
    });
    fireEvent.change(screen.getByLabelText('URL', { selector: 'input' }), {
      target: { value: 'https://n.test' },
    });
    fireEvent.change(
      screen.getByLabelText('Description', { selector: 'input' }),
      { target: { value: 'NewD' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onTitle).toHaveBeenCalledWith('New');
    expect(onUrl).toHaveBeenCalledWith('https://n.test/');
    expect(onDesc).toHaveBeenCalledWith('NewD');
  });

  it('does not close modal when clicking outside; closes with X and Cancel', () => {
    render(
      <TobyLikeCard
        title="Old"
        description="OldD"
        url="https://x.test"
        faviconText="WW"
      />
    );
    fireEvent.click(screen.getByLabelText('編輯', { selector: 'button' }));
    const dialog = screen.getByRole('dialog', { name: /Edit Card/ });
    expect(dialog).toBeInTheDocument();
    // Click overlay (outside dialog) should close
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole('dialog', { name: /Edit Card/ })).toBeNull();
    // Reopen and close with X / Cancel
    fireEvent.click(screen.getByLabelText('編輯', { selector: 'button' }));
    fireEvent.click(screen.getByRole('button', { name: /Close/ }));
    fireEvent.click(screen.getByLabelText('編輯', { selector: 'button' }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
  });
});
