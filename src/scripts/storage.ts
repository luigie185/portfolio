// localStorage / sessionStorage can throw (private mode, blocked site data),
// so every access goes through these wrappers and the page works without them.

type Area = 'local' | 'session';

function area(kind: Area): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function read(key: string, kind: Area = 'local'): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function write(key: string, value: string, kind: Area = 'local'): void {
  try {
    area(kind)?.setItem(key, value);
  } catch {
    /* ignore — progress just won't persist */
  }
}

export function remove(key: string, kind: Area = 'local'): void {
  try {
    area(kind)?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
