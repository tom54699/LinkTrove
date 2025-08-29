import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from '../App';

describe('Settings SyncPanel (8.x)', () => {
  it('renders Sync & Backup panel and simulates actions', () => {
    render(<Settings />);
    const btn = screen.getByText('Backup Now');
    fireEvent.click(btn);
    expect(screen.getByText('FS: export')).toBeInTheDocument();
  });
});

