import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateProgressSummary,
  aggregateWeakCharacters,
  getProgressTrend,
} from './progressAnalytics';
import {
  loadHistory,
  saveHistoryEntry,
  clearHistory,
  createHistoryEntry,
  STORAGE_KEY,
  MAX_HISTORY_ENTRIES,
} from './progressStorage';
import { TypingHistoryEntry } from './progressTypes';
import { TypingState } from './types';
import { TypingAnalytics } from './analytics';

const mockEntry1: TypingHistoryEntry = {
  id: 'test_1',
  timestamp: 1700000000000,
  duration: 60,
  grossWpm: 65,
  netWpm: 60,
  accuracy: 95.0,
  totalKeystrokes: 325,
  correctChars: 300,
  incorrectChars: 5,
  extraChars: 0,
  mostMistypedCharacters: [
    { character: 'e', displayLabel: 'e', count: 3 },
    { character: 'r', displayLabel: 'r', count: 2 },
  ],
};

const mockEntry2: TypingHistoryEntry = {
  id: 'test_2',
  timestamp: 1700000060000,
  duration: 60,
  grossWpm: 75,
  netWpm: 72,
  accuracy: 98.0,
  totalKeystrokes: 375,
  correctChars: 360,
  incorrectChars: 2,
  extraChars: 0,
  mostMistypedCharacters: [
    { character: 'r', displayLabel: 'r', count: 2 },
    { character: 't', displayLabel: 't', count: 1 },
  ],
};

const mockEntry3: TypingHistoryEntry = {
  id: 'test_3',
  timestamp: 1700000120000,
  duration: 60,
  grossWpm: 80,
  netWpm: 80,
  accuracy: 100.0,
  totalKeystrokes: 400,
  correctChars: 400,
  incorrectChars: 0,
  extraChars: 0,
  mostMistypedCharacters: [],
};

describe('Phase 5 — Progress Storage Service', () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageStore[key] ?? null,
      setItem: (key: string, value: string) => {
        localStorageStore[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageStore[key];
      },
      clear: () => {
        localStorageStore = {};
      },
    });
  });

  it('loads empty array when storage is empty', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('saves and loads valid history entries', () => {
    expect(saveHistoryEntry(mockEntry1)).toBe(true);
    const loaded = loadHistory();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe(mockEntry1.id);
    expect(loaded[0].netWpm).toBe(60);
  });

  it('recovers gracefully from malformed JSON without throwing', () => {
    localStorageStore[STORAGE_KEY] = 'INVALID_JSON_CORRUPTED{[';
    const loaded = loadHistory();
    expect(loaded).toEqual([]);
  });

  it('recovers gracefully from invalid schema or envelope version', () => {
    localStorageStore[STORAGE_KEY] = JSON.stringify({ version: 99, entries: 'not-an-array' });
    expect(loadHistory()).toEqual([]);
  });

  it('filters out corrupted entries within an envelope', () => {
    localStorageStore[STORAGE_KEY] = JSON.stringify({
      version: 1,
      entries: [mockEntry1, { corrupted: true }, 'string-item'],
    });
    const loaded = loadHistory();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe(mockEntry1.id);
  });

  it('orders entries newest first upon multiple saves', () => {
    saveHistoryEntry(mockEntry1);
    saveHistoryEntry(mockEntry2);
    const loaded = loadHistory();
    expect(loaded.length).toBe(2);
    expect(loaded[0].id).toBe(mockEntry2.id); // Newest first
    expect(loaded[1].id).toBe(mockEntry1.id);
  });

  it('prevents duplicate saves with the same ID', () => {
    saveHistoryEntry(mockEntry1);
    saveHistoryEntry(mockEntry1);
    const loaded = loadHistory();
    expect(loaded.length).toBe(1);
  });

  it('enforces MAX_HISTORY_ENTRIES bound (drops oldest beyond 100)', () => {
    for (let i = 1; i <= 105; i++) {
      saveHistoryEntry({
        ...mockEntry1,
        id: `test_${i}`,
        timestamp: 1000 + i,
      });
    }

    const loaded = loadHistory();
    expect(loaded.length).toBe(MAX_HISTORY_ENTRIES);
    expect(loaded[0].id).toBe('test_105'); // Latest entry retained
    expect(loaded[MAX_HISTORY_ENTRIES - 1].id).toBe('test_6'); // First 5 dropped
  });

  it('clears all history successfully', () => {
    saveHistoryEntry(mockEntry1);
    saveHistoryEntry(mockEntry2);
    expect(loadHistory().length).toBe(2);

    expect(clearHistory()).toBe(true);
    expect(loadHistory()).toEqual([]);
  });
});

describe('Phase 5 — Progress Analytics Engine', () => {
  it('returns default summary for empty history', () => {
    const summary = calculateProgressSummary([]);
    expect(summary).toEqual({
      totalTests: 0,
      averageNetWpm: 0,
      bestNetWpm: 0,
      averageAccuracy: 0,
      recentNetWpm: 0,
      recentAccuracy: 0,
    });
  });

  it('calculates accurate summary for single result', () => {
    const summary = calculateProgressSummary([mockEntry1]);
    expect(summary.totalTests).toBe(1);
    expect(summary.averageNetWpm).toBe(60);
    expect(summary.bestNetWpm).toBe(60);
    expect(summary.averageAccuracy).toBe(95.0);
    expect(summary.recentNetWpm).toBe(60);
    expect(summary.recentAccuracy).toBe(95.0);
  });

  it('calculates accurate summary across multiple results', () => {
    // List stored newest first: mockEntry3, mockEntry2, mockEntry1
    const entries = [mockEntry3, mockEntry2, mockEntry1];
    const summary = calculateProgressSummary(entries);

    expect(summary.totalTests).toBe(3);
    // (80 + 72 + 60) / 3 = 212 / 3 = 70.666 -> 71 WPM
    expect(summary.averageNetWpm).toBe(71);
    expect(summary.bestNetWpm).toBe(80);
    // (100 + 98 + 95) / 3 = 293 / 3 = 97.666 -> 97.7%
    expect(summary.averageAccuracy).toBe(97.7);
    expect(summary.recentNetWpm).toBe(80);
    expect(summary.recentAccuracy).toBe(100.0);
  });

  it('aggregates weak characters across multiple tests with case normalization', () => {
    const entries = [mockEntry1, mockEntry2];
    const weak = aggregateWeakCharacters(entries, 5);

    // 'r' had 2 in mockEntry1 and 2 in mockEntry2 -> total 4 mistakes (in 2 tests)
    // 'e' had 3 in mockEntry1 -> total 3 mistakes
    // 't' had 1 in mockEntry2 -> total 1 mistake
    expect(weak.length).toBe(3);
    expect(weak[0].character).toBe('r');
    expect(weak[0].totalMistakes).toBe(4);
    expect(weak[0].testsCount).toBe(2);

    expect(weak[1].character).toBe('e');
    expect(weak[1].totalMistakes).toBe(3);
    expect(weak[1].testsCount).toBe(1);

    expect(weak[2].character).toBe('t');
    expect(weak[2].totalMistakes).toBe(1);
  });

  it('respects topN limit when aggregating weak characters', () => {
    const entries = [mockEntry1, mockEntry2];
    const weak = aggregateWeakCharacters(entries, 2);
    expect(weak.length).toBe(2);
    expect(weak.map((w) => w.character)).toEqual(['r', 'e']);
  });

  it('produces chronological trend points ordered oldest to newest', () => {
    // Stored newest first: [test_3, test_2, test_1]
    const entries = [mockEntry3, mockEntry2, mockEntry1];
    const trend = getProgressTrend(entries, 10);

    expect(trend.length).toBe(3);
    expect(trend[0].netWpm).toBe(60); // test_1 (oldest)
    expect(trend[1].netWpm).toBe(72); // test_2
    expect(trend[2].netWpm).toBe(80); // test_3 (newest)
    expect(trend[0].index).toBe(1);
    expect(trend[2].index).toBe(3);
  });
});

describe('Phase 5 — Test Result Mapping & Integration', () => {
  it('correctly maps completed TypingState and TypingAnalytics to TypingHistoryEntry', () => {
    const mockState: TypingState = {
      passage: { id: 'p1', title: 'Passage 1', text: 'Hello', language: 'en', difficulty: 'easy' },
      characters: [
        { char: 'H', state: 'correct' },
        { char: 'e', state: 'correct' },
        { char: 'l', state: 'incorrect', typedChar: 'x' },
        { char: 'l', state: 'correct' },
        { char: 'o', state: 'correct' },
      ],
      extraCharacters: [],
      currentIndex: 5,
      duration: 60,
      status: 'completed',
      startTime: 1000,
      endTime: 61000,
      totalKeystrokes: 5,
      correctStrokes: 4,
      incorrectStrokes: 1,
    };

    const mockAnalytics: TypingAnalytics = {
      metrics: {
        grossWPM: 50,
        netWPM: 48,
        accuracy: 80.0,
        elapsedSeconds: 60,
        remainingSeconds: 0,
        correctCharacters: 4,
        incorrectCharacters: 1,
        extraCharacters: 0,
        totalKeystrokes: 5,
        uncorrectedErrors: 1,
      },
      testDuration: 60,
      totalProcessedCharacters: 5,
      correctCharacters: 4,
      incorrectCharacters: 1,
      extraCharacters: 0,
      accuracy: 80.0,
      mostMistypedCharacters: [{ character: 'l', displayLabel: 'l', count: 1 }],
      mistakeDetails: [{ expected: 'l', typed: 'x', index: 2 }],
      hasMistakes: true,
    };

    const entry = createHistoryEntry(mockState, mockAnalytics, 1700000500000);

    expect(entry.timestamp).toBe(1700000500000);
    expect(entry.duration).toBe(60);
    expect(entry.netWpm).toBe(48);
    expect(entry.accuracy).toBe(80.0);
    expect(entry.mostMistypedCharacters).toEqual([{ character: 'l', displayLabel: 'l', count: 1 }]);
    expect(entry.id.startsWith('test_1700000500000_')).toBe(true);
  });
});
