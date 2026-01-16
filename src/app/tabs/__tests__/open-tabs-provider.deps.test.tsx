import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { OpenTabsProvider } from '../OpenTabsProvider';

function setupChromeStub(connectSpy: ReturnType<typeof vi.fn>) {
  const g: any = globalThis as any;
  g.chrome = {
    runtime: {
      connect: connectSpy,
    },
    storage: {
      local: {
        get: (defaults: any, cb: (res: any) => void) => cb({ ...defaults }),
        set: (_items: any, _cb?: () => void) => _cb?.(),
      },
    },
  } as any;
}

describe('OpenTabsProvider dependency safety', () => {
  beforeEach(() => {
    const port = {
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      postMessage: vi.fn(),
      disconnect: vi.fn(),
    };
    const connectSpy = vi.fn(() => port);
    setupChromeStub(connectSpy);
  });

  it('does not reconnect runtime port when window labels update', async () => {
    let ctx: any;
    render(
      <OpenTabsProvider expose={(value) => { ctx = value; }}>
        <div />
      </OpenTabsProvider>
    );

    const connectSpy = (globalThis as any).chrome.runtime.connect as ReturnType<typeof vi.fn>;
    await waitFor(() => {
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(ctx).toBeTruthy();
    });

    act(() => {
      ctx.actions.setWindowLabel(1, 'Work');
    });

    await Promise.resolve();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });
});
