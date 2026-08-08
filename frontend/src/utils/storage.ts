/**
 * VEL Finance — Type-Safe localStorage Wrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides type-safe read/write/remove operations on localStorage.
 * Handles JSON parse errors gracefully.
 */

export const storage = {
  /**
   * Reads a value from localStorage and parses it from JSON.
   * Returns null if the key doesn't exist or JSON is malformed.
   */
  get<T>(key: string): T | null {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch {
      console.warn(`[Storage] Failed to read key "${key}"`);
      return null;
    }
  },

  /**
   * Serializes a value to JSON and stores it in localStorage.
   */
  set<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`[Storage] Failed to write key "${key}"`);
    }
  },

  /**
   * Removes an item from localStorage.
   */
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      console.warn(`[Storage] Failed to remove key "${key}"`);
    }
  },

  /**
   * Clears all localStorage items.
   * Use with caution — affects all items in the origin.
   */
  clear(): void {
    try {
      window.localStorage.clear();
    } catch {
      console.warn('[Storage] Failed to clear localStorage');
    }
  },
};

/** Typed localStorage key constants — prevents key typos */
export const STORAGE_KEYS = {
  THEME: 'vel:theme',
  SIDEBAR_COLLAPSED: 'vel:sidebar_collapsed',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
