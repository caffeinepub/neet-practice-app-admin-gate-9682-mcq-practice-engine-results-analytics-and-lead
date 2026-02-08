/**
 * Client-side practice progress storage utilities for anonymous users.
 * Uses localStorage to persist the last seen question index per (subject, chapter, category, optional year).
 */

const STORAGE_PREFIX = 'practice_progress_';

/**
 * Create a composite storage key that includes optional year for PYQ sessions
 */
export function createStorageKey(
  subject: string,
  chapterId: string,
  category: string,
  year?: number
): string {
  const yearSuffix = year !== undefined ? `-year${year}` : '';
  return `${subject}-${chapterId}-${category}${yearSuffix}`;
}

export function loadLastIndex(key: string): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    if (stored === null) return null;
    const parsed = parseInt(stored, 10);
    if (isNaN(parsed) || parsed < 0) return null;
    return parsed;
  } catch (error) {
    console.error('Failed to load practice progress from localStorage:', error);
    return null;
  }
}

export function saveLastIndex(key: string, index: number): void {
  try {
    if (index < 0) return;
    localStorage.setItem(STORAGE_PREFIX + key, index.toString());
  } catch (error) {
    console.error('Failed to save practice progress to localStorage:', error);
  }
}

export function clearProgress(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (error) {
    console.error('Failed to clear practice progress from localStorage:', error);
  }
}
