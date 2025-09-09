export function isDebug(key = 'dnd'): boolean {
  try {
    return localStorage.getItem(`lt:${key}:debug`) === '1';
  } catch {
    return false;
  }
}

export function dbg(key = 'dnd', ...args: any[]) {
  if (isDebug(key)) {
    try {
      // eslint-disable-next-line no-console
      console.debug(`[lt:${key}]`, ...args);
    } catch {}
  }
}

