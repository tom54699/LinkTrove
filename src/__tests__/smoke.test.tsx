import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

describe('smoke', () => {
  it('renders a simple element', () => {
    const { getByText } = render(<div>Hello</div>);
    expect(getByText('Hello')).toBeInTheDocument();
  });
});

