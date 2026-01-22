import React, { useState } from 'react';

export const FourColumnLayout: React.FC<{
  organizationNav?: React.ReactNode;
  sidebar?: React.ReactNode;
  content?: React.ReactNode;
  tabsPanel?: React.ReactNode;
}> = ({ organizationNav, sidebar, content, tabsPanel }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    try {
      return localStorage.getItem('linktrove-sidebar-pinned') === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('linktrove-sidebar-pinned', String(isPinned));
    } catch {}
  }, [isPinned]);

  return (
    <div className="h-full min-h-0 bg-[var(--bg)] text-[var(--fg)] flex overflow-hidden">
      
      {/* Left Area: Contains Rail, Sidebar, Main with padding */}
      <div className="flex-1 flex min-w-0 p-4 gap-4">

        {/* Left Panel: Collapsible Organization Rail + Collections Sidebar */}
        <div
          className={`flex gap-4 transition-all duration-300 ease-out flex-shrink-0
            ${sidebarCollapsed ? 'w-3 !gap-0' : 'w-[348px]'}`}
        >
          {/* Collapsed: Edge Handle */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="flex-shrink-0 w-3 h-10 self-center flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 rounded transition-colors"
              title="Show Sidebar"
            >
              »
            </button>
          )}

          {/* 1. Organization Rail (Leftmost) */}
          <div
            className={`flex-shrink-0 bg-[var(--panel)] border border-white/5 rounded-2xl shadow-sm flex flex-col items-center py-4 transition-all duration-300 ease-out overflow-hidden
              ${sidebarCollapsed ? 'w-0 opacity-0 border-0' : 'w-[72px] opacity-100'}`}
          >
            {organizationNav}
          </div>

          {/* 2. Collections Sidebar */}
          <div
            className={`flex flex-col h-full bg-[var(--panel)] border border-white/5 rounded-2xl transition-all duration-300 ease-out overflow-hidden
              ${sidebarCollapsed ? 'w-0 opacity-0 border-0' : 'w-[260px] opacity-100'}`}
          >
            {/* Sidebar Header with Collapse Button */}
            <div className="flex-shrink-0 px-4 pt-3 pb-1 flex items-center justify-between whitespace-nowrap">
              <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Collections</span>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 rounded transition-colors"
                title="Hide Sidebar"
              >
                «
              </button>
            </div>
            <aside
              aria-label="Collections Sidebar"
              className="flex-1 px-4 pb-4 overflow-y-auto"
            >
              {sidebar}
            </aside>
          </div>
        </div>

        {/* 3. Main Content */}
        <main
          aria-label="Content Area"
          className="flex-1 bg-[var(--panel)] border border-white/5 rounded-2xl overflow-hidden relative shadow-sm flex flex-col min-w-0"
        >
          <div className="flex-1 overflow-y-auto p-6">
            {content}
          </div>
        </main>

      </div>

      {/* 4. Tabs Panel (Auto-Expand, Flush Right, Full Height) */}
      <aside
        aria-label="Tabs Panel"
        className={`h-full bg-[var(--panel)] border-l border-white/10 shadow-xl
                   transition-[width] duration-300 ease-out 
                   overflow-hidden flex flex-col items-center group/tabs z-50
                   flex-shrink-0 ${isPinned ? 'w-[300px] items-stretch' : 'w-[50px] hover:w-[300px] hover:items-stretch'}`}
      >
        <div className="w-full h-full flex flex-col relative">
           {/* Expanded State */}
           <div className={`${isPinned ? 'flex' : 'hidden group-hover/tabs:flex'} flex-col h-full p-4 overflow-y-auto`}>
             <div className="flex justify-end mb-2">
               <button
                 onClick={() => setIsPinned(!isPinned)}
                 className={`p-1 rounded transition-colors ${isPinned ? 'text-pink-500 bg-pink-500/10' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5'}`}
                 title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
               >
                 {isPinned ? '📍' : '📌'}
               </button>
             </div>
             {tabsPanel}
           </div>
           
           {/* Collapsed State */}
           <div className={`${isPinned ? 'hidden' : 'group-hover/tabs:hidden'} flex flex-col h-full items-center pt-6 gap-4`}>
             <div className="text-[10px] font-bold text-[var(--muted)] [writing-mode:vertical-rl] rotate-180 tracking-widest uppercase opacity-40">
               Open Tabs
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-pink-500/30"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30"></div>
           </div>
        </div>
      </aside>
    </div>
  );
};