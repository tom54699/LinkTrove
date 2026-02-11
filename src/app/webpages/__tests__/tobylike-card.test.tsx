import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { TobyLikeCard } from '../TobyLikeCard';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

vi.mock('../../sidebar/categories', () => ({
  useCategories: () => ({ categories: [{ id: 'c1', name: 'Bookmarks' }] }),
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
    const editBtn = screen.getByTitle('menu_edit');
    fireEvent.click(editBtn);
    const dialog = screen.getByText('card_edit_title').closest('div') as HTMLElement;
    expect(dialog).toBeInTheDocument();
    const [titleInput, urlInput] = within(dialog).getAllByRole('textbox');
    fireEvent.change(titleInput, {
      target: { value: 'New' },
    });
    fireEvent.change(urlInput, {
      target: { value: 'https://n.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'btn_save_changes' }));
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
    fireEvent.click(screen.getByTitle('menu_edit'));
    const dialog = screen.getByText('card_edit_title');
    expect(dialog).toBeInTheDocument();
    // Click overlay (outside dialog) should close
    const modal = dialog.closest('div') as HTMLElement;
    const overlay = modal.parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(screen.queryByText('card_edit_title')).toBeNull();
    // Reopen and close with X / Cancel
    fireEvent.click(screen.getByTitle('menu_edit'));
    const closeBtn = screen.getByText('✕').closest('button') as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(screen.queryByText('card_edit_title')).toBeNull();
    fireEvent.click(screen.getByTitle('menu_edit'));
    fireEvent.click(screen.getByRole('button', { name: 'btn_cancel' }));
    expect(screen.queryByText('card_edit_title')).toBeNull();
  });

  it('toggles flip via time button and blocks open while flipped', () => {
    const onOpen = vi.fn();
    render(
      <TobyLikeCard
        title="T"
        description="D"
        createdAt="2026-01-01T00:00:00Z"
        updatedAt="2026-01-02T00:00:00Z"
        onOpen={onOpen}
      />
    );
    const card = screen.getByText('T').closest('.card') as HTMLElement;
    const flipBtn = screen.getByTitle('card_time_toggle');
    fireEvent.click(flipBtn);
    expect(card.className).toContain('is-flipped');
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(card);
    expect(card.className).not.toContain('is-flipped');
    expect(onOpen).not.toHaveBeenCalled();
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
    fireEvent.click(screen.getByTitle('menu_edit'));

    // Should have Note label
    expect(screen.getByText('card_note_label')).toBeInTheDocument();

    // Should have 3 text inputs: Title, URL, Note
    const dialog = screen.getByText('card_edit_title').closest('div') as HTMLElement;
    const inputs = within(dialog).getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(3);

    // Note input should contain the description value
    const noteInput = inputs[2];
    expect(noteInput).toHaveValue('My note');
  });

  it('does not auto-save while typing and preserves user input on props change', async () => {
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
    fireEvent.click(screen.getByTitle('menu_edit'));
    const dialog = screen.getByText('card_edit_title').closest('div') as HTMLElement;
    const inputs = within(dialog).getAllByRole('textbox');
    const titleInput = inputs[0];

    // User types new value
    fireEvent.change(titleInput, { target: { value: 'User typing...' } });
    expect(titleInput).toHaveValue('User typing...');

    // No auto-save behavior; advancing timers should not trigger save
    act(() => { vi.advanceTimersByTime(500); });
    expect(onSave).not.toHaveBeenCalled();

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
    fireEvent.click(screen.getByTitle('menu_edit'));
    let dialog = screen.getByText('card_edit_title').closest('div') as HTMLElement;
    let inputs = within(dialog).getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('V1');

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'btn_cancel' }));

    // Props change while modal closed
    rerender(
      <TobyLikeCard
        title="V2"
        description="Note V2"
        url="https://v2.com"
      />
    );

    // Reopen modal - should show new values
    fireEvent.click(screen.getByTitle('menu_edit'));
    dialog = screen.getByText('card_edit_title').closest('div') as HTMLElement;
    inputs = within(dialog).getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('V2');
    expect(inputs[1]).toHaveValue('https://v2.com');
    expect(inputs[2]).toHaveValue('Note V2');
  });
});
