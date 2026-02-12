import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useEditableDialogCloseGuard } from '../useEditableDialogCloseGuard';

const DemoDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const guard = useEditableDialogCloseGuard(onClose);

  return (
    <div data-testid="overlay" {...guard.overlayProps}>
      <div data-testid="dialog" {...guard.dialogProps}>
        <input aria-label="name-input" />
      </div>
    </div>
  );
};

describe('useEditableDialogCloseGuard', () => {
  it('closes on pure overlay click', () => {
    const onClose = vi.fn();
    render(<DemoDialog onClose={onClose} />);

    const overlay = screen.getByTestId('overlay');
    fireEvent.mouseDown(overlay);
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when drag starts inside dialog and ends on overlay', () => {
    const onClose = vi.fn();
    render(<DemoDialog onClose={onClose} />);

    const overlay = screen.getByTestId('overlay');
    const input = screen.getByLabelText('name-input');

    fireEvent.mouseDown(input);
    fireEvent.click(overlay);

    expect(onClose).not.toHaveBeenCalled();
  });
});
