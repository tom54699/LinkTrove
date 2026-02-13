import React from 'react';
import { useOpenTabs } from './OpenTabsProvider';
import { TabItem } from './TabItem';
import type { NativeTabGroup, TabItemData } from './types';
import { useI18n } from '../i18n';
import { DRAG_TYPES, setDragTab, setDragGroup, getDragTab, getDragGroup } from '../dnd/dragContext';

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

const DropIndicator: React.FC<{ 
  type: 'tab' | 'group'; 
  id: number; 
  position: 'top' | 'bottom' | 'inside'; 
  onDrop: (e: React.DragEvent) => void; 
  setDropTarget: (target: any) => void; 
}> = ({ type, id, position, onDrop, setDropTarget }) => (
  <div 
    className="h-[38px] w-full relative z-10 my-1 rounded border transition-all duration-200 shrink-0"
    style={{
      backgroundColor: 'rgba(68, 71, 90, 0.4)', // #44475a with 40% opacity
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderStyle: 'solid',
      borderWidth: '1px'
    }}
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTarget({ type, id, position });
    }}
    onDrop={onDrop}
  >
    <div className="absolute inset-0 rounded bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
  </div>
);

export const TabsPanel: React.FC = () => {
  const { t } = useI18n();
  const { allTabs, nativeTabGroups, activeWindowId, actions } = useOpenTabs();
  const [collapsedWindows, setCollapsedWindows] = React.useState<Record<number, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<number, boolean>>({});
  const [editing, setEditing] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState('');

  // Reactive isDragging state (set in handleDragOver, cleared on dragend)
  const [isDragging, setIsDragging] = React.useState(false);

  // Track dragging group for visual feedback
  const [draggingGroupId, setDraggingGroupId] = React.useState<number | null>(null);

  const [dropTarget, setDropTarget] = React.useState<{
    type: 'tab' | 'group';
    id: number; // tabId or groupId
    position: 'top' | 'bottom' | 'inside';
  } | null>(null);

  // Global dragend cleanup: clear dropTarget, isDragging, and draggingGroupId when drag ends
  // Note: Only listen to dragend, NOT drop (drop needs dropTarget for handleDrop logic)
  React.useEffect(() => {
    const cleanup = () => {
      setDropTarget(null);
      setIsDragging(false);
      setDraggingGroupId(null);
    };

    window.addEventListener('dragend', cleanup, true);

    return () => {
      window.removeEventListener('dragend', cleanup, true);
    };
  }, []);

  const structure = React.useMemo(() => {
    const wins = new Map<number, { 
      tabs: TabItemData[]; 
      groups: Map<number, { group: NativeTabGroup; tabs: TabItemData[] }> 
    }>();

    for (const tab of allTabs) {
       const wid = tab.windowId ?? -1;
       if (!wins.has(wid)) wins.set(wid, { tabs: [], groups: new Map() });
    }

    for (const tab of allTabs) {
      if (!tab.url || 
          tab.url.startsWith('chrome:') || 
          tab.url.startsWith('edge:') || 
          tab.url.startsWith('about:') || 
          tab.url.startsWith('chrome-extension:')) {
        continue;
      }

      const wid = tab.windowId ?? -1;
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

  const toggleGroup = (gid: number) => {
    setCollapsedGroups((m) => {
      const newState = !m[gid];
      if (chrome.tabGroups?.update) {
        chrome.tabGroups.update(gid, { collapsed: newState }).catch(() => {
          setCollapsedGroups((prev) => ({ ...prev, [gid]: !newState }));
        });
      }
      return { ...m, [gid]: newState };
    });
  };

  const handleDragOver = (
    e: React.DragEvent,
    type: 'tab' | 'group',
    id: number,
    itemData?: any
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const dragTab = getDragTab();
    const dragGroup = getDragGroup();
    if (!dragTab && !dragGroup) return;

    // Set isDragging on first detection (reactive state for render gating)
    if (!isDragging) setIsDragging(true);

    if (dragGroup && type === 'tab') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const position = e.clientY < mid ? 'top' : 'bottom';

    if (dragTab && type === 'tab') {
      if (dragTab?.id === id) { setDropTarget(null); return; }
      setDropTarget({ type: 'tab', id, position });
      return;
    }

    if (dragTab && type === 'group') {
      setDropTarget({ type: 'group', id, position: 'inside' });
      return;
    }

    if (dragGroup && type === 'group') {
      if (dragGroup?.id === id) { setDropTarget(null); return; }
      setDropTarget({ type: 'group', id, position });
      return;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!dropTarget) return;

    const dragTab = getDragTab();
    const dragGroup = getDragGroup();
    const { type: targetType, id: targetId, position } = dropTarget;

    try {
      if (dragTab && targetType === 'tab') {
        let targetTab: chrome.tabs.Tab | undefined;
        // Special case: Dropping on Window Background (Ghost) or Window Header
        // In these cases, id is windowId, not tabId.
        if (position === 'inside') {
           // Move to end of window (and ungroup if needed)
           if (dragTab.groupId && dragTab.groupId > -1) {
              actions.updateTab(dragTab.id, { nativeGroupId: undefined });
              await chrome.tabs.ungroup(dragTab.id);
           }
           await chrome.tabs.move(dragTab.id, { index: -1, windowId: targetId });
           return;
        }

        try {
          targetTab = await chrome.tabs.get(targetId);
        } catch {
          const local = allTabs.find(t => t.id === targetId);
          if (local) targetTab = { ...local, index: local.index ?? 0, windowId: local.windowId ?? -1 } as any;
        }

        if (!targetTab) return;

        const targetGroupId = targetTab.groupId;
        const needsGroupChange = dragTab.groupId !== targetGroupId;

        // Step 1: Change group first if needed (this will move tab to end of group)
        if (needsGroupChange) {
          if (targetGroupId > -1) {
             await chrome.tabs.group({ tabIds: dragTab.id, groupId: targetGroupId });
          } else {
             await chrome.tabs.ungroup(dragTab.id);
          }
        }

        // Step 2: Calculate target index after group change
        let newIndex = targetTab.index;
        if (position === 'bottom') newIndex += 1;

        // Step 3: Get fresh positions after potential group change
        if (dragTab.windowId === targetTab.windowId) {
            let freshDragTab: chrome.tabs.Tab | undefined;
            try {
               freshDragTab = await chrome.tabs.get(dragTab.id);
            } catch {}

            if (freshDragTab && freshDragTab.index < newIndex) {
                newIndex -= 1;
            }
        }

        // Step 4: Move to exact position
        await chrome.tabs.move(dragTab.id, { index: newIndex, windowId: targetTab.windowId });
      }

      if (dragTab && targetType === 'group' && position === 'inside') {
        // Move tab into group at the end
        const group = nativeTabGroups.find(g => g.id === targetId);
        if (!group) return;

        // First add to group (this will move to end of group automatically)
        if (dragTab.groupId !== targetId) {
          await chrome.tabs.group({ tabIds: dragTab.id, groupId: targetId });
        }

        // Then ensure it's in the right window and at the end of the group
        const groupTabs = allTabs
          .filter(t => t.nativeGroupId === targetId)
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

        if (groupTabs.length > 0) {
          const lastGroupTab = groupTabs[groupTabs.length - 1];
          const targetIndex = (lastGroupTab.id === dragTab.id) ? lastGroupTab.index ?? -1 : (lastGroupTab.index ?? 0) + 1;
          if (targetIndex >= 0) {
            await chrome.tabs.move(dragTab.id, { index: targetIndex, windowId: group.windowId });
          }
        }

        actions.updateTab(dragTab.id, { nativeGroupId: targetId });
      }

      if (dragGroup && targetType === 'group') {
         const targetGroupTabs = allTabs.filter(t => t.nativeGroupId === targetId).sort((a,b)=>(a.index??0)-(b.index??0));
         if (targetGroupTabs.length > 0) {
           let targetIndex = targetGroupTabs[0].index ?? 0;
           if (position === 'bottom') {
             const lastTab = targetGroupTabs[targetGroupTabs.length - 1];
             targetIndex = (lastTab.index ?? 0) + 1;
           }
           const dragGroupTabs = allTabs.filter(t => t.nativeGroupId === dragGroup.id);
           if (dragGroup.windowId === targetGroupTabs[0].windowId && dragGroupTabs.length > 0) {
               const dragStart = dragGroupTabs[0].index ?? -1;
               if (dragStart > -1 && dragStart < targetIndex) targetIndex -= dragGroupTabs.length;
           }
           await chrome.tabGroups.move(dragGroup.id, { index: targetIndex, windowId: targetGroupTabs[0].windowId });
         }
      }

    } catch (err) {
      console.error('Drop failed', err);
    } finally {
      setDropTarget(null);
      setDragTab(null);
      setDragGroup(null);
      setTimeout(() => actions.refresh(), 200);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" onDragOver={(e) => e.preventDefault()} onDrop={() => setDropTarget(null)}>
      {structure.length === 0 && <div className="opacity-40 text-xs px-1 italic">{t('no_open_tabs', 'No open tabs')}</div>}

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {structure.map((win, idx) => {
          const isCollapsed = collapsedWindows[win.id];
          const isActive = activeWindowId === win.id;
          const winColor = getWindowColorClass(idx);
          
          return (
            <div key={win.id}>
              {/* Window Header */}
              <div
                className={`flex items-center gap-3 mb-2 px-1 cursor-pointer select-none group/win ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'} ${dropTarget?.type === 'tab' && dropTarget.id === win.id && dropTarget.position === 'inside' ? '' : ''}`}
                onClick={() => toggleWindow(win.id)}
                onDragOver={(e) => {
                  const dragTab = getDragTab();
                  if (dragTab && dragTab.windowId !== win.id) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDragging) setIsDragging(true);
                    setDropTarget({ type: 'tab', id: win.id, position: 'inside' });
                  }
                }}
                onDrop={async (e) => {
                   const dragTab = getDragTab();
                   if (dragTab && dragTab.windowId !== win.id && dropTarget?.type === 'tab' && dropTarget.id === win.id) {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        if (dragTab.groupId && dragTab.groupId > -1) await chrome.tabs.ungroup(dragTab.id);
                        await chrome.tabs.move(dragTab.id, { index: -1, windowId: win.id });
                      } catch {} finally {
                        setDropTarget(null);
                        setTimeout(() => actions.refresh(), 200);
                      }
                   }
                }}
              >
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
                  <span className="text-[12px] font-bold text-[var(--fg)] uppercase tracking-tight truncate flex-1" title={win.label}>{win.label}</span>
                )}
                {editing !== win.id && (
                  <button className="opacity-0 group-hover/win:opacity-100 text-[10px] text-[var(--muted)] hover:text-[var(--fg)] px-1 transition-opacity" onClick={(e) => { e.stopPropagation(); setEditing(win.id); setEditText(win.label); }}>✎</button>
                )}
              </div>

              {!isCollapsed && (
                <div 
                  className={`pl-3 pb-2 min-h-[20px] space-y-4 flex flex-col flex-1 transition-colors duration-200 ${dropTarget?.type === 'tab' && dropTarget.id === win.id && dropTarget.position === 'inside' ? 'bg-[var(--accent)]/5 rounded-lg' : ''}`}
                  onDragOver={(e) => {
                    const dragTab = getDragTab();
                    if (dragTab) {
                       e.preventDefault();
                       e.stopPropagation();
                       if (!isDragging) setIsDragging(true);
                       // Allow ANY drag over the window background to trigger 'move to end'
                       setDropTarget({ type: 'tab', id: win.id, position: 'inside' });
                    }
                  }}
                  onDrop={async (e) => {
                     const dragTab = getDragTab();
                     if (dragTab && dropTarget?.type === 'tab' && dropTarget.id === win.id) {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          if (dragTab.groupId && dragTab.groupId > -1) {
                             actions.updateTab(dragTab.id, { nativeGroupId: undefined });
                             await chrome.tabs.ungroup(dragTab.id);
                          }
                          await chrome.tabs.move(dragTab.id, { index: -1, windowId: win.id });
                        } catch {} finally {
                          setDropTarget(null);
                          setTimeout(() => actions.refresh(), 200);
                        }
                     }
                  }}
                >
                  <div className="space-y-4">
                    {win.groups.map(({ group, tabs }) => {
                      const isGrpCollapsed = collapsedGroups[group.id] ?? group.collapsed;
                      const colorInfo = getGroupColorInfo(group.color);
                      const isDropTarget = dropTarget?.type === 'group' && dropTarget.id === group.id;
                      return (
                        <div key={group.id}>
                           {isDragging && isDropTarget && dropTarget.position === 'top' && <DropIndicator type="group" id={group.id} position="top" onDrop={handleDrop} setDropTarget={setDropTarget} />}
                          <div className="relative">
                            <div
                              className={`flex items-center gap-2 mb-3 cursor-pointer select-none group/g hover:opacity-100 ${draggingGroupId === group.id ? 'opacity-20' : 'opacity-90'}`}
                              onClick={() => toggleGroup(group.id)}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.setData(DRAG_TYPES.GROUP, JSON.stringify(group));
                                e.dataTransfer.effectAllowed = 'move';
                                setDragGroup({ id: group.id, windowId: group.windowId, title: group.title, color: group.color });
                                setDraggingGroupId(group.id);
                              }}
                              onDragEnd={() => {
                                setDragGroup(null);
                                setDraggingGroupId(null);
                              }}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full border ${isGrpCollapsed ? 'bg-transparent border-' + colorInfo.bg.split('-')[1] : colorInfo.bg + ' border-transparent'}`}></div>
                              <span className={`text-[11px] font-bold ${colorInfo.text} uppercase tracking-tighter truncate flex-1`}>{group.title || t('untitled_group', 'Untitled Group')}</span>
                            </div>
                            {!isGrpCollapsed && (
                              <div
                                className="space-y-2 pl-3 border-l min-h-[40px]"
                                style={{ borderColor: colorInfo.border.split('-')[1] }}
                                onDragOver={(e) => {
                                  const dragTab = getDragTab();
                                  if (dragTab && tabs.length > 0) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isDragging) setIsDragging(true);
                                    // When dragging in group whitespace, set target to last tab's bottom
                                    const lastTab = tabs[tabs.length - 1];
                                    // Only set if dragging is not already the last tab
                                    if (dragTab.id !== lastTab.id) {
                                      setDropTarget({ type: 'tab', id: lastTab.id, position: 'bottom' });
                                    }
                                  }
                                }}
                                onDrop={handleDrop}
                              >
                                {tabs.map((tab) => {
                                  const isTabDropTarget = dropTarget?.type === 'tab' && dropTarget.id === tab.id;
                                  const draggingSelf = getDragTab()?.id === tab.id;
                                  return (
                                    <React.Fragment key={tab.id}>
                                      {isDragging && isTabDropTarget && dropTarget.position === 'top' && !draggingSelf && <DropIndicator type="tab" id={tab.id} position="top" onDrop={handleDrop} setDropTarget={setDropTarget} />}
                                      <TabItem
                                        tab={tab}
                                        onDragOver={(e) => handleDragOver(e, 'tab', tab.id, tab)}
                                      />
                                      {isDragging && isTabDropTarget && dropTarget.position === 'bottom' && !draggingSelf && <DropIndicator type="tab" id={tab.id} position="bottom" onDrop={handleDrop} setDropTarget={setDropTarget} />}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {isDragging && isDropTarget && dropTarget.position === 'bottom' && <DropIndicator type="group" id={group.id} position="bottom" onDrop={handleDrop} setDropTarget={setDropTarget} />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2 pt-1">
                    {win.looseTabs.map((tab, idx) => {
                       const isTabDropTarget = dropTarget?.type === 'tab' && dropTarget.id === tab.id;
                       const draggingSelf = getDragTab()?.id === tab.id;
                       return (
                         <React.Fragment key={tab.id}>
                           {isDragging && isTabDropTarget && dropTarget.position === 'top' && !draggingSelf && <DropIndicator type="tab" id={tab.id} position="top" onDrop={handleDrop} setDropTarget={setDropTarget} />}
                           <TabItem
                             tab={tab}
                             onDragOver={(e) => handleDragOver(e, 'tab', tab.id, tab)}
                           />
                           {isDragging && isTabDropTarget && dropTarget.position === 'bottom' && !draggingSelf && <DropIndicator type="tab" id={tab.id} position="bottom" onDrop={handleDrop} setDropTarget={setDropTarget} />}
                         </React.Fragment>
                       );
                    })}
                  </div>

                  {/* Dynamic Ghost for Window Background Drop */}
                  {isDragging && dropTarget?.type === 'tab' && dropTarget.id === win.id && dropTarget.position === 'inside' && (
                    <DropIndicator type="tab" id={win.id} position="inside" onDrop={handleDrop} setDropTarget={setDropTarget} />
                  )}

                  {win.totalCount === 0 && <div className="pl-2 text-[10px] opacity-30 italic py-1">{t('empty_window', 'Empty')}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
