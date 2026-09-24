import { HistoryEnvelope, TypingHistoryEntry } from './progressTypes';
import { TypingState } from './types';
import { TypingAnalytics } from './analytics';

export const STORAGE_KEY = 'typing_platform_history';
export const MAX_HISTORY_ENTRIES = 100;

/**
 * Creates a unique, deterministic ID for a completed test attempt.
 */
function generateAttemptId(timestamp: number): string {
  return `test_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Pure mapper transforming completed TypingState and TypingAnalytics
 * into a persistent TypingHistoryEntry.
 */
export function createHistoryEntry(
  state: TypingState,
  analytics: TypingAnalytics,
  timestamp = Date.now(),
  testMode: 'standard' | 'exam' = 'standard',
  examProfileId?: string
): TypingHistoryEntry {
  return {
    id: generateAttemptId(timestamp),
    timestamp,
    duration: state.duration,
    grossWpm: analytics.metrics.grossWPM,
    netWpm: analytics.metrics.netWPM,
    accuracy: analytics.metrics.accuracy,
    totalKeystrokes: analytics.metrics.totalKeystrokes,
    correctChars: analytics.correctCharacters,
    incorrectChars: analytics.incorrectCharacters,
    extraChars: analytics.extraCharacters,
    mostMistypedCharacters: analytics.mostMistypedCharacters,
    testMode,
    examProfileId,
    language: state.passage.language || 'en',
  };
}

/**
 * Validates whether an unknown object conforms to TypingHistoryEntry.
 */
function isValidHistoryEntry(item: unknown): item is TypingHistoryEntry {
  if (!item || typeof item !== 'object') return false;
  const entry = item as Partial<TypingHistoryEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.timestamp === 'number' &&
    typeof entry.duration === 'number' &&
    typeof entry.netWpm === 'number' &&
    typeof entry.accuracy === 'number' &&
    Array.isArray(entry.mostMistypedCharacters) &&
    (entry.language === undefined || entry.language === 'en' || entry.language === 'hi')
  );
}

/**
 * Returns the active localStorage instance safely across browser and test environments.
 * Returns null during server-side rendering or when storage is unavailable.
 */
function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Safely loads completed test history from browser localStorage.
 * Returns empty array if localStorage is unavailable, empty, or corrupted.
 */
export function loadHistory(): TypingHistoryEntry[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return [];
    }

    const envelope = parsed as Partial<HistoryEnvelope>;
    if (envelope.version !== 1 || !Array.isArray(envelope.entries)) {
      return [];
    }

    // Filter valid entries to guard against individual corrupted items
    return envelope.entries.filter(isValidHistoryEntry);
  } catch {
    // Malformed JSON or security exception — fail gracefully with empty state
    return [];
  }
}

/**
 * Safely appends a new completed test entry to localStorage.
 * Enforces the MAX_HISTORY_ENTRIES (100) bound by dropping the oldest entries.
 */
export function saveHistoryEntry(entry: TypingHistoryEntry): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    const existing = loadHistory();

    // Prevent duplicate saves of identical entry ID
    if (existing.some((e) => e.id === entry.id)) {
      return true;
    }

    // Newest entries first
    const updated = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES);

    const envelope: HistoryEnvelope = {
      version: 1,
      entries: updated,
    };

    storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all local test history from browser localStorage.
 */
export function clearHistory(): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
