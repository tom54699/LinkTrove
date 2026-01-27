import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrganizationsProvider } from '../organizations';
import { OrganizationNav } from '../OrganizationNav';
import { putAll, getAll } from '../../../background/idb/db';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

vi.mock('../../ui/feedback', () => ({
  useFeedback: () => ({
    showToast: vi.fn(),
    setLoading: vi.fn(),
  }),
}));

function setupChromeStub() {
  const g: any = globalThis as any;
  if (!g.chrome) g.chrome = {} as any;
  if (!g.chrome.storage) g.chrome.storage = {} as any;
  if (!g.chrome.storage.local)
    g.chrome.storage.local = {
      get: (defaults: any, cb: (res: any) => void) => cb({ ...defaults }),
      set: (_items: any, _cb?: () => void) => _cb?.(),
      clear: (_cb?: () => void) => _cb?.(),
    } as any;
}

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

describe('OrganizationNav manage dialog autosave', () => {
  beforeEach(async () => {
    await resetDb();
    setupChromeStub();
  });

  it('auto-saves organization name on blur', async () => {
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Personal', color: '#111111', order: 0, isDefault: true },
      { id: 'o_b', name: 'Work', color: '#222222', order: 1 },
    ] as any);

    render(
      <OrganizationsProvider>
        <OrganizationNav />
      </OrganizationsProvider>
    );

    fireEvent.click(screen.getByTitle('menu_manage_orgs'));

    const nameInput = await screen.findByDisplayValue('Personal');
    fireEvent.change(nameInput, { target: { value: 'Personal X' } });
    fireEvent.blur(nameInput);

    await waitFor(async () => {
      const orgsInDb = (await getAll('organizations' as any)) as any[];
      expect(orgsInDb.find((o: any) => o.id === 'o_a')?.name).toBe('Personal X');
    });
  });

  it('auto-saves organization color on change', async () => {
    await putAll('organizations' as any, [
      { id: 'o_a', name: 'Personal', color: '#111111', order: 0, isDefault: true },
      { id: 'o_b', name: 'Work', color: '#222222', order: 1 },
    ] as any);

    render(
      <OrganizationsProvider>
        <OrganizationNav />
      </OrganizationsProvider>
    );

    fireEvent.click(screen.getByTitle('menu_manage_orgs'));

    const colorInputs = await screen.findAllByLabelText('org_color_label');
    fireEvent.change(colorInputs[0], { target: { value: '#ff0000' } });

    await waitFor(async () => {
      const orgsInDb = (await getAll('organizations' as any)) as any[];
      expect(orgsInDb.find((o: any) => o.id === 'o_a')?.color).toBe('#ff0000');
    });
  });
});
