import React from 'react';
import { useTemplates } from './TemplatesProvider';
import { useCategories } from '../sidebar/categories';

export const TemplatesManager: React.FC = () => {
  const { templates, actions } = useTemplates();
  const { categories, actions: catActions } = useCategories();
  const [name, setName] = React.useState('');
  const [fieldKey, setFieldKey] = React.useState('');
  const [fieldLabel, setFieldLabel] = React.useState('');
  const [fieldDefault, setFieldDefault] = React.useState('');
  const [selectedTpl, setSelectedTpl] = React.useState<string>('');

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-2">Templates</h2>
        <div className="flex items-center gap-2 mb-3">
          <input className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" placeholder="New template name" value={name} onChange={(e)=>setName(e.target.value)} />
          <button className="text-sm px-2 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30" onClick={async ()=>{
            if (!name.trim()) return;
            const t = await actions.add(name.trim());
            setSelectedTpl(t.id);
            setName('');
          }}>Add Template</button>
        </div>
        <div className="space-y-4">
          {templates.map((t) => (
            <div key={t.id} className="rounded border border-slate-700 p-3">
              <div className="flex items-center gap-2 mb-2">
                <input className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" value={t.name} onChange={(e)=>actions.rename(t.id, e.target.value)} />
                <button className="text-xs px-2 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30 ml-auto" onClick={()=>actions.remove(t.id)}>Delete</button>
              </div>
              <div className="text-sm opacity-80 mb-1">Fields</div>
              <div className="space-y-1 mb-2">
                {(t.fields || []).map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <input className="w-40 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" value={f.key} disabled />
                    <input className="w-40 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" value={f.label} onChange={(e)=>actions.updateField(t.id, f.key, { label: e.target.value })} />
                    <input className="flex-1 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" placeholder="Default" value={(f as any).defaultValue || ''} onChange={(e)=>actions.updateField(t.id, f.key, { defaultValue: e.target.value })} />
                    <button className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={()=>actions.removeField(t.id, f.key)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input className="w-40 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" placeholder="key (e.g. author)" value={selectedTpl === t.id ? fieldKey : ''} onChange={(e)=>{ setSelectedTpl(t.id); setFieldKey(e.target.value);} } />
                <input className="w-40 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" placeholder="label" value={selectedTpl === t.id ? fieldLabel : ''} onChange={(e)=>{ setSelectedTpl(t.id); setFieldLabel(e.target.value);} } />
                <input className="flex-1 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm" placeholder="default" value={selectedTpl === t.id ? fieldDefault : ''} onChange={(e)=>{ setSelectedTpl(t.id); setFieldDefault(e.target.value);} } />
                <button className="text-xs px-2 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30" onClick={async ()=>{
                  if (!fieldKey.trim() || !fieldLabel.trim()) return;
                  await actions.addField(t.id, { key: fieldKey.trim(), label: fieldLabel.trim(), defaultValue: fieldDefault });
                  setFieldKey(''); setFieldLabel(''); setFieldDefault('');
                }}>Add Field</button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="opacity-70 text-sm">No templates yet.</div>
          )}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2">Category Defaults</h2>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="w-40 text-sm">{c.name}</div>
              <select className="text-sm rounded bg-slate-900 border border-slate-700 px-2 py-1" value={c.defaultTemplateId || ''} onChange={(e)=>catActions.setDefaultTemplate(c.id, e.target.value || undefined)}>
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
