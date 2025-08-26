import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OpenTabsProvider } from '../tabs/OpenTabsProvider';
import { TabsPanel } from '../tabs/TabsPanel';
import { CardGrid } from '../webpages/CardGrid';
import { FeedbackProvider } from '../ui/feedback';
import { createWebpageService } from '../../background/webpageService';
import type { WebpageCardData } from '../webpages/WebpageCard';

declare global {
  var chrome: any;
}

function mockStorageArea() {
  const store: Record<string, any> = {};
  return {
    get: (keys?: any, cb?: any) => {
      let result: any = {};
      if (!keys) result = { ...store };
      else if (typeof keys === 'string') result[keys] = store[keys];
      else if (Array.isArray(keys)) keys.forEach((k) => (result[k] = store[k]));
      else if (typeof keys === 'object') {
        result = { ...keys, ...store };
      }
      cb && cb(result);
    },
    set: (items: any, cb?: any) => {
      Object.assign(store, items);
      cb && cb();
    },
    clear: (cb?: any) => {
      Object.keys(store).forEach((k) => delete store[k]);
      cb && cb();
    },
  };
}

function createDataTransfer() {
  const data: Record<string, string> = {};
  return {
    setData: (type: string, val: string) => {
      data[type] = val;
    },
    getData: (type: string) => data[type],
    dropEffect: 'move',
    effectAllowed: 'all',
    files: [] as any,
    items: [] as any,
    types: [] as any,
  } as DataTransfer;
}

beforeEach(() => {
  globalThis.chrome = {
    storage: { local: mockStorageArea(), sync: mockStorageArea() },
  } as any;
});

describe('Drag-drop integration (task 12)', () => {
  it('drags from TabsPanel and drops into CardGrid to save webpage', async () => {
    const svc = createWebpageService();
    const App: React.FC = () => {
      const [items, setItems] = React.useState<WebpageCardData[]>([]);
      return (
        <div>
          <OpenTabsProvider
            initialTabs={[
              { id: 1, title: 'Drag Me', url: 'https://ex', favIconUrl: '' },
            ]}
          >
            <div style={{ display: 'flex', gap: 16 }}>
              <TabsPanel />
              <CardGrid
                items={items}
                onDropTab={async (tab) => {
                  const created = await svc.addWebpageFromTab(tab as any);
                  setItems([
                    {
                      id: created.id,
                      title: created.title,
                      url: created.url,
                      favicon: created.favicon,
                      note: created.note,
                    },
                  ]);
                }}
              />
            </div>
          </OpenTabsProvider>
        </div>
      );
    };

    render(
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    );
    const item = screen.getAllByText('Drag Me')[0].closest('div')!; // the tab item
    const zone = screen.getByTestId('drop-zone');
    const dt = createDataTransfer();
    await act(async () => {
      fireEvent.dragStart(item, { dataTransfer: dt });
      fireEvent.drop(zone, { dataTransfer: dt });
    });
    // Webpage card should appear with the saved title
    expect(screen.getAllByText('Drag Me').length).toBeGreaterThan(1);
  });
});
