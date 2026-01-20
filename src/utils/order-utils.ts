export type OrderItem = {
  id: string;
  subcategoryId?: string | null;
  createdAt?: string | number;
  updatedAt?: string | number;
};

const toTime = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  }
  return Number.NaN;
};

const getItemTime = (item: OrderItem): number => {
  const created = toTime(item.createdAt);
  if (Number.isFinite(created)) return created;
  const updated = toTime(item.updatedAt);
  if (Number.isFinite(updated)) return updated;
  return Number.NaN;
};

export const areOrdersEqual = (
  a: string[] | undefined,
  b: string[] | undefined
): boolean => {
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
};

export const normalizeGroupOrder = (
  items: OrderItem[],
  baseOrder?: string[]
): string[] => {
  const base = Array.isArray(baseOrder) ? baseOrder : [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const id of base) {
    if (!byId.has(id) || seen.has(id)) continue;
    normalized.push(id);
    seen.add(id);
  }

  if (items.length === 0) return normalized;

  const indexMap = new Map(items.map((item, idx) => [item.id, idx]));
  const missing = items.filter((item) => !seen.has(item.id));

  if (missing.length > 1) {
    missing.sort((a, b) => {
      const ta = getItemTime(a);
      const tb = getItemTime(b);
      if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) {
        return ta - tb;
      }
      return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0);
    });
  }

  for (const item of missing) {
    if (seen.has(item.id)) continue;
    normalized.push(item.id);
    seen.add(item.id);
  }

  return normalized;
};
