import React from 'react';
import { useOpenTabs } from './OpenTabsProvider';
import { TabItem } from './TabItem';
import type { NativeTabGroup, TabItemData } from './types';
import { useI18n } from '../i18n';

// Helper to map native group colors
const getGroupColorInfo = (color: string) => {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    grey: { bg: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-500/20' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/20' },
    red: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/20' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/20' },
    pink: { bg: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-500/20' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/20' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/20' },
  };
  return map[color] || map.grey;
};

// Helper to get consistent window color based on index
const getWindowColorClass = (index: number) => {
  const colors = ['bg-pink-500', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500'];
  const borders = ['border-pink-500', 'border-blue-500', 'border-purple-500', 'border-emerald-500', 'border-orange-500'];
  return { 
    bg: colors[index % colors.length], 
    border: borders[index % borders.length] 
  };
};

export const TabsPanel: React.FC = () => {
  const { t } = useI18n();
  const { allTabs, nativeTabGroups, activeWindowId, actions } = useOpenTabs();
  const [collapsedWindows, setCollapsedWindows] = React.useState<Record<number, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<number, boolean>>({});
  const [editing, setEditing] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState('');

  const structure = React.useMemo(() => {
    const wins = new Map<number, { 
      tabs: TabItemData[]; 
      groups: Map<number, { group: NativeTabGroup; tabs: TabItemData[] }> 
    }>();

    for (const tab of allTabs) {
      if (!tab.url || 
          tab.url.startsWith('chrome:') || 
          tab.url.startsWith('edge:') || 
          tab.url.startsWith('about:') || 
          tab.url.startsWith('chrome-extension:')) {
        continue;
      }

      const wid = tab.windowId ?? -1;
      if (!wins.has(wid)) wins.set(wid, { tabs: [], groups: new Map() });
      const win = wins.get(wid)!;

      if (tab.nativeGroupId && tab.nativeGroupId > -1) {
        if (!win.groups.has(tab.nativeGroupId)) {
           const meta = nativeTabGroups.find(g => g.id === tab.nativeGroupId);
           if (meta) {
             win.groups.set(tab.nativeGroupId, { group: meta, tabs: [] });
           } else {
             win.tabs.push(tab);
             continue;
           }
        }
        win.groups.get(tab.nativeGroupId)!.tabs.push(tab);
      } else {
        win.tabs.push(tab);
      }
    }

    const sortedWindows = Array.from(wins.entries()).sort((a, b) => a[0] - b[0]);

    return sortedWindows.map(([wid, data], idx) => {
      data.tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const groupsArr = Array.from(data.groups.values()).map(g => {
        g.tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        return g;
      });

      return {
        id: wid,
        label: actions.getWindowLabel(wid) || `${t('window_title', 'Window')} ${idx + 1}`,
        looseTabs: data.tabs,
        groups: groupsArr,
        totalCount: data.tabs.length + groupsArr.reduce((acc, g) => acc + g.tabs.length, 0)
      };
    });
  }, [allTabs, nativeTabGroups, actions, t]);

  const toggleWindow = (wid: number) =>
    setCollapsedWindows((m) => ({ ...m, [wid]: !m[wid] }));

  const toggleGroup = (gid: number) =>
    setCollapsedGroups((m) => ({ ...m, [gid]: !m[gid] }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {structure.length === 0 && (
        <div className="opacity-40 text-xs px-1 italic">{t('no_open_tabs', 'No open tabs')}</div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {structure.map((win, idx) => {
          const isCollapsed = collapsedWindows[win.id];
          const isActive = activeWindowId === win.id;
          const winColor = getWindowColorClass(idx);
          
          return (
            <div key={win.id}>
              {/* Window Header */}
              <div
                className={`flex items-center gap-3 mb-2 px-1 cursor-pointer select-none group/win ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => toggleWindow(win.id)}
              >
                {/* Dot Toggle for Window with Dynamic Color */}
                <div className={`w-2 h-2 rounded-full border flex items-center justify-center transition-all ${winColor.border} ${isCollapsed ? 'bg-transparent' : winColor.bg}`}>
                   {!isCollapsed && <div className="w-0.5 h-0.5 rounded-full bg-[#282a36]"></div>}
                </div>
                
                {editing === win.id ? (
                  <input
                    className="flex-1 min-w-0 bg-[var(--bg)] border border-[var(--accent)] rounded px-1.5 py-0.5 text-[11px] text-[var(--fg)] outline-none"
                    value={editText}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => {
                      actions.setWindowLabel(win.id, editText.trim() || win.label);
                      setEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        actions.setWindowLabel(win.id, editText.trim() || win.label);
                        setEditing(null);
                      }
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                ) : (
                  <span className="text-[12px] font-bold text-[var(--fg)] uppercase tracking-tight truncate flex-1" title={win.label}>
                    {win.label}
                  </span>
                )}
                
                {editing !== win.id && (
                  <button
                    className="opacity-0 group-hover/win:opacity-100 text-[10px] text-[var(--muted)] hover:text-[var(--fg)] px-1 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(win.id);
                      setEditText(win.label);
                    }}
                  >
                    ✎
                  </button>
                )}
              </div>

              {/* Window Content */}
              {!isCollapsed && (
                <div className="space-y-3 pl-3">
                  
                  {/* Native Groups */}
                  {win.groups.map(({ group, tabs }) => {
                    const isGrpCollapsed = collapsedGroups[group.id] ?? group.collapsed;
                    const colorInfo = getGroupColorInfo(group.color);
                    
                    return (
                      <div key={group.id}>
                        {/* Group Header - Dot Only */}
                        <div 
                          className="flex items-center gap-2 mb-1.5 cursor-pointer select-none group/g hover:opacity-100 opacity-90"
                          onClick={() => toggleGroup(group.id)}
                        >
                          {/* Colored Dot acts as toggle indicator (Hollow when collapsed, Filled when expanded) */}
                          <div className={`w-1.5 h-1.5 rounded-full border ${isGrpCollapsed ? 'bg-transparent border-' + colorInfo.bg.split('-')[1] : colorInfo.bg + ' border-transparent'}`}></div>
                          
                          <span className={`text-[11px] font-bold ${colorInfo.text} uppercase tracking-tighter truncate flex-1`}>
                            {group.title || t('untitled_group', 'Untitled Group')}
                          </span>
                        </div>

                        {!isGrpCollapsed && (
                          <div className={`space-y-2 pl-3 border-l ${colorInfo.border}`}>
                            {tabs.map(tab => (
                              <TabItem 
                                key={tab.id} 
                                tab={tab} 
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Loose Tabs */}
                  {win.looseTabs.length > 0 && (
                     <div className="space-y-2 pt-1">
                        {win.looseTabs.map(tab => (
                          <TabItem 
                            key={tab.id} 
                            tab={tab} 
                          />
                        ))}
                     </div>
                  )}
                  
                  {win.totalCount === 0 && (
                     <div className="pl-2 text-[10px] opacity-30 italic py-1">{t('empty_window', 'Empty')}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
