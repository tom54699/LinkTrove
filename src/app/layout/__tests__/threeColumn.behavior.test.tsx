import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreeColumnLayout } from '../../layout/ThreeColumn';

describe('ThreeColumnLayout behavior (scroll and sizing)', () => {
  it('applies fixed height columns with right column scroll', () => {
    render(
      <div style={{ height: '600px' }}>
        <div
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ flex: '0 0 auto' }}>Header</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
            <ThreeColumnLayout
              sidebar={<div>SB</div>}
              content={<div>CT</div>}
              tabsPanel={<div>TP</div>}
            />
          </div>
        </div>
      </div>
    );

    const grid = screen.getByTestId('three-col');
    expect(grid.className).toMatch(/h-full/);
    expect(grid.className).toMatch(/min-h-0/);

    const left = screen.getByLabelText('Sidebar');
    expect(left.className).toMatch(/h-full/);
    expect(left.className).toMatch(/overflow-hidden/);

    const mid = screen.getByLabelText('Content Area');
    expect(mid.className).toMatch(/overflow-auto/);

    const right = screen.getByLabelText('Open Tabs');
    expect(right.className).toMatch(/overflow-y-auto/);
    expect(right.className).toMatch(/h-full/);
  });
});
