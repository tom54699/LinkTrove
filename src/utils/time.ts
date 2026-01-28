export type TimestampLike = number | string | null | undefined;

export function nowMs(): number {
  return Date.now();
}

export function toMs(value: TimestampLike): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

export function toIso(value: TimestampLike): string | undefined {
  const ms = toMs(value);
  if (ms === undefined) return undefined;
  return new Date(ms).toISOString();
}
