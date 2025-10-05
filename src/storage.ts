// storage.ts
// Small safe wrapper around localStorage that falls back to an in-memory
// store when localStorage is not available (e.g., Safari Private Mode).
const inMemory = new Map<string, string>();

function isLocalStorageAvailable() {
  try {
    const key = '__test_ls__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

const available = typeof window !== 'undefined' && isLocalStorageAvailable();

export function storageGet(key: string): string | null {
  if (available) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      // fall through to in-memory
    }
  }
  return inMemory.has(key) ? (inMemory.get(key) as string) : null;
}

export function storageSet(key: string, value: string) {
  if (available) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch (e) {
      // fall back
    }
  }
  inMemory.set(key, value);
}

export function storageRemove(key: string) {
  if (available) {
    try {
      window.localStorage.removeItem(key);
      return;
    } catch (e) {
      // fall back
    }
  }
  inMemory.delete(key);
}

export function storageAvailable() {
  return available;
}

export default { storageGet, storageSet, storageRemove, storageAvailable };
