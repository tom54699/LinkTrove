import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  createStorageService,
  type TemplateData,
} from '../../background/storageService';

interface TemplatesCtx {
  templates: TemplateData[];
  actions: {
    reload: () => Promise<void>;
    add: (name: string) => Promise<TemplateData>;
    rename: (id: string, name: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
    addField: (
      id: string,
      field: { key: string; label: string; defaultValue?: string }
    ) => Promise<void>;
    updateField: (
      id: string,
      key: string,
      patch: Partial<{ label: string; defaultValue: string }>
    ) => Promise<void>;
    removeField: (id: string, key: string) => Promise<void>;
  };
}

const Ctx = createContext<TemplatesCtx | null>(null);

export const TemplatesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const svc = React.useMemo(() => createStorageService(), []);
  const [templates, setTemplates] = useState<TemplateData[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        // 先從 chrome.storage.local 讀（設定類），若空再讀 IDB
        const got: any = await new Promise((resolve) => {
          try {
            chrome.storage?.local?.get?.({ templates: [] }, resolve);
          } catch {
            resolve({});
          }
        });
        const localTpls: TemplateData[] = Array.isArray(got?.templates)
          ? got.templates
          : [];
        if (localTpls.length > 0) {
          setTemplates(localTpls);
          try {
            await svc.saveTemplates(localTpls);
          } catch {}
        } else {
          const list = await svc.loadTemplates();
          setTemplates(list);
          try {
            chrome.storage?.local?.set?.({ templates: list });
          } catch {}
        }
      } catch {}
    })();
  }, [svc]);

  const persist = async (list: TemplateData[]) => {
    setTemplates(list);
    try {
      await svc.saveTemplates(list);
    } catch {}
    try {
      chrome.storage?.local?.set?.({ templates: list });
    } catch {}
  };

  function genId() {
    return 't_' + Math.random().toString(36).slice(2, 9);
  }

  const actions = useMemo(
    () => ({
      async reload() {
        try {
          const list = await svc.loadTemplates();
          setTemplates(list);
        } catch {}
      },
      async add(name: string) {
        const t: TemplateData = {
          id: genId(),
          name: name.trim() || 'Template',
          fields: [],
        };
        await persist([...templates, t]);
        return t;
      },
      async rename(id: string, name: string) {
        await persist(
          templates.map((t) =>
            t.id === id ? { ...t, name: name.trim() || t.name } : t
          )
        );
      },
      async remove(id: string) {
        await persist(templates.filter((t) => t.id !== id));
      },
      async addField(
        id: string,
        field: {
          key: string;
          label: string;
          defaultValue?: string;
          type?: 'text' | 'number' | 'date' | 'url' | 'select' | 'rating';
          options?: string[];
          required?: boolean;
        }
      ) {
        const list = templates.map((t) => {
          if (t.id !== id) return t;
          const exists = (t.fields || []).some((f) => f.key === field.key);
          if (exists) throw new Error('Field key already exists');
          const newField = { ...field, type: (field.type || 'text') as any };
          const nextFields =
            t.fields && t.fields.length ? [...t.fields, newField] : [newField];
          return { ...t, fields: nextFields };
        });
        await persist(list);
      },
      async updateField(
        id: string,
        key: string,
        patch: Partial<{ label: string; defaultValue: string }>
      ) {
        await persist(
          templates.map((t) =>
            t.id === id
              ? {
                  ...t,
                  fields: t.fields.map((f) =>
                    f.key === key ? { ...f, ...patch } : f
                  ),
                }
              : t
          )
        );
      },
      async updateFieldType(
        id: string,
        key: string,
        type: 'text' | 'number' | 'date' | 'url' | 'select' | 'rating'
      ) {
        await persist(
          templates.map((t) =>
            t.id === id
              ? {
                  ...t,
                  fields: t.fields.map((f) =>
                    f.key === key ? { ...f, type } : f
                  ),
                }
              : t
          )
        );
      },
      async updateFieldOptions(id: string, key: string, options: string[]) {
        await persist(
          templates.map((t) =>
            t.id === id
              ? {
                  ...t,
                  fields: t.fields.map((f) =>
                    f.key === key ? { ...f, options } : f
                  ),
                }
              : t
          )
        );
      },
      async updateFieldRequired(id: string, key: string, required: boolean) {
        await persist(
          templates.map((t) =>
            t.id === id
              ? {
                  ...t,
                  fields: t.fields.map((f) =>
                    f.key === key ? { ...f, required } : f
                  ),
                }
              : t
          )
        );
      },
      async reorderField(id: string, fromKey: string, toKey: string) {
        const list = templates.map((t) => {
          if (t.id !== id) return t;
          const idxFrom = t.fields.findIndex((f) => f.key === fromKey);
          const idxTo = t.fields.findIndex((f) => f.key === toKey);
          if (idxFrom === -1 || idxTo === -1) return t;
          const arr = [...t.fields];
          const [m] = arr.splice(idxFrom, 1);
          arr.splice(idxTo, 0, m);
          return { ...t, fields: arr };
        });
        await persist(list);
      },
      async removeField(id: string, key: string) {
        await persist(
          templates.map((t) =>
            t.id === id
              ? { ...t, fields: t.fields.filter((f) => f.key !== key) }
              : t
          )
        );
      },
    }),
    [templates]
  );

  const value = useMemo<TemplatesCtx>(
    () => ({ templates, actions }),
    [templates, actions]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useTemplates() {
  const v = useContext(Ctx);
  if (!v) {
    return {
      templates: [],
      actions: {
        reload: async () => {},
        add: async (name: string) => ({ id: 't_' + Math.random().toString(36).slice(2,9), name, fields: [] }),
        rename: async () => {},
        remove: async () => {},
        addField: async () => {},
        updateField: async () => {},
        removeField: async () => {},
        updateFieldType: async () => {},
        updateFieldOptions: async () => {},
        updateFieldRequired: async () => {},
        reorderField: async () => {},
      },
    } as any;
  }
  return v;
}
