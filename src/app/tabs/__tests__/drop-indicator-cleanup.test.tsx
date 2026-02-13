import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OpenTabsProvider } from '../OpenTabsProvider';
import { TabsPanel } from '../TabsPanel';
import * as dragContext from '../../dnd/dragContext';

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: any }) => children,
  LANGUAGE_OPTIONS: [],
}));

function createDataTransfer() {
  const data: Record<string, string> = {};
  return {
    setData: (type: string, val: string) => {
      data[type] = val;
    },
    getData: (type: string) => data[type],
    dropEffect: 'move',
    effectAllowed: 'all',
    files: [] as any,
    items: [] as any,
    types: [] as any,
    clearData: vi.fn(),
  } as unknown as DataTransfer;
}

describe('DropIndicator Cleanup (fix-tabs-panel-drop-indicator-cleanup)', () => {
  beforeEach(() => {
    // Reset drag context before each test
    dragContext.setDragTab(null);
    dragContext.setDragGroup(null);
  });

  afterEach(() => {
    // Clean up drag context after each test
    dragContext.setDragTab(null);
    dragContext.setDragGroup(null);
  });

  describe('isDragging state management', () => {
    it('sets isDragging=true on first dragOver detection', async () => {
      const { container } = render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0 },
            { id: 2, title: 'Tab B', url: 'https://b.com', favIconUrl: '', windowId: 1, index: 1 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      // Simulate drag start on Tab A
      const tabA = screen.getByText('Tab A').closest('div')!;
      const dt = createDataTransfer();
      fireEvent.dragStart(tabA, { dataTransfer: dt });

      // Set drag context (simulating dragStart)
      dragContext.setDragTab({ id: 1, title: 'Tab A', url: 'https://a.com' });

      // Trigger dragOver on Tab B (this should set isDragging=true)
      const tabB = screen.getByText('Tab B').closest('div')!;
      fireEvent.dragOver(tabB, {
        dataTransfer: dt,
        clientY: 100,
      });

      // DropIndicator should now be rendered (because isDragging=true)
      await waitFor(() => {
        const indicators = container.querySelectorAll('.h-\\[38px\\]'); // DropIndicator has h-[38px] class
        expect(indicators.length).toBeGreaterThan(0);
      });
    });

    it('clears isDragging on dragend event', async () => {
      const { container } = render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0 },
            { id: 2, title: 'Tab B', url: 'https://b.com', favIconUrl: '', windowId: 1, index: 1 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      // Start drag
      const tabA = screen.getByText('Tab A').closest('div')!;
      const dt = createDataTransfer();
      fireEvent.dragStart(tabA, { dataTransfer: dt });
      dragContext.setDragTab({ id: 1, title: 'Tab A', url: 'https://a.com' });

      // Trigger dragOver to set isDragging=true
      const tabB = screen.getByText('Tab B').closest('div')!;
      fireEvent.dragOver(tabB, { dataTransfer: dt, clientY: 100 });

      // Wait for DropIndicator to appear
      await waitFor(() => {
        const indicators = container.querySelectorAll('.h-\\[38px\\]');
        expect(indicators.length).toBeGreaterThan(0);
      });

      // Trigger global dragend event
      fireEvent.dragEnd(window);

      // DropIndicator should disappear (isDragging=false)
      await waitFor(() => {
        const indicators = container.querySelectorAll('.h-\\[38px\\]');
        expect(indicators.length).toBe(0);
      });
    });

    it('does not show DropIndicator when isDragging=false', () => {
      const { container } = render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0 },
            { id: 2, title: 'Tab B', url: 'https://b.com', favIconUrl: '', windowId: 1, index: 1 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      // No drag started, isDragging should be false
      // DropIndicator should not be rendered
      const indicators = container.querySelectorAll('.h-\\[38px\\]');
      expect(indicators.length).toBe(0);
    });
  });

  describe.skip('draggingGroupId state management (需要 Chrome API)', () => {
    // 這些測試需要完整的 Chrome API 支援來創建 native tab groups
    // 在實際環境中可以測試，但在單元測試環境中會失敗
    it('sets draggingGroupId on Group dragStart', async () => {
      const { container } = render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0, nativeGroupId: 10 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      // Find Group header
      const groupHeader = screen.getByText('Group 1').closest('div')!;

      // Check initial opacity
      expect(groupHeader.className).toContain('opacity-90');

      // Simulate Group dragStart
      const dt = createDataTransfer();
      fireEvent.dragStart(groupHeader, { dataTransfer: dt });

      // Group should now have opacity-20 (draggingGroupId is set)
      await waitFor(() => {
        expect(groupHeader.className).toContain('opacity-20');
        expect(groupHeader.className).not.toContain('opacity-90');
      });
    });

    it('clears draggingGroupId on Group dragEnd', async () => {
      const { container } = render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0, nativeGroupId: 10 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      const groupHeader = screen.getByText('Group 1').closest('div')!;
      const dt = createDataTransfer();

      // Start drag
      fireEvent.dragStart(groupHeader, { dataTransfer: dt });
      await waitFor(() => expect(groupHeader.className).toContain('opacity-20'));

      // End drag
      fireEvent.dragEnd(groupHeader);

      // Group should restore to opacity-90
      await waitFor(() => {
        expect(groupHeader.className).toContain('opacity-90');
        expect(groupHeader.className).not.toContain('opacity-20');
      });
    });

    it('clears draggingGroupId on global dragend', async () => {
      const { container } = render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0, nativeGroupId: 10 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      const groupHeader = screen.getByText('Group 1').closest('div')!;
      const dt = createDataTransfer();

      // Start drag
      fireEvent.dragStart(groupHeader, { dataTransfer: dt });
      await waitFor(() => expect(groupHeader.className).toContain('opacity-20'));

      // Trigger global dragend (e.g., drag cancelled by ESC or dragged outside)
      fireEvent.dragEnd(window);

      // Group should restore to opacity-90
      await waitFor(() => {
        expect(groupHeader.className).toContain('opacity-90');
        expect(groupHeader.className).not.toContain('opacity-20');
      });
    });
  });

  describe('dropTarget cleanup', () => {
    it('clears dropTarget on dragend event', async () => {
      const { container } = render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0 },
            { id: 2, title: 'Tab B', url: 'https://b.com', favIconUrl: '', windowId: 1, index: 1 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      const tabA = screen.getByText('Tab A').closest('div')!;
      const tabB = screen.getByText('Tab B').closest('div')!;
      const dt = createDataTransfer();

      // Start drag
      fireEvent.dragStart(tabA, { dataTransfer: dt });
      dragContext.setDragTab({ id: 1, title: 'Tab A', url: 'https://a.com' });

      // Trigger dragOver (sets dropTarget)
      fireEvent.dragOver(tabB, { dataTransfer: dt, clientY: 100 });

      // DropIndicator should appear
      await waitFor(() => {
        const indicators = container.querySelectorAll('.h-\\[38px\\]');
        expect(indicators.length).toBeGreaterThan(0);
      });

      // Trigger dragend
      fireEvent.dragEnd(window);

      // DropIndicator should disappear (dropTarget cleared)
      await waitFor(() => {
        const indicators = container.querySelectorAll('.h-\\[38px\\]');
        expect(indicators.length).toBe(0);
      });
    });
  });

  describe('Tab visual feedback', () => {
    it('applies opacity-20 when Tab is being dragged', async () => {
      render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      const tabA = screen.getByText('Tab A').closest('div')!;
      const dt = createDataTransfer();

      // Before drag: no opacity-20
      expect(tabA.className).not.toContain('opacity-20');

      // Start drag
      fireEvent.dragStart(tabA, { dataTransfer: dt });

      // During drag: has opacity-20
      await waitFor(() => {
        expect(tabA.className).toContain('opacity-20');
      });

      // End drag
      fireEvent.dragEnd(tabA);

      // After drag: opacity-20 removed
      await waitFor(() => {
        expect(tabA.className).not.toContain('opacity-20');
      });
    });
  });

  describe('Cross-region drag (中間 CardGrid 不受影響)', () => {
    it('中間 CardGrid 拖曳時右側 state 清理', async () => {
      const { container } = render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      // Simulate middle CardGrid drag (using dragWebpage)
      dragContext.setDragWebpage({ id: 'card-1', title: 'Card 1', url: 'https://card.com' });

      // Trigger global dragend (middle CardGrid drag ends)
      fireEvent.dragEnd(window);

      // Right side should clear its state (isDragging, dropTarget, draggingGroupId)
      // DropIndicator should not appear
      await waitFor(() => {
        const indicators = container.querySelectorAll('.h-\\[38px\\]');
        expect(indicators.length).toBe(0);
      });

      // Clean up
      dragContext.setDragWebpage(null);
    });
  });

  describe('DropIndicator rendering conditions', () => {
    it('requires both isDragging=true AND dropTarget to show DropIndicator', async () => {
      const { container } = render(
        <OpenTabsProvider
          initialTabs={[
            { id: 1, title: 'Tab A', url: 'https://a.com', favIconUrl: '', windowId: 1, index: 0 },
            { id: 2, title: 'Tab B', url: 'https://b.com', favIconUrl: '', windowId: 1, index: 1 },
          ]}
        >
          <TabsPanel />
        </OpenTabsProvider>
      );

      // Initially: no drag, no DropIndicator
      let indicators = container.querySelectorAll('.h-\\[38px\\]');
      expect(indicators.length).toBe(0);

      // Start drag but don't trigger dragOver (no dropTarget)
      const tabA = screen.getByText('Tab A').closest('div')!;
      const dt = createDataTransfer();
      fireEvent.dragStart(tabA, { dataTransfer: dt });
      dragContext.setDragTab({ id: 1, title: 'Tab A', url: 'https://a.com' });

      // Still no DropIndicator (no dropTarget yet)
      indicators = container.querySelectorAll('.h-\\[38px\\]');
      expect(indicators.length).toBe(0);

      // Trigger dragOver (sets dropTarget AND isDragging)
      const tabB = screen.getByText('Tab B').closest('div')!;
      fireEvent.dragOver(tabB, { dataTransfer: dt, clientY: 100 });

      // Now DropIndicator should appear
      await waitFor(() => {
        indicators = container.querySelectorAll('.h-\\[38px\\]');
        expect(indicators.length).toBeGreaterThan(0);
      });
    });
  });
});
