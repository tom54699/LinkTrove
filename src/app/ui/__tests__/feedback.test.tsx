import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FeedbackProvider, useFeedback, ErrorBoundary } from '../feedback';
import { CardGrid } from '../../webpages/CardGrid';

describe('Feedback (task 9)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows toast notifications and auto-dismisses', () => {
    const Button: React.FC = () => {
      const { showToast } = useFeedback();
      return (
        <button onClick={() => showToast('Saved!', 'success')}>Toast</button>
      );
    };

    render(
      <FeedbackProvider>
        <Button />
      </FeedbackProvider>
    );

    fireEvent.click(screen.getByText('Toast'));
    expect(screen.getByText('Saved!')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('catches errors with ErrorBoundary and shows fallback', () => {
    const Boom: React.FC = () => {
      throw new Error('boom');
    };
    render(
      <FeedbackProvider>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </FeedbackProvider>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('shows global loading indicator when active', () => {
    const Trigger: React.FC = () => {
      const { setLoading } = useFeedback();
      return <button onClick={() => setLoading(true)}>Start Loading</button>;
    };
    render(
      <FeedbackProvider>
        <Trigger />
      </FeedbackProvider>
    );
    fireEvent.click(screen.getByText('Start Loading'));
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('shows a toast when drop handler throws', () => {
    const onDropTab = vi.fn(() => {
      throw new Error('fail add');
    });
    render(
      <FeedbackProvider>
        <CardGrid onDropTab={onDropTab} />
      </FeedbackProvider>
    );
    const zone = screen.getByTestId('drop-zone');
    const dt = {
      getData: (t: string) =>
        t === 'application/x-linktrove-tab'
          ? JSON.stringify({ id: 1, title: 't', url: 'https://t' })
          : '',
    } as any as DataTransfer;
    fireEvent.drop(zone, { dataTransfer: dt });
    expect(screen.getByText(/failed to add tab/i)).toBeInTheDocument();
  });
});
