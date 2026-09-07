/**
 * Safe storage wrapper for Telegram WebApp / WebViews / iframes.
 *
 * Prevents `DOMException: The operation is insecure` or `SecurityError`
 * when running inside partitioned iframes, Safari incognito, or restricted Telegram WebViews.
 */

class SafeStorageWrapper {
  private memoryStore = new Map<string, string>();

  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {}

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const val = window.sessionStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {}

    return this.memoryStore.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.memoryStore.set(key, value);

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch {}
  }

  removeItem(key: string): void {
    this.memoryStore.delete(key);

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch {}
  }

  clear(): void {
    this.memoryStore.clear();

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {}

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch {}
  }
}

export const safeStorage = new SafeStorageWrapper();
export const safeSessionStorage = safeStorage;
