export interface TemplateFieldLike {
  key: string;
  defaultValue?: string;
}

export interface PageLike {
  title?: string;
  url: string;
  favicon?: string;
}

// Merge defaults and derive common values (title/url/host/etc.) for known keys.
export function computeAutoMeta(
  current: Record<string, string> | undefined,
  fields: TemplateFieldLike[] | undefined,
  page: PageLike | undefined
): Record<string, string> {
  const meta: Record<string, string> = { ...(current || {}) };
  const f = fields || [];
  // Apply template defaults
  for (const field of f) {
    const cur = (meta[field.key] ?? '').trim();
    if (!cur && field.defaultValue != null)
      meta[field.key] = String(field.defaultValue);
  }
  if (!page) return meta;
  try {
    const u = new URL(page.url);
    const title = (page.title || '').trim();
    const favicon = page.favicon || '';
    const hostname = u.hostname;
    const origin = u.origin;
    const pathname = u.pathname;
    const hasKey = (keyName: string) => f.some((x) => x.key === keyName);
    const maybeSet = (fieldKey: string, value: string) => {
      if (!hasKey(fieldKey)) return;
      if ((meta[fieldKey] ?? '').trim()) return;
      meta[fieldKey] = value;
    };
    ['title', 'name', 'pageTitle'].forEach((key) => title && maybeSet(key, title));
    ['url', 'link', 'href'].forEach((key) => maybeSet(key, u.toString()));
    ['host', 'hostname', 'domain', 'site'].forEach((key) => maybeSet(key, hostname));
    ['origin'].forEach((key) => maybeSet(key, origin));
    ['path', 'pathname'].forEach((key) => maybeSet(key, pathname));
    ['favicon'].forEach((key) => favicon && maybeSet(key, favicon));
  } catch {
    // ignore
  }
  return meta;
}
