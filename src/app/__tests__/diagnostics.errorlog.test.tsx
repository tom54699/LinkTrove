import React from 'react';
import { describe, it, expect } from 'vitest';
import { ErrorLog } from '../diagnostics/ErrorLog';

describe('Diagnostics 9.1 ErrorLog', () => {
  it('records and exports errors', () => {
    ErrorLog.clear();
    ErrorLog.log(new Error('boom'), 'test');
    const list = ErrorLog.list();
    expect(list.length).toBeGreaterThan(0);
    const json = ErrorLog.export();
    expect(json).toContain('boom');
  });
});

