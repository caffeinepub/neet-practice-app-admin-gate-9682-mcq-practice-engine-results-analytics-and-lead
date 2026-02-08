/**
 * Client-side practice progress storage utilities for anonymous users.
 * Uses localStorage to persist the last seen question index and answers per (subject, chapter, category, optional year).
 */

const STORAGE_PREFIX = 'practice_progress_';

export interface StoredAnswer {
  selectedOption: string;
  timeTaken: number;
}

export interface StoredProgress {
  lastQuestionIndex: number;
  answers?: Record<string, StoredAnswer>;
}

/**
 * Create a composite storage key that includes optional year for PYQ sessions
 */
export function createStorageKey(
  subject: string,
  chapterId: string,
  category: string,
  year?: string
): string {
  const yearSuffix = year !== undefined ? `-year${year}` : '';
  return `${STORAGE_PREFIX}${subject}-${chapterId}-${category}${yearSuffix}`;
}

export function loadPracticeProgress(
  subject: string,
  chapterId: string,
  category: string,
  year?: string
): StoredProgress | null {
  try {
    const key = createStorageKey(subject, chapterId, category, year);
    const stored = localStorage.getItem(key);
    if (stored === null) return null;
    const parsed = JSON.parse(stored);
    return parsed;
  } catch (error) {
    console.error('Failed to load practice progress from localStorage:', error);
    return null;
  }
}

export function savePracticeProgress(
  subject: string,
  chapterId: string,
  category: string,
  lastQuestionIndex: number,
  answers?: Record<string, StoredAnswer>,
  year?: string
): void {
  try {
    const key = createStorageKey(subject, chapterId, category, year);
    const progress: StoredProgress = {
      lastQuestionIndex,
      answers,
    };
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save practice progress to localStorage:', error);
  }
}

export function clearProgress(
  subject: string,
  chapterId: string,
  category: string,
  year?: string
): void {
  try {
    const key = createStorageKey(subject, chapterId, category, year);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear practice progress from localStorage:', error);
  }
}
