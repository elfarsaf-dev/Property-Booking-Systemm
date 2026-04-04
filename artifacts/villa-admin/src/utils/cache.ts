const PREFIX = "erekap_cache_";

export const apiCache = {
  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T): void {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  },

  clear(key: string): void {
    sessionStorage.removeItem(PREFIX + key);
  },

  clearAll(): void {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  },

  has(key: string): boolean {
    return sessionStorage.getItem(PREFIX + key) !== null;
  },
};
