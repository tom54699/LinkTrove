const KEY = 'linktrove.visits.v1';

function read(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch { return {}; }
}
function write(m: Record<string, number>) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {}
}

export function incrementVisit(url?: string) {
  if (!url) return;
  const m = read();
  m[url] = (m[url] || 0) + 1;
  write(m);
}

export function getVisits(): Record<string, number> { return read(); }

export function topPopular(urls: string[], n = 10): string[] {
  const m = read();
  return urls
    .slice()
    .sort((a, b) => (m[b] || 0) - (m[a] || 0))
    .slice(0, n);
}

