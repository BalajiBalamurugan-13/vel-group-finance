/**
 * VEL Finance — useLocalStorage Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Type-safe stateful wrapper around localStorage.
 * Syncs React state with localStorage on changes.
 *
 * Usage:
 *   const [collapsed, setCollapsed] = useLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
 */
import { useState, useCallback } from 'react';
import { storage, type StorageKey } from '@/utils/storage';

export function useLocalStorage<T>(
  key: StorageKey,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = storage.get<T>(key);
    return item !== null ? item : initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const resolved = typeof value === 'function'
          ? (value as (prev: T) => T)(prev)
          : value;
        storage.set(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
