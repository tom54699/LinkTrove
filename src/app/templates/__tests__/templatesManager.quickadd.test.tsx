import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../TemplatesProvider', () => {
  const addField = vi.fn();
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

import { TemplatesManager } from '../TemplatesManager';

describe('TemplatesManager quick-add common fields', () => {
  it('adds selected common field (always text) with required', async () => {
    render(<TemplatesManager />);
    const selectCommon = screen.getByTitle('選擇常用欄位') as HTMLSelectElement;
    const required = screen.getByLabelText('required') as HTMLInputElement;

    fireEvent.change(selectCommon, { target: { value: 'author' } });
    fireEvent.click(required);

    const addBtn = screen.getByTitle('新增常用欄位');
    fireEvent.click(addBtn);

    const { useTemplates } = await import('../TemplatesProvider');
    const { actions } = useTemplates();
    expect(actions.addField).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ key: 'author', label: '作者', type: 'text' })
    );
    expect(actions.updateFieldRequired).toHaveBeenCalledWith(
      't1',
      'author',
      true
    );
  });

  it('adds custom field with type/options/required', async () => {
    render(<TemplatesManager />);
    const key = screen.getByPlaceholderText(
      'key (e.g. author)'
    ) as HTMLInputElement;
    const label = screen.getByPlaceholderText('label') as HTMLInputElement;
    const typeSel = screen.getAllByRole('combobox')[2] as HTMLSelectElement; // third select in the row

    fireEvent.change(key, { target: { value: 'priority' } });
    fireEvent.change(label, { target: { value: 'Priority' } });
    fireEvent.change(typeSel, { target: { value: 'select' } });
    const options = screen.getByPlaceholderText(
      'options (comma-separated)'
    ) as HTMLInputElement;
    fireEvent.change(options, { target: { value: 'High, Medium, Low' } });
    const req = screen.getByLabelText('required') as HTMLInputElement;
    fireEvent.click(req);

    fireEvent.click(screen.getByText('Add Field'));

    const { useTemplates } = await import('../TemplatesProvider');
    const { actions } = useTemplates();
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
