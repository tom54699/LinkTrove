import React from 'react';
import { useTemplates } from './TemplatesProvider';
import { useCategories } from '../sidebar/categories';

export const TemplatesManager: React.FC = () => {
  const { templates, actions } = useTemplates();
  const { categories, actions: catActions } = useCategories();
  const [name, setName] = React.useState('');
  const [newField, setNewField] = React.useState<
    Record<
      string,
      {
        key: string;
        label: string;
        def: string;
        type?: 'text' | 'number' | 'date' | 'url' | 'select' | 'rating';
        options?: string;
        required?: boolean;
        err?: string;
      }
    >
  >({});
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [commonAdd, setCommonAdd] = React.useState<
    Record<string, { key: 'siteName' | 'author'; required: boolean }>
  >({});

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-2">Templates</h2>
        <div className="space-y-3 mb-3">
          <div className="flex items-center gap-2">
            <input
              className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
              placeholder="New template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="text-sm px-2 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]"
              onClick={async () => {
                if (!name.trim()) return;
                await actions.add(name.trim());
                setName('');
              }}
            >
              Add Template
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">快速創建：</span>
            <button
              className="text-xs px-2 py-1 rounded border border-blue-600 text-blue-300 hover:bg-blue-950/30"
              onClick={async () => {
                const templateName = '書籍模板';
                const newTemplate = await actions.add(templateName);
                if (newTemplate?.id) {
                  await actions.addFields(newTemplate.id, [
                    // 依序：書名 作者 連載狀態 類型 字數 評分 站名 最後更新時間
                    { key: 'bookTitle', label: '書名', type: 'text' },
                    { key: 'author', label: '作者', type: 'text' },
                    { key: 'serialStatus', label: '連載狀態', type: 'select', options: ['連載中', '已完結', '太監'] },
                    { key: 'genre', label: '類型', type: 'text' },
                    { key: 'wordCount', label: '字數', type: 'number' },
                    { key: 'rating', label: '評分', type: 'rating' },
                    { key: 'siteName', label: '站名', type: 'text' },
                    { key: 'lastUpdate', label: '最後更新時間', type: 'date' },
                  ]);
                }
              }}
            >
              📚 書籍模板
            </button>
            <button
              className="text-xs px-2 py-1 rounded border border-purple-600 text-purple-300 hover:bg-purple-950/30"
              onClick={async () => {
                const templateName = '工具模板';
                const newTemplate = await actions.add(templateName);
                if (newTemplate?.id) {
                  await actions.addFields(newTemplate.id, [
                    { key: 'rating', label: '評分', type: 'rating' },
                    { key: 'tags', label: '標籤', type: 'tags' },
                    { key: 'description', label: '功能描述', type: 'text' },
                    { key: 'platform', label: '平台', type: 'select', options: ['Web', 'Desktop', 'Mobile', 'CLI', '跨平台'] },
                    { key: 'price', label: '價格', type: 'select', options: ['免費', '免費增值', '付費', '訂閱制'] },
                    { key: 'used', label: '使用狀態', type: 'select', options: ['在用', '試過', '想試', '不推薦'] },
                  ]);
                }
              }}
            >
              🔧 工具模板
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {templates.map((t) => (
            <div key={t.id} className="rounded border border-slate-700">
              <div
                className={`flex items-center justify-between px-3 py-2 bg-[var(--card)] ${collapsed[t.id] ? '' : 'border-b border-slate-700'}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Toggle"
                    className="text-xs"
                    onClick={() =>
                      setCollapsed((m) => ({ ...m, [t.id]: !m[t.id] }))
                    }
                  >
                    {collapsed[t.id] ? '▸' : '▾'}
                  </button>
                  {collapsed[t.id] ? (
                    <span className="text-sm">{t.name}</span>
                  ) : (
                    <input
                      className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                      value={t.name}
                      onChange={(e) => actions.rename(t.id, e.target.value)}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs rounded bg-slate-900 border border-slate-700 px-2 py-1"
                    value={commonAdd[t.id]?.key || 'siteName'}
                    onChange={(e) =>
                      setCommonAdd((m) => ({
                        ...m,
                        [t.id]: {
                          key: (e.target.value as any) || 'siteName',
                          required: m[t.id]?.required || false,
                        },
                      }))
                    }
                    title="選擇常用欄位"
                  >
                    <option value="siteName">站名 (siteName)</option>
                    <option value="author">作者 (author)</option>
                  </select>
                  {(() => {
                    const nf = newField[t.id];
                    const composerActive = !!(
                      nf && (
                        nf.key ||
                        nf.label ||
                        nf.def ||
                        nf.options ||
                        (nf.type && nf.type !== 'text') ||
                        nf.required
                      )
                    );
                    return composerActive ? null : (
                      <label className="text-xs flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={!!commonAdd[t.id]?.required}
                          onChange={(e) =>
                            setCommonAdd((m) => ({
                              ...m,
                              [t.id]: {
                                key: m[t.id]?.key || 'siteName',
                                required: e.target.checked,
                              },
                            }))
                          }
                        />
                        required
                      </label>
                    );
                  })()}
                  <button
                    className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800"
                    title="新增常用欄位"
                    onClick={async () => {
                      const sel = commonAdd[t.id]?.key || 'siteName';
                      const label = sel === 'siteName' ? '站名' : '作者';
                      try {
                        await actions.addField(t.id, {
                          key: sel,
                          label,
                          type: 'text',
                        });
                        if (commonAdd[t.id]?.required)
                          await actions.updateFieldRequired(t.id, sel, true);
                      } catch {
                        // ignore duplicate errors
                      }
                    }}
                  >
                    新增
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30"
                    onClick={() => actions.remove(t.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {!collapsed[t.id] && (
                <div className="p-3">
                  <div className="text-sm opacity-80 mb-1">Fields</div>
                  <div className="space-y-2 mb-2">
                    {(t.fields || []).map((f) => (
                      <div
                        key={f.key}
                        className="rounded border border-slate-700 p-2 bg-[var(--card)]"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/x-linktrove-field-key',
                            f.key
                          );
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromKey = e.dataTransfer.getData(
                            'application/x-linktrove-field-key'
                          );
                          if (fromKey && fromKey !== f.key)
                            actions.reorderField(t.id, fromKey, f.key);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="cursor-move select-none text-slate-400">
                            ↕
                          </span>
                          <input
                            className="w-36 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                            value={f.key}
                            disabled
                          />
                          <input
                            className="w-40 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                            value={f.label}
                            onChange={(e) =>
                              actions.updateField(t.id, f.key, {
                                label: e.target.value,
                              })
                            }
                          />
                          {(() => {
                            const LOCKED = new Set([
                              'bookTitle',
                              'author',
                              'serialStatus',
                              'genre',
                              'wordCount',
                              'rating',
                              'siteName',
                              'lastUpdate',
                            ]);
                            const disabled = LOCKED.has((f as any).key);
                            return (
                              <select
                                className="text-sm rounded bg-slate-900 border border-slate-700 px-2 py-1"
                                value={(f as any).type || 'text'}
                                onChange={(e) =>
                                  actions.updateFieldType(
                                    t.id,
                                    (f as any).key,
                                    e.target.value as any
                                  )
                                }
                                disabled={disabled}
                                title={disabled ? '固定欄位型別已鎖定' : undefined}
                              >
                                <option value="text">text</option>
                                <option value="number">number</option>
                                <option value="date">date</option>
                                <option value="url">url</option>
                                <option value="select">select</option>
                                <option value="rating">rating (1-5)</option>
                              </select>
                            );
                          })()}
                          <label className="text-xs flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={!!(f as any).required}
                              onChange={(e) =>
                                actions.updateFieldRequired(
                                  t.id,
                                  f.key,
                                  e.target.checked
                                )
                              }
                            />{' '}
                            required
                          </label>
                          <button
                            className="ml-auto text-xs px-2 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30"
                            onClick={() => actions.removeField(t.id, f.key)}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {(f as any).type === 'select' ? (
                            <input
                              className="flex-1 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                              placeholder="options (comma-separated)"
                              defaultValue={((f as any).options || []).join(
                                ', '
                              )}
                              onBlur={(e) =>
                                actions.updateFieldOptions(
                                  t.id,
                                  f.key,
                                  e.target.value
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                )
                              }
                            />
                          ) : (f as any).type === 'rating' ? (
                            <input
                              className="w-32 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                              type="number"
                              min={1}
                              max={5}
                              placeholder="default (1-5)"
                              defaultValue={(f as any).defaultValue || ''}
                              onBlur={(e) =>
                                actions.updateField(t.id, f.key, {
                                  defaultValue: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              className="flex-1 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                              placeholder="Default"
                              defaultValue={(f as any).defaultValue || ''}
                              onBlur={(e) =>
                                actions.updateField(t.id, f.key, {
                                  defaultValue: e.target.value,
                                })
                              }
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-5 gap-2">
                      {(() => {
                        const nf = newField[t.id];
                        var composerActive = !!(
                          nf && (
                            nf.key ||
                            nf.label ||
                            nf.def ||
                            nf.options ||
                            (nf.type && nf.type !== 'text') ||
                            nf.required
                          )
                        );
                        return null;
                      })()}
                      <input
                        className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                        placeholder="key (e.g. author)"
                        value={newField[t.id]?.key || ''}
                        onChange={(e) =>
                          setNewField({
                            ...newField,
                            [t.id]: {
                              ...(newField[t.id] || { label: '', def: '' }),
                              key: e.target.value,
                            },
                          })
                        }
                      />
                      <input
                        className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                        placeholder="label"
                        value={newField[t.id]?.label || ''}
                        onChange={(e) =>
                          setNewField({
                            ...newField,
                            [t.id]: {
                              ...(newField[t.id] || { key: '', def: '' }),
                              label: e.target.value,
                            },
                          })
                        }
                      />
                      <select
                        className="text-sm rounded bg-slate-900 border border-slate-700 px-2 py-1"
                        value={newField[t.id]?.type || 'text'}
                        onChange={(e) =>
                          setNewField({
                            ...newField,
                            [t.id]: {
                              ...(newField[t.id] || {
                                key: '',
                                label: '',
                                def: '',
                              }),
                              type: e.target.value as any,
                            },
                          })
                        }
                      >
                        <option value="text">text</option>
                        <option value="number">number</option>
                        <option value="date">date</option>
                        <option value="url">url</option>
                        <option value="select">select</option>
                        <option value="rating">rating</option>
                      </select>
                      {newField[t.id]?.type === 'select' ? (
                        <input
                          className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                          placeholder="options (comma-separated)"
                          value={newField[t.id]?.options || ''}
                          onChange={(e) =>
                            setNewField({
                              ...newField,
                              [t.id]: {
                                ...(newField[t.id] || {
                                  key: '',
                                  label: '',
                                  def: '',
                                }),
                                options: e.target.value,
                              },
                            })
                          }
                        />
                      ) : (
                        <input
                          className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                          placeholder="default"
                          value={newField[t.id]?.def || ''}
                          onChange={(e) =>
                            setNewField({
                              ...newField,
                              [t.id]: {
                                ...(newField[t.id] || { key: '', label: '' }),
                                def: e.target.value,
                              },
                            })
                          }
                        />
                      )}
                      {(() => {
                        const nf = newField[t.id];
                        const composerActive = !!(
                          nf && (
                            nf.key ||
                            nf.label ||
                            nf.def ||
                            nf.options ||
                            (nf.type && nf.type !== 'text') ||
                            nf.required
                          )
                        );
                        if (!composerActive) return null;
                        return (
                          <label className="text-xs flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={!!newField[t.id]?.required}
                              onChange={(e) =>
                                setNewField({
                                  ...newField,
                                  [t.id]: {
                                    ...(newField[t.id] || {
                                      key: '',
                                      label: '',
                                      def: '',
                                    }),
                                    required: e.target.checked,
                                  },
                                })
                              }
                            />{' '}
                            required
                          </label>
                        );
                      })()}
                    </div>
                    <div>
                      <button
                        className="text-xs px-2 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]"
                        onClick={async () => {
                          const nf = newField[t.id] || {
                            key: '',
                            label: '',
                            def: '',
                            type: 'text',
                          };
                          const key = nf.key.trim();
                          const label = nf.label.trim();
                          if (!key || !label) {
                            setNewField({
                              ...newField,
                              [t.id]: { ...nf, err: 'Key/label required' },
                            });
                            return;
                          }
                          try {
                            const payload: any = {
                              key,
                              label,
                              defaultValue: nf.def,
                              type: nf.type || 'text',
                            };
                            if (
                              nf.type === 'select' &&
                              (nf.options || '').trim()
                            ) {
                              payload.options = (nf.options || '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                            }
                            if (nf.required) payload.required = true;
                            await actions.addField(t.id, payload);
                            setNewField({
                              ...newField,
                              [t.id]: {
                                key: '',
                                label: '',
                                def: '',
                                type: 'text',
                                options: '',
                                required: false,
                                err: '',
                              },
                            });
                          } catch (e: any) {
                            setNewField({
                              ...newField,
                              [t.id]: {
                                ...nf,
                                err: e?.message || 'Failed to add',
                              },
                            });
                          }
                        }}
                      >
                        Add Field
                      </button>
                      {newField[t.id]?.err && (
                        <div className="text-xs text-red-400 mt-1">
                          {newField[t.id]?.err}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {templates.length === 0 && (
            <div className="opacity-70 text-sm">No templates yet.</div>
          )}
        </div>
      </section>
    </div>
  );
};
