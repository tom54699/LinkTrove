import React from 'react';

type DivHandlers = Pick<
  React.HTMLAttributes<HTMLDivElement>,
  'onMouseDown' | 'onClick'
>;

export function useEditableDialogCloseGuard(onClose: () => void): {
  overlayProps: DivHandlers;
  dialogProps: DivHandlers;
} {
  const startedInsideDialogRef = React.useRef(false);

  const handleOverlayMouseDown = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        startedInsideDialogRef.current = false;
      }
    },
    []
  );

  const handleOverlayClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (!startedInsideDialogRef.current) onClose();
      startedInsideDialogRef.current = false;
    },
    [onClose]
  );

  const handleDialogMouseDown = React.useCallback(
    (_e: React.MouseEvent<HTMLDivElement>) => {
      startedInsideDialogRef.current = true;
    },
    []
  );

  const handleDialogClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
    },
    []
  );

  return {
    overlayProps: {
      onMouseDown: handleOverlayMouseDown,
      onClick: handleOverlayClick,
    },
    dialogProps: {
      onMouseDown: handleDialogMouseDown,
      onClick: handleDialogClick,
    },
  };
}
