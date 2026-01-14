import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
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

describe('TobyLikeCard edit modal fixes (fix-card-edit-modal)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('edit modal should display Note input field', () => {
    render(
      <TobyLikeCard
        title="Test"
        description="My note"
        url="https://example.com"
      />
    );
    fireEvent.click(screen.getByTitle('編輯'));

    // Should have Note label
    expect(screen.getByText('Note')).toBeInTheDocument();

    // Should have 3 text inputs: Title, URL, Note
    const dialog = screen.getByText(/edit webpage/i).closest('div') as HTMLElement;
    const inputs = within(dialog).getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(3);

    // Note input should contain the description value
    const noteInput = inputs[2];
    expect(noteInput).toHaveValue('My note');
  });

  it('auto-save should not overwrite user input (no revert on props change)', async () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <TobyLikeCard
        title="Original"
        description="Original note"
        url="https://example.com"
        onSave={onSave}
      />
    );

    // Open modal
    fireEvent.click(screen.getByTitle('編輯'));
    const dialog = screen.getByText(/edit webpage/i).closest('div') as HTMLElement;
    const inputs = within(dialog).getAllByRole('textbox');
    const titleInput = inputs[0];

    // User types new value
    fireEvent.change(titleInput, { target: { value: 'User typing...' } });
    expect(titleInput).toHaveValue('User typing...');

    // Trigger auto-save (500ms debounce)
    act(() => { vi.advanceTimersByTime(500); });
    expect(onSave).toHaveBeenCalled();

    // Simulate props update (as if parent re-rendered with saved value)
    rerender(
      <TobyLikeCard
        title="User typing..."
        description="Original note"
        url="https://example.com"
        onSave={onSave}
      />
    );

    // User continues typing
    fireEvent.change(titleInput, { target: { value: 'User typing... more' } });

    // Input should NOT revert to props value
    expect(titleInput).toHaveValue('User typing... more');
  });

  it('reopening modal should load latest props', () => {
    const { rerender } = render(
      <TobyLikeCard
        title="V1"
        description="Note V1"
        url="https://v1.com"
      />
    );

    // Open modal
    fireEvent.click(screen.getByTitle('編輯'));
    let dialog = screen.getByText(/edit webpage/i).closest('div') as HTMLElement;
    let inputs = within(dialog).getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('V1');

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));

    // Props change while modal closed
    rerender(
      <TobyLikeCard
        title="V2"
        description="Note V2"
        url="https://v2.com"
      />
    );

    // Reopen modal - should show new values
    fireEvent.click(screen.getByTitle('編輯'));
    dialog = screen.getByText(/edit webpage/i).closest('div') as HTMLElement;
    inputs = within(dialog).getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('V2');
    expect(inputs[1]).toHaveValue('https://v2.com');
    expect(inputs[2]).toHaveValue('Note V2');
  });
});
