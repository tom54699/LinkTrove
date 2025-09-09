import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WebpagesProvider, useWebpages } from '../../webpages/WebpagesProvider';
import { CategoriesProvider, useCategories } from '../../sidebar/categories';

const Harness: React.FC = () => {
  const { actions: pageActions, items } = useWebpages();
  const { actions: catActions, setCurrentCategory, categories } = useCategories() as any;
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    (async () => {
      // Create a new collection and switch to it
      const cat = await catActions.addCategory('Work', '#0f0');
      setCurrentCategory(cat.id);
      // Add a webpage from a tab
      await pageActions.addFromTab({
        id: 1,
        title: 'Example',
        url: 'https://example.com',
        favIconUrl: '',
      } as any);
      setReady(true);
    })();
  }, []);
  return (
    <div>
      <pre data-testid="items">{JSON.stringify(items)}</pre>
      <pre data-testid="cats">{JSON.stringify(categories)}</pre>
      <div>{ready ? 'ready' : 'pending'}</div>
    </div>
  );
};

describe('addFromTab assigns current collection', () => {
  it('creates webpage under selected category', async () => {
    render(
      <CategoriesProvider>
        <WebpagesProvider>
          <Harness />
        </WebpagesProvider>
      </CategoriesProvider>
    );
    // Wait for async effect to complete
    await screen.findByText('ready');
    const items = JSON.parse(screen.getByTestId('items').textContent || '[]');
    const cats = JSON.parse(screen.getByTestId('cats').textContent || '[]');
    const created = items[0];
    // Ensure it saved and belongs to the newly created category (not default)
    expect(created).toBeTruthy();
    const newCat = cats.find((c: any) => c.name === 'Work');
    expect(created.category).toBe(newCat.id);
  });
});

