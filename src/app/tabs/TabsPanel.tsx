import React from 'react';
import { useOpenTabs } from './OpenTabsProvider';
import { TabItem } from './TabItem';

export const TabsPanel: React.FC = () => {
  const { allTabs, activeWindowId, actions } = useOpenTabs();
  const [collapsed, setCollapsed] = React.useState<Record<number, boolean>>({});
  const [editing, setEditing] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState('');
  const groups = React.useMemo(() => {
    const byWin = new Map<number, ReturnType<typeof Array.prototype.slice>>();
    for (const t of allTabs) {
      const wid = t.windowId ?? -1;
      if (!byWin.has(wid)) byWin.set(wid, []);
      byWin.get(wid)!.push(t);
    }
    const arr = Array.from(byWin.entries()).sort((a, b) => a[0] - b[0]);
    // Assign labels web1, web2 by order
    return arr.map(([id, tabs], idx) => ({
      id,
      label: actions.getWindowLabel(id) || `web${idx + 1}`,
      tabs: tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
    }));
  }, [allTabs, actions]);

  const toggle = (wid: number) =>
    setCollapsed((m) => ({ ...m, [wid]: !m[wid] }));

  return (
    <div>
      <div className="text-sm mb-3">OPEN TABS</div>
      {groups.length === 0 && (
        <div className="opacity-60 text-sm">No open tabs</div>
      )}
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="border border-slate-700 rounded">
            <div
              className={`w-full flex items-center justify-between px-2 py-1 text-left bg-[var(--card)] ${activeWindowId === g.id ? 'ring-1 ring-slate-500' : ''}`}
            >
              <div className="flex items-center gap-2">
                <button
                  className="text-xs"
                  onClick={() => toggle(g.id)}
                  aria-label="Toggle"
                >
                  {collapsed[g.id] ? '▸' : '▾'}
                </button>
                {editing === g.id ? (
                  <input
                    className="text-xs rounded bg-slate-900 border border-slate-700 px-1 py-0.5"
                    value={editText}
                    autoFocus
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => {
                      actions.setWindowLabel(g.id, editText.trim() || g.label);
                      setEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        actions.setWindowLabel(
                          g.id,
                          editText.trim() || g.label
                        );
                        setEditing(null);
                      }
                      if (e.key === 'Escape') {
                        setEditing(null);
                      }
                    }}
                  />
                ) : (
                  <span className="text-xs">
                    {g.label}{' '}
                    <span className="opacity-60">({g.tabs.length})</span>
                  </span>
                )}
              </div>
              {editing === g.id ? null : (
                <button
                  className="text-xs opacity-80 hover:opacity-100"
                  aria-label="Rename"
                  onClick={() => {
                    setEditing(g.id);
                    setEditText(g.label);
                  }}
                >
                  ✎
                </button>
              )}
            </div>
            {!collapsed[g.id] && (
              <div className="p-1 space-y-2">
                {g.tabs.map((t) => (
                  <TabItem
                    key={t.id}
                    tab={t}
                    className="flex items-center bg-[var(--card)] px-2 py-2 rounded-md hover:bg-[#283069]"
                    title={t.title || t.url}
                  />
                ))}
                {g.tabs.length === 0 && (
                  <div className="opacity-60 text-sm px-2 pb-2">No tabs</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
