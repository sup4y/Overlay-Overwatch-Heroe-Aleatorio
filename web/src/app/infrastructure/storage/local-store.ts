/**
 * localStorage access that tolerates failures (private mode, blocked storage…).
 */
export const localStore = {
  read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
