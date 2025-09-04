import React from 'react';

export const ThreeColumnLayout: React.FC<{
  sidebar?: React.ReactNode;
  content?: React.ReactNode;
  tabsPanel?: React.ReactNode;
}> = ({ sidebar, content, tabsPanel }) => {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)_250px] gap-4 h-full min-h-0"
      data-testid="three-col"
    >
      <aside
        aria-label="Sidebar"
        className="rounded p-4 bg-[var(--panel)] h-full min-h-0 overflow-hidden"
      >
        {sidebar}
      </aside>
      <main
        aria-label="Content Area"
        className="rounded p-4 h-full min-h-0 overflow-auto"
      >
        {content}
      </main>
      <aside
        aria-label="Open Tabs"
        className="rounded p-4 bg-[var(--panel)] h-full min-h-0 overflow-y-auto"
      >
        {tabsPanel}
      </aside>
    </div>
  );
};
