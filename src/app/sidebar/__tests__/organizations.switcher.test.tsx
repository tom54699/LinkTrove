import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrganizationsProvider, useOrganizations } from '../organizations';
import { putAll } from '../../../background/idb/db';

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

const Harness: React.FC = () => {
  const { selectedOrgId, setCurrentOrganization } = useOrganizations();
  return (
    <div>
      <div data-testid="sel">{selectedOrgId}</div>
      <button onClick={() => setCurrentOrganization('o_b')}>swap</button>
    </div>
  );
};

describe('OrganizationsProvider basic switch', () => {
  it('switches selected org id via context', async () => {
    setupChromeStub();
    // seed orgs
    await putAll('organizations' as any, [
      { id: 'o_default', name: 'Personal', order: 0 },
      { id: 'o_b', name: 'Team', order: 1 },
    ] as any);
    render(
      <OrganizationsProvider>
        <Harness />
      </OrganizationsProvider>
    );
    const sel = await screen.findByTestId('sel');
    expect(sel.textContent === 'o_default' || sel.textContent === 'o_b').toBe(true);
    fireEvent.click(screen.getByText('swap'));
    expect((await screen.findByTestId('sel')).textContent).toBe('o_b');
  });
});

