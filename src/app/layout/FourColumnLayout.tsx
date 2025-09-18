import React from 'react';

export const FourColumnLayout: React.FC<{
  organizationNav?: React.ReactNode;
  sidebar?: React.ReactNode;
  content?: React.ReactNode;
  tabsPanel?: React.ReactNode;
}> = ({ organizationNav, sidebar, content, tabsPanel }) => {
  return (
    <div className="flex h-full min-h-0">
      {/* Organization navigation - leftmost */}
      {organizationNav && (
        <div className="flex-shrink-0 p-4">
          <div className="rounded bg-[var(--panel)] h-full min-h-0 overflow-hidden">
            {organizationNav}
          </div>
        </div>
      )}

      {/* Main content area with three columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[250px_minmax(0,1fr)_280px] gap-4 h-full min-h-0 p-4">
        {/* Sidebar - collections */}
        <aside
          aria-label="Collections Sidebar"
          className="rounded p-4 bg-[var(--panel)] h-full min-h-0 overflow-visible"
        >
          {sidebar}
        </aside>

        {/* Main content */}
        <main
          aria-label="Content Area"
          className="rounded p-4 bg-[var(--panel)] h-full min-h-0 overflow-y-auto"
        >
          {content}
        </main>

        {/* Tabs panel */}
        <aside
          aria-label="Tabs Panel"
          className="rounded p-4 bg-[var(--panel)] h-full min-h-0 overflow-y-auto"
        >
          {tabsPanel}
        </aside>
      </div>
    </div>
  );
};