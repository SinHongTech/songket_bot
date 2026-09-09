/**
 * Safe storage wrapper for Telegram WebApp / WebViews / iframes.
 *
 * Prevents `DOMException: The operation is insecure` or `SecurityError`
 * when running inside partitioned iframes, Safari incognito, or restricted Telegram WebViews.
 */

class SafeStorageWrapper {
  private memoryStore = new Map<string, string>();

  private sanitizeCloudKey(key: string): string {
    // Telegram CloudStorage keys may only contain A-Z, a-z, 0-9, _ (underscore), and - (hyphen).
    return key.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

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
        const sanitizedVal = window.localStorage.getItem(this.sanitizeCloudKey(key));
        if (sanitizedVal !== null) return sanitizedVal;
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

    return this.memoryStore.get(key) ?? this.memoryStore.get(this.sanitizeCloudKey(key)) ?? null;
  }

  setItem(key: string, value: string): void {
    this.memoryStore.set(key, value);
    this.memoryStore.set(this.sanitizeCloudKey(key), value);

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        window.localStorage.setItem(this.sanitizeCloudKey(key), value);
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
        const cloudKey = this.sanitizeCloudKey(key);
        tgCloud.setItem(cloudKey, value, (err: any) => {
          if (err) {
            console.debug("Telegram CloudStorage setItem error:", err);
          }
        });
      }
    } catch {}
  }

  removeItem(key: string): void {
    this.memoryStore.delete(key);
    this.memoryStore.delete(this.sanitizeCloudKey(key));

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(this.sanitizeCloudKey(key));
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
        const cloudKey = this.sanitizeCloudKey(key);
        tgCloud.removeItem(cloudKey, (err: any) => {
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
        const keyMap: Record<string, string> = {};
        const cloudKeys: string[] = [];
        keys.forEach(k => {
          const ck = this.sanitizeCloudKey(k);
          keyMap[ck] = k;
          keyMap[k] = k;
          if (!cloudKeys.includes(ck)) cloudKeys.push(ck);
          if (!cloudKeys.includes(k) && ck !== k) cloudKeys.push(k);
        });

        tgCloud.getItems(cloudKeys, (err: any, result: Record<string, string>) => {
          if (!err && result) {
            const mappedResult: Record<string, string> = {};
            Object.entries(result).forEach(([ck, v]) => {
              if (v !== undefined && v !== null && v !== "") {
                const originalKey = keyMap[ck] || ck;
                mappedResult[originalKey] = v;
                this.memoryStore.set(originalKey, v);
                this.memoryStore.set(ck, v);
                try {
                  window.localStorage?.setItem(originalKey, v);
                  window.localStorage?.setItem(ck, v);
                } catch {}
                this.setCookie(originalKey, v);
              }
            });
            if (onLoaded) {
              onLoaded(mappedResult);
            }
          }
        });
      }
    } catch {}
  }
}

export const safeStorage = new SafeStorageWrapper();
export const safeSessionStorage = safeStorage;
