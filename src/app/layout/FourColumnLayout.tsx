import React, { useState } from 'react';
import { useOpenTabs } from '../tabs/OpenTabsProvider';

export const FourColumnLayout: React.FC<{
  organizationNav?: React.ReactNode;
  sidebar?: React.ReactNode;
  content?: React.ReactNode;
  tabsPanel?: React.ReactNode;
}> = ({ organizationNav, sidebar, content, tabsPanel }) => {
  const { allTabs, totalTabCount } = useOpenTabs();
  
  // Calculate window count and color logic consistent with TabsPanel
  const windowIds = Array.from(new Set(allTabs.map(t => t.windowId).filter(id => typeof id === 'number'))).sort((a, b) => a! - b!);
  const winColors = ['bg-pink-500/40', 'bg-blue-500/40', 'bg-purple-500/40', 'bg-emerald-500/40', 'bg-orange-500/40'];

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
      
      {/* Left Area */}
      <div className="flex-1 flex min-w-0 p-4 gap-4">
        {/* Left Panel */}
        <div
          className={`flex gap-4 transition-all duration-300 ease-out flex-shrink-0
            ${sidebarCollapsed ? 'w-3 !gap-0' : 'w-[348px]'}`}
        >
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="flex-shrink-0 w-3 h-10 self-center flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 rounded transition-colors"
              title="Show Sidebar"
            >
              »
            </button>
          )}

          <div
            className={`flex-shrink-0 bg-[var(--panel)] border border-white/5 rounded-2xl shadow-sm flex flex-col items-center py-4 transition-all duration-300 ease-out overflow-hidden
              ${sidebarCollapsed ? 'w-0 opacity-0 border-0' : 'w-[72px] opacity-100'}`}
          >
            {organizationNav}
          </div>

          <div
            className={`flex flex-col h-full bg-[var(--panel)] border border-white/5 rounded-2xl transition-all duration-300 ease-out overflow-hidden
              ${sidebarCollapsed ? 'w-0 opacity-0 border-0' : 'w-[260px] opacity-100'}`}
          >
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
            <aside aria-label="Collections Sidebar" className="flex-1 px-4 pb-4 overflow-y-auto">
              {sidebar}
            </aside>
          </div>
        </div>

        {/* Main Content */}
        <main
          aria-label="Content Area"
          className="flex-1 bg-[var(--panel)] border border-white/5 rounded-2xl overflow-hidden relative shadow-sm flex flex-col min-w-0"
        >
          <div className="flex-1 overflow-y-auto p-6">
            {content}
          </div>
        </main>
      </div>

      {/* 4. Tabs Panel (Right Sidebar) */}
      <aside
        aria-label="Tabs Panel"
        className={`h-full bg-[var(--panel)] border-l border-white/10 shadow-xl
                   transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] 
                   overflow-hidden flex flex-col group/tabs z-50 relative
                   flex-shrink-0 ${isPinned ? 'w-[300px]' : 'w-[50px] hover:w-[300px]'}`}
      >
        
        {/* Header Area (Fixed Height) */}
        <div className="absolute top-0 left-0 w-full h-14 z-20 pointer-events-none">
           {/* Rotating Title */}
           <div 
             className={`
               absolute left-0 top-0 h-14 flex items-center pl-5
               text-[11px] font-black text-[#6272a4] uppercase tracking-widest whitespace-nowrap
               transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
               origin-[25px_28px]
               ${isPinned 
                 ? 'rotate-0 translate-x-0 translate-y-0 opacity-100' 
                 : 'group-hover/tabs:rotate-0 group-hover/tabs:translate-x-0 group-hover/tabs:translate-y-0 group-hover/tabs:opacity-100 -rotate-90 -translate-x-[2px] translate-y-16 opacity-100'}
             `}
           >
             OPEN TABS
           </div>

           {/* Pin Button (Only visible when expanded) */}
           <div 
             className={`
               absolute right-4 top-0 h-14 flex items-center pointer-events-auto
               transition-opacity duration-200
               ${isPinned ? 'opacity-100' : 'opacity-0 group-hover/tabs:opacity-100 delay-100'}
             `}
           >
             <button
               onClick={() => setIsPinned(!isPinned)}
               className={`p-1.5 rounded transition-colors ${isPinned ? 'text-pink-500 bg-pink-500/10' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5'}`}
               title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
             >
               {isPinned ? '📍' : '📌'}
             </button>
           </div>
        </div>

        {/* Content Scrollable Area */}
        <div 
          className={`w-full h-full flex flex-col pt-14 transition-opacity duration-300 ${isPinned ? 'opacity-100 delay-100' : 'opacity-0 group-hover/tabs:opacity-100 group-hover/tabs:delay-100'}`}
        >
           <div className="flex flex-col h-full px-4 pb-4 overflow-y-auto border-t border-white/5">
             {tabsPanel}
           </div>
        </div>

        {/* Collapsed Visual Cues (Dots) */}
        <div className={`absolute top-40 left-0 w-[50px] flex flex-col items-center gap-4 transition-opacity duration-200 ${isPinned ? 'opacity-0' : 'group-hover/tabs:opacity-0 opacity-100'}`}>
             {windowIds.slice(0, 5).map((_, i) => (
               <div key={i} className={`w-1.5 h-1.5 rounded-full ${winColors[i % winColors.length]}`}></div>
             ))}
        </div>

      </aside>
    </div>
  );
};
