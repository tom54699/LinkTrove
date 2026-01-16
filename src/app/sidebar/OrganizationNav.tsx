import React from 'react';
import { useOrganizations } from './organizations';
import { ContextMenu } from '../ui/ContextMenu';
import { useFeedback } from '../ui/feedback';

export const OrganizationNav: React.FC = () => {
  const { organizations, selectedOrgId, setCurrentOrganization, actions } = useOrganizations();
  const { showToast } = useFeedback();
  const [importMenuOpen, setImportMenuOpen] = React.useState(false);
  const [importMenuPos, setImportMenuPos] = React.useState({ x: 0, y: 0 });
  const [orgMenuOpen, setOrgMenuOpen] = React.useState<string | null>(null);
  const [orgMenuPos] = React.useState({ x: 0, y: 0 });
  const [confirmDeleteOrg, setConfirmDeleteOrg] = React.useState<string | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = React.useState(false);
  const [renameDrafts, setRenameDrafts] = React.useState<Record<string, string>>({});
  const [colorDrafts, setColorDrafts] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!manageDialogOpen) return;
    const nextDrafts: Record<string, string> = {};
    const nextColors: Record<string, string> = {};
    organizations.forEach((org) => {
      nextDrafts[org.id] = org.name;
      nextColors[org.id] = org.color || '#64748b';
    });
    setRenameDrafts(nextDrafts);
    setColorDrafts(nextColors);
  }, [manageDialogOpen, organizations]);

  return (
    <div className="w-16 flex flex-col items-center py-4 h-full">
      {/* Organization icons */}
      <div className="space-y-3 flex-1">
        {organizations.map((org) => (
          <button
            key={org.id}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all hover:scale-105 ${
              selectedOrgId === org.id
                ? 'ring-2 ring-blue-400 shadow-lg'
                : 'hover:ring-2 hover:ring-slate-400'
            }`}
            style={{ backgroundColor: org.color || '#64748b' }}
            onClick={() => setCurrentOrganization(org.id)}
            title={org.name}
          >
            {org.name.slice(0, 2).toUpperCase()}
          </button>
        ))}

        {/* Add new organization button */}
        <button
          className="w-12 h-12 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center text-slate-400 hover:border-slate-300 hover:text-slate-300 transition-colors"
          onClick={() => { try { window.dispatchEvent(new CustomEvent('organizations:add-new')); } catch {} }}
          title="Add new organization"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Manage organizations button */}
        <button
          className="w-12 h-12 rounded-full border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
          onClick={() => setManageDialogOpen(true)}
          title="管理 Organizations"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 3.487l3.651 3.651m-2.122-2.122L7.5 15.91l-4 1 1-4L15.74 1.365a1.5 1.5 0 012.122 0zM19 16.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2.5" />
          </svg>
        </button>
      </div>

      {/* Bottom section - Import, Settings and Theme */}
      <div className="space-y-3 mt-4">
        {/* Import button */}
        <button
          className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-300 hover:bg-slate-700 transition-colors relative"
          title="匯入 (Toby/HTML)"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setImportMenuPos({ x: rect.right + 8, y: rect.top });
            setImportMenuOpen(true);
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>

        {/* Import context menu */}
        {importMenuOpen && (
          <ContextMenu
            x={importMenuPos.x}
            y={importMenuPos.y}
            onClose={() => setImportMenuOpen(false)}
            items={[
              {
                key: 'toby',
                label: '匯入 Toby JSON',
                onSelect: () => {
                  setImportMenuOpen(false);
                  try { window.dispatchEvent(new CustomEvent('collections:import-toby-new')); } catch {}
                }
              },
              {
                key: 'html',
                label: '匯入 HTML 書籤',
                onSelect: () => {
                  setImportMenuOpen(false);
                  try { window.dispatchEvent(new CustomEvent('collections:import-html-new')); } catch {}
                }
              },
            ]}
          />
        )}

        {/* Organization context menu */}
        {orgMenuOpen && (
          <ContextMenu
            x={orgMenuPos.x}
            y={orgMenuPos.y}
            onClose={() => setOrgMenuOpen(null)}
            items={[
              {
                key: 'delete',
                label: '刪除 Organization',
                className: 'text-red-400 hover:bg-red-950/30',
                onSelect: () => {
                  setConfirmDeleteOrg(orgMenuOpen);
                  setOrgMenuOpen(null);
                }
              },
            ]}
          />
        )}

        {/* Delete confirmation dialog */}
        {confirmDeleteOrg && (
          <div
            className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
            onClick={() => setConfirmDeleteOrg(null)}
          >
            <div
              className="rounded border border-slate-700 bg-[var(--bg)] w-[520px] max-w-[95vw]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Delete Organization"
            >
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold">確認刪除 Organization</h3>
              </div>
              <div className="p-4">
                <p className="text-slate-300 mb-2">
                  確定要刪除「{organizations.find(o => o.id === confirmDeleteOrg)?.name}」嗎？
                </p>
                <p className="text-red-400 text-sm">
                  ⚠️ 警告：這將會永久刪除此 Organization 下的所有 Collection、Group 和書籤！
                </p>
              </div>
              <div className="p-4 border-t border-slate-700 flex gap-2 justify-end">
                <button
                  className="px-4 py-2 rounded border border-slate-600 hover:bg-slate-800"
                  onClick={() => setConfirmDeleteOrg(null)}
                >
                  取消
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                  onClick={async () => {
                    const orgId = confirmDeleteOrg;
                    setConfirmDeleteOrg(null);

                    // UI Layer Check: minimum count protection
                    if (organizations.length <= 1) {
                      showToast('刪除失敗：至少需要保留一個 Organization', 'error');
                      return;
                    }

                    try {
                      await actions.remove(orgId);
                      showToast('已刪除 Organization 及其所有資料', 'success');
                    } catch (error) {
                      console.error('Delete organization error:', error);
                      showToast('刪除失敗', 'error');
                    }
                  }}
                >
                  確認刪除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage organizations dialog */}
        {manageDialogOpen && (
          <div
            className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-3"
            onClick={() => setManageDialogOpen(false)}
          >
            <div
              className="rounded border border-slate-700 bg-[var(--bg)] w-[620px] max-w-[95vw]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Manage Organizations"
            >
              <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">管理 Organizations</div>
                  <div className="text-xs opacity-80 mt-1">可重新命名或刪除組織</div>
                </div>
                <button
                  className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800 text-sm"
                  onClick={() => setManageDialogOpen(false)}
                >
                  關閉
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="px-5 py-4 space-y-3">
                  {organizations.map((org) => {
                    const draftName = renameDrafts[org.id] ?? org.name;
                    const draftColor = colorDrafts[org.id] ?? org.color ?? '#64748b';
                    return (
                      <div
                        key={org.id}
                        className="flex items-center gap-3 border border-slate-800 rounded p-3 bg-slate-900/40"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ backgroundColor: org.color || '#64748b' }}
                          title={org.name}
                        >
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs text-slate-400 mb-1">組織名稱</label>
                          <input
                            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                            value={draftName}
                            onChange={(e) =>
                              setRenameDrafts((prev) => ({ ...prev, [org.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              e.currentTarget.blur();
                            }}
                            onBlur={async () => {
                              const nextName = draftName.trim();
                              if (!nextName) {
                                setRenameDrafts((prev) => ({ ...prev, [org.id]: org.name }));
                                return;
                              }
                              if (nextName === org.name) return;
                              try {
                                await actions.rename(org.id, nextName);
                              } catch (error) {
                                console.error('Update organization error:', error);
                                showToast('更新失敗', 'error');
                              }
                            }}
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-xs text-slate-400">顏色</label>
                            <input
                              type="color"
                              className="h-7 w-10 rounded border border-slate-700 bg-slate-900"
                              value={draftColor}
                              onChange={async (e) => {
                                const nextColor = e.target.value;
                                setColorDrafts((prev) => ({ ...prev, [org.id]: nextColor }));
                                if (nextColor === (org.color || '#64748b')) return;
                                try {
                                  await actions.updateColor(org.id, nextColor);
                                } catch (error) {
                                  console.error('Update organization error:', error);
                                  showToast('更新失敗', 'error');
                                }
                              }}
                              aria-label="組織顏色"
                            />
                            <span className="text-xs text-slate-400">{draftColor}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded border border-rose-700 text-rose-300 hover:bg-rose-950/30 text-sm"
                            onClick={() => setConfirmDeleteOrg(org.id)}
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* App Settings */}
        <button
          className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-300 hover:bg-slate-700 transition-colors"
          title="App Settings"
          onClick={() => { try { window.dispatchEvent(new CustomEvent('app:open-settings')); } catch {} }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="2.2" />
            <path d="M12 3.8v1.4M12 18.8v1.4M4.75 6.35l.99.99M18.26 19.86l.99.99M3.8 12h1.4M18.8 12h1.4M4.75 17.65l.99-.99M18.26 4.14l.99-.99" />
          </svg>
        </button>

        {/* Toggle Theme */}
        <button
          className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-300 hover:bg-slate-700 transition-colors"
          title="Toggle Theme"
          onClick={() => { try { window.dispatchEvent(new CustomEvent('app:toggle-theme')); } catch {} }}
        >
          <svg className="w-5 h-5 text-violet-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1111.21 3c.03 0 .06 0 .09 0a7 7 0 109.7 9.7c0 .03 0 .06 0 .09z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
