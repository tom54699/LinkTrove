import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreeColumnLayout } from '../layout/ThreeColumn';

describe('ThreeColumnLayout (task 3.2)', () => {
  it('renders three regions: sidebar, content, tabs', () => {
    render(
      <ThreeColumnLayout
        sidebar={<div>SB</div>}
        content={<div>CT</div>}
        tabsPanel={<div>TP</div>}
      />
    );
    expect(screen.getByLabelText('Sidebar')).toBeInTheDocument();
    expect(screen.getByLabelText('Content Area')).toBeInTheDocument();
    expect(screen.getByLabelText('Open Tabs')).toBeInTheDocument();
  });
});

