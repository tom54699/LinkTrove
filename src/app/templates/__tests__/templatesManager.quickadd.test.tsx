import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
  it('quick-adds the book template preset', async () => {
    const { useTemplates } = await import('../TemplatesProvider');
    const { actions } = useTemplates();
    render(<TemplatesManager />);

    fireEvent.click(screen.getByRole('button', { name: /書籍模板/ }));

    await waitFor(() => expect(actions.add).toHaveBeenCalledWith('書籍模板'));
    await waitFor(() =>
      expect(actions.addFields).toHaveBeenCalledWith(
        't1',
        expect.arrayContaining([
          expect.objectContaining({ key: 'bookTitle', label: '書名' }),
          expect.objectContaining({ key: 'author', label: '作者' }),
          expect.objectContaining({ key: 'serialStatus', label: '連載狀態' }),
        ])
      )
    );
  });

  it('adds custom field with type/options/required', async () => {
    const { useTemplates } = await import('../TemplatesProvider');
    const { actions } = useTemplates();
    render(<TemplatesManager />);
    const key = screen.getByPlaceholderText('例如：author') as HTMLInputElement;
    const label = screen.getByPlaceholderText('輸入顯示名稱') as HTMLInputElement;
    const typeSel = screen.getByRole('combobox') as HTMLSelectElement;

    fireEvent.change(key, { target: { value: 'priority' } });
    fireEvent.change(label, { target: { value: 'Priority' } });
    fireEvent.change(typeSel, { target: { value: 'select' } });
    const options = screen.getByPlaceholderText(
      '例如：選颅1, 選颅2, 選颅3'
    ) as HTMLInputElement;
    fireEvent.change(options, { target: { value: 'High, Medium, Low' } });
    const req = screen.getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(req);

    fireEvent.click(screen.getByRole('button', { name: '新增欄位' }));

    expect(actions.addField).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        key: 'priority',
        label: 'Priority',
        type: 'select',
        options: ['High', 'Medium', 'Low'],
        required: true,
      })
    );
  });
});
