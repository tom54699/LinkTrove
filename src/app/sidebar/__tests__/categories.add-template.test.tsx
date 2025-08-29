import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CategoriesProvider, useCategories } from '../categories';

const Probe: React.FC = () => {
  const { categories, actions } = useCategories();
  React.useEffect(() => {
    (async () => {
      const cat = await actions.addCategory('MyCat', '#123456');
      await actions.setDefaultTemplate(cat.id, 't_custom');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <pre data-testid="cats">{JSON.stringify(categories)}</pre>;
};

describe('Categories add with custom template', () => {
  it('keeps newly added category when applying a custom template', async () => {
    render(
      <CategoriesProvider>
        <Probe />
      </CategoriesProvider>
    );

    await waitFor(() => {
      const el = screen.getByTestId('cats');
      const cats = JSON.parse(el.textContent || '[]');
      const created = cats.find((c: any) => c.name === 'MyCat');
      expect(created).toBeTruthy();
      expect(created.defaultTemplateId).toBe('t_custom');
    });
  });
});

