/**
 * Safe storage wrapper for Telegram WebApp / WebViews / iframes.
 *
 * Prevents `DOMException: The operation is insecure` or `SecurityError`
 * when running inside partitioned iframes, Safari incognito, or restricted Telegram WebViews.
 */

class SafeStorageWrapper {
  private memoryStore = new Map<string, string>();

  private getCookie(name: string): string | null {
    try {
      if (typeof document === "undefined") return null;
      const match = document.cookie.match(new RegExp("(?:^|; )" + encodeURIComponent(name).replace(/[-.+*]/g, "\\$&") + "=([^;]*)"));
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }

  private setCookie(name: string, value: string): void {
    try {
      if (typeof document === "undefined") return;
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=31536000; path=/; SameSite=Lax`;
    } catch {}
  }

  private removeCookie(name: string): void {
    try {
      if (typeof document === "undefined") return;
      document.cookie = `${encodeURIComponent(name)}=; max-age=0; path=/; SameSite=Lax`;
    } catch {}
  }

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

    const cookieVal = this.getCookie(key);
    if (cookieVal !== null) return cookieVal;

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

    this.setCookie(key, value);

    // Also persist into Telegram WebApp CloudStorage for cross-device/session persistence
    try {
      const tgCloud = (window as any)?.Telegram?.WebApp?.CloudStorage;
      if (tgCloud && typeof tgCloud.setItem === "function") {
        tgCloud.setItem(key, value, (err: any) => {
          if (err) {
            console.debug("Telegram CloudStorage setItem error:", err);
          }
        });
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

    this.removeCookie(key);

    try {
      const tgCloud = (window as any)?.Telegram?.WebApp?.CloudStorage;
      if (tgCloud && typeof tgCloud.removeItem === "function") {
        tgCloud.removeItem(key, (err: any) => {
          if (err) {
            console.debug("Telegram CloudStorage removeItem error:", err);
          }
        });
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

  loadCloudItems(keys: string[], onLoaded?: (items: Record<string, string>) => void): void {
    try {
      const tgCloud = (window as any)?.Telegram?.WebApp?.CloudStorage;
      if (tgCloud && typeof tgCloud.getItems === "function") {
        tgCloud.getItems(keys, (err: any, result: Record<string, string>) => {
          if (!err && result) {
            Object.entries(result).forEach(([k, v]) => {
              if (v !== undefined && v !== null && v !== "") {
                this.memoryStore.set(k, v);
                try {
                  window.localStorage?.setItem(k, v);
                } catch {}
                this.setCookie(k, v);
              }
            });
            if (onLoaded) {
              onLoaded(result);
            }
          }
        });
      }
    } catch {}
  }
}

export const safeStorage = new SafeStorageWrapper();
export const safeSessionStorage = safeStorage;
