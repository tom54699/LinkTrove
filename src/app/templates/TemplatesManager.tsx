import React from 'react';
import { useTemplates } from './TemplatesProvider';
import { useFeedback } from '../ui/feedback';
import { createStorageService } from '../../background/storageService';

export const TemplatesManager: React.FC = () => {
  const { templates, actions } = useTemplates();
  const { showToast } = useFeedback();
  const [usageMap, setUsageMap] = React.useState<Record<string, number>>({});
  const [modal, setModal] = React.useState<null | { title: string; content: React.ReactNode }>(null);
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

  // Load usage count per template id (collections defaultTemplateId)
  React.useEffect(() => {
    (async () => {
      try {
        const s = createStorageService();
        const cats = (await s.loadFromSync()) as any[];
        const count: Record<string, number> = {};
        for (const c of cats || []) {
          const tid = (c as any).defaultTemplateId;
          if (!tid) continue;
          count[tid] = (count[tid] || 0) + 1;
        }
        setUsageMap(count);
      } catch {}
    })();
  }, [templates]);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Templates</h2>
            <p className="text-sm text-slate-400">管理書籤卡片的欄位模板，定義不同類型網頁的資料結構</p>
          </div>
          <div className="text-sm text-slate-500">
            共 {templates.length} 個模板
          </div>
        </div>

        {/* 新增模板區域 */}
        <div className="bg-gradient-to-r from-slate-900/40 to-slate-800/40 rounded-xl p-6 mb-8 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">新增模板</h3>
              <p className="text-sm text-slate-400">創建新的欄位模板或使用預設模板快速開始</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <input
              className="flex-1 max-w-md rounded-lg bg-slate-900/80 border border-slate-600 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none transition-colors"
              placeholder="輸入模板名稱（例如：文章模板、產品模板）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="px-6 py-3 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-medium transition-colors flex items-center gap-2 shadow-lg"
              onClick={async () => {
                const nn = (name || '').trim();
                if (!nn) return;
                const dup = templates.find((t) => (t.name || '').trim().toLowerCase() === nn.toLowerCase());
                if (dup) {
                  setModal({ title: '名稱已存在', content: <div>已存在同名模板「{nn}」，請改用其他名稱。</div> });
                  return;
                }
                await actions.add(nn);
                setName('');
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新增模板
            </button>
          </div>

          <div className="border-t border-slate-700/50 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-medium text-slate-300">快速創建預設模板</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-500/50 text-blue-300 bg-blue-950/20 hover:bg-blue-950/40 transition-colors text-sm font-medium shadow-sm"
              onClick={async () => {
                const templateName = '書籍模板';
                const nn = templateName.trim();
                const dup = templates.find((t) => (t.name || '').trim().toLowerCase() === nn.toLowerCase());
                if (dup) {
                  setModal({ title: '名稱已存在', content: <div>已存在同名模板「{nn}」。如需另建，請先改名稱避免混淆。</div> });
                  return;
                }
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-purple-500/50 text-purple-300 bg-purple-950/20 hover:bg-purple-950/40 transition-colors text-sm font-medium shadow-sm"
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
        </div>

        {/* 模板列表 */}
        <div className="space-y-6">
          {templates.map((t) => {
            const fieldCount = (t.fields || []).length;
            const isUsed = usageMap[t.id] > 0;

            return (
              <div key={t.id} className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/40 to-slate-800/40 shadow-lg hover:shadow-xl transition-all duration-300">
                <div
                  className={`flex items-center justify-between px-6 py-4 ${!collapsed[t.id] ? 'border-b border-slate-700/50' : ''}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      aria-label="Toggle"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors group"
                      onClick={() =>
                        setCollapsed((m) => ({ ...m, [t.id]: !m[t.id] }))
                      }
                    >
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${!collapsed[t.id] ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <div className="flex-1">
                      {collapsed[t.id] ? (
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg text-slate-200">{t.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/60 text-slate-300 border border-slate-600/50">
                              {fieldCount} 欄位
                            </span>
                            {isUsed && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/40 text-green-300 border border-green-500/30">
                                使用中：{usageMap[t.id]}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <input
                            className="text-lg font-semibold bg-transparent border-0 border-b-2 border-transparent hover:border-slate-600 focus:border-[var(--accent)] focus:outline-none transition-colors text-slate-200 pb-1 mb-2"
                            value={t.name}
                            onChange={async (e) => {
                              const v = e.target.value;
                              try {
                                await actions.rename(t.id, v);
                              } catch {
                                showToast('名稱已存在', 'error');
                              }
                            }}
                          />
                          <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span>共 {fieldCount} 個欄位</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isUsed ? (
                      <button
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/50 text-red-300 bg-red-950/20 hover:bg-red-950/40 transition-colors text-sm group"
                        onClick={async () => {
                          try {
                            await actions.remove(t.id);
                          } catch {
                            setModal({ title: '無法刪除模板', content: <div>此模板正在被使用。</div> });
                          }
                        }}
                      >
                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        刪除
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-800/30 rounded-lg border border-slate-600/30">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        使用中，無法刪除
                      </div>
                    )}
                  </div>
                </div>
                {!collapsed[t.id] && (
                  <div className="px-6 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h4 className="font-medium text-slate-300">欄位設定</h4>
                    </div>
                    {/* 欄位列表表頭 */}
                    <div className="bg-slate-800/40 rounded-lg p-4 mb-4 border border-slate-700/50">
                      <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-400 mb-2">
                        <div className="col-span-1"></div>
                        <div className="col-span-3">欄位鍵</div>
                        <div className="col-span-3">顯示名稱</div>
                        <div className="col-span-2">型別</div>
                        <div className="col-span-1">必填</div>
                        <div className="col-span-2">操作</div>
                      </div>
                    </div>

                    {/* 欄位列表 */}
                    <div className="space-y-3 mb-8">
                      {(t.fields || []).map((f) => {
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
                        const isLocked = LOCKED.has((f as any).key);

                        return (
                          <div
                            key={f.key}
                            className="bg-slate-900/40 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 group"
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
                            <div className="grid grid-cols-12 gap-4 items-center">
                              {/* 拖拽手把 */}
                              <div className="col-span-1 flex items-center">
                                <div className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center cursor-move transition-colors group-hover:bg-slate-700/70">
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                  </svg>
                                </div>
                              </div>

                              {/* 欄位鍵 */}
                              <div className="col-span-3">
                                <div className="relative">
                                  <input
                                    className={`w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                                      isLocked
                                        ? 'bg-slate-800/60 text-slate-400 border border-slate-600/50 cursor-not-allowed'
                                        : 'bg-slate-800/80 border border-slate-600 hover:border-slate-500 focus:border-[var(--accent)] focus:outline-none'
                                    }`}
                                    value={(f as any).key}
                                    disabled
                                    title={isLocked ? '固定欄位鍵已鎖定' : '鍵不可變更'}
                                  />
                                  {isLocked && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 顯示名稱 */}
                              <div className="col-span-3">
                                <input
                                  className="w-full rounded-lg bg-slate-800/80 border border-slate-600 hover:border-slate-500 focus:border-[var(--accent)] focus:outline-none px-3 py-2 text-sm transition-colors"
                                  value={f.label}
                                  onChange={(e) =>
                                    actions.updateField(t.id, f.key, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="輸入顯示名稱"
                                />
                              </div>
                              {/* 型別 */}
                              <div className="col-span-2">
                                <select
                                  className={`w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                                    isLocked
                                      ? 'bg-slate-800/60 text-slate-400 border border-slate-600/50 cursor-not-allowed'
                                      : 'bg-slate-800/80 border border-slate-600 hover:border-slate-500 focus:border-[var(--accent)] focus:outline-none'
                                  }`}
                                  value={(f as any).type || 'text'}
                                  onChange={(e) =>
                                    actions.updateFieldType(
                                      t.id,
                                      (f as any).key,
                                      e.target.value as any
                                    )
                                  }
                                  disabled={isLocked}
                                  title={isLocked ? '固定欄位型別已鎖定' : undefined}
                                >
                                  <option value="text">text</option>
                                  <option value="number">number</option>
                                  <option value="date">date</option>
                                  <option value="url">url</option>
                                  <option value="select">select</option>
                                  <option value="rating">rating</option>
                                  <option value="tags">tags</option>
                                </select>
                              </div>

                              {/* 必填 */}
                              <div className="col-span-1 flex items-center justify-center">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-[var(--accent)] bg-slate-800 border-slate-600 rounded focus:ring-[var(--accent)] focus:ring-2 transition-colors"
                                    checked={!!(f as any).required}
                                    onChange={(e) =>
                                      actions.updateFieldRequired(
                                        t.id,
                                        f.key,
                                        e.target.checked
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              {/* 操作 */}
                              <div className="col-span-2 flex items-center gap-2">
                                <button
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/50 text-red-300 bg-red-950/20 hover:bg-red-950/40 transition-colors text-xs group"
                                  onClick={() => actions.removeField(t.id, f.key)}
                                >
                                  <svg className="w-3 h-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  刪除
                                </button>
                              </div>
                            </div>

                            {/* select 選項設定區域 */}
                            {(f as any).type === 'select' && (
                              <div className="mt-4 pt-3 border-t border-slate-700/50">
                                <div className="grid grid-cols-12 gap-4">
                                  <div className="col-span-1"></div>
                                  <div className="col-span-11">
                                    <div>
                                      <label className="block text-xs font-medium text-slate-400 mb-2">選項設定（用逗號分隔）</label>
                                      <input
                                        className="w-full rounded-lg bg-slate-800/80 border border-slate-600 hover:border-slate-500 focus:border-[var(--accent)] focus:outline-none px-3 py-2 text-sm transition-colors"
                                        placeholder="例如：選項1, 選項2, 選項3"
                                        defaultValue={((f as any).options || []).join(', ')}
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
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 新增欄位表單 */}
                    <div className="mt-8 bg-slate-800/30 rounded-lg p-6 border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <h5 className="font-medium text-slate-300">新增欄位</h5>
                      </div>

                      <div className="grid grid-cols-12 gap-4 mb-4">
                        {/* 欄位鍵 */}
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-slate-400 mb-2">欄位鍵</label>
                          <input
                            className="w-full rounded-lg bg-slate-800/80 border border-slate-600 hover:border-slate-500 focus:border-[var(--accent)] focus:outline-none px-3 py-2 text-sm transition-colors"
                            placeholder="例如：author"
                            value={newField[t.id]?.key || ''}
                            onChange={(e) =>
                              setNewField({
                                ...newField,
                                [t.id]: {
                                  ...(newField[t.id] || { label: '',  }),
                                  key: e.target.value,
                                },
                              })
                            }
                          />
                        </div>

                        {/* 顯示名稱 */}
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-slate-400 mb-2">顯示名稱</label>
                          <input
                            className="w-full rounded-lg bg-slate-800/80 border border-slate-600 hover:border-slate-500 focus:border-[var(--accent)] focus:outline-none px-3 py-2 text-sm transition-colors"
                            placeholder="輸入顯示名稱"
                            value={newField[t.id]?.label || ''}
                            onChange={(e) =>
                              setNewField({
                                ...newField,
                                [t.id]: {
                                  ...(newField[t.id] || { key: '',  }),
                                  label: e.target.value,
                                },
                              })
                            }
                          />
                        </div>

                        {/* 型別 */}
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-400 mb-2">型別</label>
                          <select
                            className="w-full rounded-lg bg-slate-800/80 border border-slate-600 hover:border-slate-500 focus:border-[var(--accent)] focus:outline-none px-3 py-2 text-sm transition-colors"
                            value={newField[t.id]?.type || 'text'}
                            onChange={(e) =>
                              setNewField({
                                ...newField,
                                [t.id]: {
                                  ...(newField[t.id] || {
                                    key: '',
                                    label: '',
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
                            <option value="tags">tags</option>
                          </select>
                        </div>

                        {/* 必填 */}
                        <div className="col-span-1 flex flex-col">
                          <label className="block text-xs font-medium text-slate-400 mb-2">必填</label>
                          <div className="flex items-center justify-center h-[42px]">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-[var(--accent)] bg-slate-800 border-slate-600 rounded focus:ring-[var(--accent)] focus:ring-2 transition-colors"
                              checked={!!newField[t.id]?.required}
                              onChange={(e) =>
                                setNewField({
                                  ...newField,
                                  [t.id]: {
                                    ...(newField[t.id] || {
                                      key: '',
                                      label: '',
                                                                          }),
                                    required: e.target.checked,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>

                        {/* 新增按鈕 */}
                        <div className="col-span-3 flex flex-col">
                          <label className="block text-xs font-medium text-slate-400 mb-2">&nbsp;</label>
                          <button
                            className="h-[42px] px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-medium transition-colors flex items-center justify-center gap-2 shadow-lg"
                            onClick={async () => {
                              const nf = newField[t.id] || {
                                key: '',
                                label: '',
                                                                type: 'text',
                              };
                              const key = nf.key.trim();
                              const label = nf.label.trim();
                              if (!key || !label) {
                                setNewField({
                                  ...newField,
                                  [t.id]: { ...nf, err: '欄位鍵和顯示名稱為必填' },
                                });
                                return;
                              }
                              if (!/^[A-Za-z0-9_]+$/.test(key)) {
                                setNewField({
                                  ...newField,
                                  [t.id]: { ...nf, err: '欄位鍵只能包含英文字母、數字或底線' },
                                });
                                return;
                              }
                              try {
                                const payload: any = {
                                  key,
                                  label,
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
                                    err: e?.message || '新增失敗',
                                  },
                                });
                              }
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            新增欄位
                          </button>
                        </div>
                      </div>

                      {/* 額外設定 */}
                      {newField[t.id]?.type === 'select' && (
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-slate-400 mb-2">選項設定（用逗號分隔）</label>
                          <input
                            className="w-full rounded-lg bg-slate-800/80 border border-slate-600 hover:border-slate-500 focus:border-[var(--accent)] focus:outline-none px-3 py-2 text-sm transition-colors"
                            placeholder="例如：選颅1, 選颅2, 選颅3"
                            value={newField[t.id]?.options || ''}
                            onChange={(e) =>
                              setNewField({
                                ...newField,
                                [t.id]: {
                                  ...(newField[t.id] || {
                                    key: '',
                                    label: '',
                                                                      }),
                                  options: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      )}

                      {/* 錯誤訊息 */}
                      {newField[t.id]?.err && (
                        <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-red-300 text-sm">
                          {newField[t.id]?.err}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {templates.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium mb-1">還沒有模板</p>
              <p className="text-sm">創建第一個模板來開始管理你的書籤欄位</p>
            </div>
          )}
        </div>
      </section>
      {modal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
          onClick={() => setModal(null)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] w-[420px] max-w-[95vw] p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={modal.title}
          >
            <div className="text-lg font-semibold mb-3">{modal.title}</div>
            <div className="text-sm mb-4">{modal.content}</div>
            <div className="flex items-center justify-end">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setModal(null)}
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Modal inline（簡易版本，避免依賴外部元件）
// 放在 TemplatesManager 檔尾或上層容器內直接渲染
