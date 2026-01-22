import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

vi.mock('../TemplatesProvider', () => {
  const addField = vi.fn();
  const addFields = vi.fn();
  const updateFieldRequired = vi.fn();
  const updateField = vi.fn();
  const updateFieldType = vi.fn();
  const updateFieldOptions = vi.fn();
  const reorderField = vi.fn();
  const removeField = vi.fn();
  const rename = vi.fn();
  const remove = vi.fn();
  const add = vi.fn().mockResolvedValue({ id: 't1', name: 'T1', fields: [] });
  return {
    useTemplates: () => ({
      templates: [{ id: 't1', name: 'T1', fields: [] }],
      actions: {
        add,
        addFields,
        rename,
        remove,
        addField,
        updateField,
        updateFieldType,
        updateFieldOptions,
        updateFieldRequired,
        reorderField,
        removeField,
      },
    }),
  } as any;
});

vi.mock('../../sidebar/categories', () => ({
  useCategories: () => ({
    categories: [{ id: 'default', name: 'Default', color: '#aaa', order: 0 }],
    selectedId: 'default',
    setCurrentCategory: vi.fn(),
    actions: {
      setDefaultTemplate: vi.fn(),
      addCategory: vi.fn(),
      renameCategory: vi.fn(),
      deleteCategory: vi.fn(),
    },
  }),
}));

vi.mock('../../ui/feedback', () => ({
  useFeedback: () => ({
    showToast: vi.fn(),
  }),
}));

import { TemplatesManager } from '../TemplatesManager';

describe('TemplatesManager quick-add common fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('quick-adds the book template preset', async () => {
    const { useTemplates } = await import('../TemplatesProvider');
    const { actions } = useTemplates();
    render(<TemplatesManager />);

    fireEvent.click(screen.getByRole('button', { name: 'tpl_preset_book' }));

    await waitFor(() => expect(actions.add).toHaveBeenCalledWith('書籍模板'));
    await waitFor(() =>
      expect(actions.addFields).toHaveBeenCalledWith(
        't1',
        expect.arrayContaining([
          expect.objectContaining({ key: 'bookTitle', label: '書名' }),
          expect.objectContaining({ key: 'author', label: '作者' }),
          expect.objectContaining({ key: 'serialStatus', label: '狀態' }),
        ])
      )
    );
  });

  it('adds custom field with type/options/required', async () => {
    const { useTemplates } = await import('../TemplatesProvider');
    const { actions } = useTemplates();
    render(<TemplatesManager />);
    fireEvent.click(screen.getByText('T1'));
    const key = screen.getByPlaceholderText('e.g. price') as HTMLInputElement;
    const label = screen.getByPlaceholderText('tpl_field_display_name') as HTMLInputElement;
    const typeSel = screen.getByRole('combobox') as HTMLSelectElement;

    fireEvent.change(key, { target: { value: 'priority' } });
    fireEvent.change(label, { target: { value: 'Priority' } });
    fireEvent.change(typeSel, { target: { value: 'select' } });
    fireEvent.click(screen.getByRole('button', { name: 'btn_add' }));

    expect(actions.addField).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        key: 'priority',
        label: 'Priority',
        type: 'select',
      })
    );
  });

  it('accepts field key without local validation', async () => {
    const { useTemplates } = await import('../TemplatesProvider');
    const { actions } = useTemplates();
    render(<TemplatesManager />);
    fireEvent.click(screen.getByText('T1'));
    const key = screen.getByPlaceholderText('e.g. price') as HTMLInputElement;
    const label = screen.getByPlaceholderText('tpl_field_display_name') as HTMLInputElement;

    fireEvent.change(key, { target: { value: '作者' } });
    fireEvent.change(label, { target: { value: '作者' } });
    fireEvent.click(screen.getByRole('button', { name: 'btn_add' }));

    await waitFor(() => {
      expect(actions.addField).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ key: '作者', label: '作者' })
      );
    });
  });
});
