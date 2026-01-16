import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplatesProvider, useTemplates } from '../TemplatesProvider';

const storageMocks = vi.hoisted(() => ({
  loadTemplates: vi.fn(async () => [{ id: 't1', name: 'T1', fields: [] }]),
  saveTemplates: vi.fn(async () => {}),
  loadFromSync: vi.fn(async () => []),
}));

vi.mock('../../../background/storageService', () => ({
  createStorageService: () => ({
    loadTemplates: storageMocks.loadTemplates,
    saveTemplates: storageMocks.saveTemplates,
    loadFromSync: storageMocks.loadFromSync,
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

const Probe: React.FC = () => {
  const { actions } = useTemplates();
  const [err, setErr] = React.useState('');
  return (
    <div>
      <button
        onClick={() => {
          void actions
            .addField('t1', { key: '作者', label: '作者' })
            .catch((e: any) => setErr(e?.message || 'error'));
        }}
      >
        add invalid
      </button>
      <div data-testid="err">{err}</div>
    </div>
  );
};

describe('TemplatesProvider field key validation', () => {
  beforeEach(() => {
    setupChromeStub();
    storageMocks.loadTemplates.mockClear();
    storageMocks.saveTemplates.mockClear();
    storageMocks.loadFromSync.mockClear();
  });

  it('rejects invalid field key', async () => {
    render(
      <TemplatesProvider>
        <Probe />
      </TemplatesProvider>
    );

    fireEvent.click(screen.getByText('add invalid'));

    await waitFor(() => {
      expect(screen.getByTestId('err').textContent).toBe('欄位鍵只能包含英文字母、數字或底線');
    });
    expect(storageMocks.saveTemplates).not.toHaveBeenCalled();
  });
});
