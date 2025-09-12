import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isDebug, dbg } from './debug';

describe('utils/debug', () => {
  const key = 'dnd';
  const flag = `lt:${key}:debug`;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isDebug returns false by default', () => {
    expect(isDebug()).toBe(false);
  });

  it('isDebug returns true when flag is enabled', () => {
    localStorage.setItem(flag, '1');
    expect(isDebug()).toBe(true);
  });

  it('isDebug supports custom key', () => {
    localStorage.setItem('lt:foo:debug', '1');
    expect(isDebug('foo')).toBe(true);
    expect(isDebug('bar')).toBe(false);
  });

  it('dbg logs only when debug enabled', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    dbg(key, 'hidden');
    expect(spy).not.toHaveBeenCalled();

    localStorage.setItem(flag, '1');
    dbg(key, 'shown', 123);
    expect(spy).toHaveBeenCalledTimes(1);
    const [firstCall] = spy.mock.calls;
    expect(firstCall[0]).toContain('[lt:dnd]');
    expect(firstCall.slice(1)).toEqual(['shown', 123]);
  });
});

