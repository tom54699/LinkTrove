import React, { createContext, useContext, useMemo, useState } from 'react';
import { createStorageService, type TemplateData } from '../../background/storageService';

interface TemplatesCtx {
  templates: TemplateData[];
  actions: {
    add: (name: string) => Promise<TemplateData>;
    rename: (id: string, name: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
    addField: (id: string, field: { key: string; label: string; defaultValue?: string }) => Promise<void>;
    updateField: (id: string, key: string, patch: Partial<{ label: string; defaultValue: string }>) => Promise<void>;
    removeField: (id: string, key: string) => Promise<void>;
  };
}

const Ctx = createContext<TemplatesCtx | null>(null);

export const TemplatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const svc = React.useMemo(() => createStorageService(), []);
  const [templates, setTemplates] = useState<TemplateData[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const list = await svc.loadTemplates();
        setTemplates(list);
      } catch {}
    })();
  }, [svc]);

  const persist = async (list: TemplateData[]) => {
    setTemplates(list);
    try { await svc.saveTemplates(list); } catch {}
  };

  function genId() { return 't_' + Math.random().toString(36).slice(2,9); }

  const actions = useMemo(() => ({
    async add(name: string) {
      const t: TemplateData = { id: genId(), name: name.trim() || 'Template', fields: [] };
      await persist([...templates, t]);
      return t;
    },
    async rename(id: string, name: string) {
      await persist(templates.map(t => t.id === id ? { ...t, name: name.trim() || t.name } : t));
    },
    async remove(id: string) {
      await persist(templates.filter(t => t.id !== id));
    },
    async addField(id: string, field: { key: string; label: string; defaultValue?: string }) {
      await persist(templates.map(t => t.id === id ? { ...t, fields: [...t.fields, { ...field, type: 'text' }] } : t));
    },
    async updateField(id: string, key: string, patch: Partial<{ label: string; defaultValue: string }>) {
      await persist(templates.map(t => t.id === id ? { ...t, fields: t.fields.map(f => f.key === key ? { ...f, ...patch } : f) } : t));
    },
    async removeField(id: string, key: string) {
      await persist(templates.map(t => t.id === id ? { ...t, fields: t.fields.filter(f => f.key !== key) } : t));
    },
  }), [templates]);

  const value = useMemo<TemplatesCtx>(() => ({ templates, actions }), [templates, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useTemplates() {
  const v = useContext(Ctx);
  if (!v) throw new Error('TemplatesProvider missing');
  return v;
}

