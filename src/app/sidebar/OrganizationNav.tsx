import React from 'react';
import { useOrganizations } from './organizations';
import { ContextMenu } from '../ui/ContextMenu';
import { useFeedback } from '../ui/feedback';
import { useI18n } from '../i18n';
import { useEditableDialogCloseGuard } from '../ui/useEditableDialogCloseGuard';

export const OrganizationNav: React.FC = () => {
  const { t } = useI18n();
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
  const manageDialogGuard = useEditableDialogCloseGuard(() => setManageDialogOpen(false));

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
          title={t('org_add_new')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Manage organizations button */}
        <button
          className="w-12 h-12 rounded-full border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
          onClick={() => setManageDialogOpen(true)}
          title={t('menu_manage_orgs')}
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
          title={t('org_import_hint')}
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
                label: t('menu_import_toby'),
                onSelect: () => {
                  setImportMenuOpen(false);
                  try { window.dispatchEvent(new CustomEvent('collections:import-toby-new')); } catch {}
                }
              },
              {
                key: 'html',
                label: t('menu_import_html'),
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
                label: t('menu_delete_org'),
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
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-3"
            onClick={() => setConfirmDeleteOrg(null)}
          >
            <div
              className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[480px] max-w-[95vw] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={t('org_confirm_delete_title')}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-lg">⚠️</div>
                <h3 className="text-lg font-bold">{t('org_confirm_delete_title')}</h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                  {t('org_confirm_delete_desc', [organizations.find(o => o.id === confirmDeleteOrg)?.name || ''])}
                </p>
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-200/80 leading-snug">
                  {t('org_delete_warning')}
                </div>
              </div>

              <div className="mt-8 flex gap-3 justify-end">
                <button
                  className="px-5 py-2 text-sm font-bold rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-all cursor-pointer"
                  onClick={() => setConfirmDeleteOrg(null)}
                >
                  {t('btn_cancel')}
                </button>
                <button
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-red-600 text-white hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-red-600/10"
                  onClick={async () => {
                    const orgId = confirmDeleteOrg;
                    setConfirmDeleteOrg(null);

                    // UI Layer Check: minimum count protection
                    if (organizations.length <= 1) {
                      showToast(t('org_min_one'), 'error');
                      return;
                    }

                    try {
                      await actions.remove(orgId);
                      showToast(t('toast_org_deleted'), 'success');
                    } catch (error) {
                      console.error('Delete organization error:', error);
                      showToast(t('toast_delete_failed'), 'error');
                    }
                  }}
                >
                  {t('btn_confirm_delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage organizations dialog */}
        {manageDialogOpen && (
          <div
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-md flex items-center justify-center p-3"
            {...manageDialogGuard.overlayProps}
          >
            <div
              className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[620px] max-w-[95vw] shadow-2xl flex flex-col"
              {...manageDialogGuard.dialogProps}
              role="dialog"
              aria-label={t('org_manage_title')}
            >
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">{t('org_manage_title')}</div>
                  <div className="text-[11px] text-[var(--muted)] uppercase tracking-widest mt-1 opacity-70 font-bold">{t('org_manage_desc')}</div>
                </div>
                <button
                  className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                  onClick={() => setManageDialogOpen(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
                <div className="space-y-4">
                  {organizations.map((org) => {
                    const draftName = renameDrafts[org.id] ?? org.name;
                    const draftColor = colorDrafts[org.id] ?? org.color ?? '#64748b';
                    return (
                      <div
                        key={org.id}
                        className="flex items-center gap-4 border border-white/5 rounded-xl p-4 bg-[var(--bg)]/30 hover:bg-[var(--bg)]/50 transition-all"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                          style={{ backgroundColor: org.color || '#64748b' }}
                          title={org.name}
                        >
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">{t('org_name_label')}</label>
                          <input
                            className="w-full rounded-lg bg-[var(--input-bg)] border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] transition-all"
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
                                showToast(t('toast_update_failed'), 'error');
                              }
                            }}
                          />
                          <div className="mt-3 flex items-center gap-3">
                            <label
                              htmlFor={`org-color-${org.id}`}
                              className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider"
                            >
                              {t('org_color_label')}
                            </label>
                            <div className="relative">
                              <div 
                                className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border)] px-2.5 py-1.5 rounded-full hover:border-[var(--accent)] transition-all cursor-pointer group"
                                onClick={(e) => (e.currentTarget.nextSibling as HTMLInputElement).click()}
                              >
                                <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: draftColor }} />
                                <span className="text-[11px] font-mono text-[var(--muted)] group-hover:text-[var(--text)] transition-colors">{draftColor}</span>
                              </div>
                              <input
                                type="color"
                                id={`org-color-${org.id}`}
                                aria-label={t('org_color_label')}
                                className="absolute opacity-0 pointer-events-none"
                                value={draftColor}
                                onChange={async (e) => {
                                  const nextColor = e.target.value;
                                  setColorDrafts((prev) => ({ ...prev, [org.id]: nextColor }));
                                  if (nextColor === (org.color || '#64748b')) return;
                                  try {
                                    await actions.updateColor(org.id, nextColor);
                                  } catch (error) {
                                    console.error('Update organization error:', error);
                                    showToast(t('toast_update_failed'), 'error');
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                            onClick={() => setConfirmDeleteOrg(org.id)}
                            title={t('menu_delete')}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-6 border-t border-white/5 flex justify-end">
                <button
                  className="px-6 py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-[var(--accent)]/10"
                  onClick={() => setManageDialogOpen(false)}
                >
                  {t('dialog_close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* App Settings */}
        <button
          className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-300 hover:bg-slate-700 transition-colors"
          title={t('settings_btn')}
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
          title={t('theme_toggle')}
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
