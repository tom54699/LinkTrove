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
    const hasKey = (k: string) => f.some((x) => x.key === k);
    const maybeSet = (k: string, v: string) => {
      if (!hasKey(k)) return;
      if ((meta[k] ?? '').trim()) return;
      meta[k] = v;
    };
    ['title', 'name', 'pageTitle'].forEach((k) => title && maybeSet(k, title));
    ['url', 'link', 'href'].forEach((k) => maybeSet(k, u.toString()));
    ['host', 'hostname', 'domain', 'site'].forEach((k) =>
      maybeSet(k, hostname)
    );
    ['origin'].forEach((k) => maybeSet(k, origin));
    ['path', 'pathname'].forEach((k) => maybeSet(k, pathname));
    ['favicon'].forEach((k) => favicon && maybeSet(k, favicon));
  } catch {
    // ignore
  }
  return meta;
}
