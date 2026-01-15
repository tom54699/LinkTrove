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
        
        {/* 1. Organization Rail (Leftmost) */}
        <div className="w-[72px] flex-shrink-0 bg-[var(--panel)] border border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col items-center py-4">
          {organizationNav}
        </div>

        {/* 2. Collections Sidebar (Collapsible) */}
        <div className={`flex flex-col h-full transition-all duration-300 overflow-hidden bg-[var(--panel)] border border-white/5 rounded-2xl ${sidebarCollapsed ? 'w-0 opacity-0 -ml-4 border-0' : 'w-[260px] opacity-100'}`}>
          <aside
            aria-label="Collections Sidebar"
            className="h-full p-4 overflow-y-auto"
          >
            {sidebar}
          </aside>
        </div>
        
        {/* 3. Main Content */}
        <main
          aria-label="Content Area"
          className="flex-1 bg-[var(--panel)] border border-white/5 rounded-2xl overflow-hidden relative shadow-sm flex flex-col min-w-0"
        >
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute left-4 top-4 p-1 text-[var(--muted)] hover:text-[var(--text)] z-10 hover:bg-white/5 rounded-md transition-colors"
            title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
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