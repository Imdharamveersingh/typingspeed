import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearHistory,
  createHistoryEntry,
  loadHistory,
  saveHistoryEntry,
  STORAGE_KEY,
} from './progressStorage';
import { calculateProgressSummary } from './progressAnalytics';
import {
  calculateCumulativeXp,
  calculateDailyGoal,
  calculateLevel,
  calculateStreak,
  calculateTestXp,
} from './gamificationEngine';
import { createInitialState, processInputText } from './typingEngine';
import { analyzeTypingResult } from './analytics';
import { Passage } from './types';
import { TypingHistoryEntry } from './progressTypes';

const mockHindiPassage: Passage = {
  id: 'hindi-progress-pass',
  title: 'भारत और प्रगति',
  language: 'hi',
  difficulty: 'easy',
  text: 'भारत एक महान देश है।',
};

describe('Hindi Progress & Gamification Integration', () => {
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
    clearHistory();
  });

  describe('1. History Storage & Metadata', () => {
    it('creates and saves history entry with language: "hi"', () => {
      let state = createInitialState(mockHindiPassage, 60);
      state = processInputText(state, 'भारत एक महान देश है।', 1000);
      state.status = 'completed';
      state.endTime = 1000 + 45000;

      const analytics = analyzeTypingResult(state);
      const entry = createHistoryEntry(state, analytics, 10000, 'standard');

      expect(entry.language).toBe('hi');
      expect(entry.duration).toBe(60);
      expect(entry.correctChars).toBe(16);
      expect(entry.accuracy).toBe(100);

      const saved = saveHistoryEntry(entry);
      expect(saved).toBe(true);

      const loaded = loadHistory();
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe(entry.id);
      expect(loaded[0].language).toBe('hi');
    });

    it('maintains 100% backward compatibility with legacy entries without language property', () => {
      // Simulate raw localStorage with legacy entries missing the 'language' field
      const legacyEntry: TypingHistoryEntry = {
        id: 'legacy-test-01',
        timestamp: Date.now() - 100000,
        duration: 60,
        grossWpm: 45,
        netWpm: 43,
        accuracy: 97.5,
        totalKeystrokes: 225,
        correctChars: 215,
        incorrectChars: 5,
        extraChars: 0,
        mostMistypedCharacters: [],
        testMode: 'standard',
      };

      const envelope = {
        version: 1,
        entries: [legacyEntry],
      };

      localStorageStore[STORAGE_KEY] = JSON.stringify(envelope);

      const loaded = loadHistory();
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('legacy-test-01');
      expect(loaded[0].language).toBeUndefined(); // Legacy remains valid without language

      // Progress analytics works seamlessly with mixed legacy and new entries
      const summary = calculateProgressSummary(loaded);
      expect(summary.totalTests).toBe(1);
      expect(summary.bestNetWpm).toBe(43);
    });

    it('handles mixed English and Hindi history entries in progress analytics', () => {
      const now = Date.now();
      const englishEntry: TypingHistoryEntry = {
        id: 'en-test-01',
        timestamp: now - 3600000,
        duration: 60,
        grossWpm: 50,
        netWpm: 48,
        accuracy: 98,
        totalKeystrokes: 250,
        correctChars: 245,
        incorrectChars: 5,
        extraChars: 0,
        mostMistypedCharacters: [],
        language: 'en',
      };

      const hindiEntry: TypingHistoryEntry = {
        id: 'hi-test-01',
        timestamp: now,
        duration: 60,
        grossWpm: 32,
        netWpm: 30,
        accuracy: 96,
        totalKeystrokes: 160,
        correctChars: 155,
        incorrectChars: 5,
        extraChars: 0,
        mostMistypedCharacters: [],
        language: 'hi',
      };

      saveHistoryEntry(englishEntry);
      saveHistoryEntry(hindiEntry);

      const loaded = loadHistory();
      expect(loaded.length).toBe(2);

      const summary = calculateProgressSummary(loaded);
      expect(summary.totalTests).toBe(2);
      expect(summary.bestNetWpm).toBe(48);
      // Average Net WPM: (48 + 30) / 2 = 39
      expect(summary.averageNetWpm).toBe(39);
    });
  });

  describe('2. Gamification Integration with Hindi Tests', () => {
    it('awards deterministic XP for completed Hindi test', () => {
      const hindiEntry: TypingHistoryEntry = {
        id: 'hi-xp-test',
        timestamp: Date.now(),
        duration: 60,
        grossWpm: 45,
        netWpm: 42,
        accuracy: 98.5,
        totalKeystrokes: 220,
        correctChars: 215,
        incorrectChars: 2,
        extraChars: 0,
        mostMistypedCharacters: [],
        language: 'hi',
      };

      const xp = calculateTestXp(hindiEntry);
      // Base: 10
      // Accuracy >= 98%: +10
      // Speed >= 40 WPM: +5
      // Total: 25 XP
      expect(xp.base).toBe(10);
      expect(xp.accuracyBonus).toBe(10);
      expect(xp.speedBonus).toBe(5);
      expect(xp.total).toBe(25);
    });

    it('contributes Hindi test to Daily Goal and Streak tracking', () => {
      const now = Date.now();
      const hindiEntry1: TypingHistoryEntry = {
        id: 'hi-dg-1',
        timestamp: now,
        duration: 60,
        grossWpm: 35,
        netWpm: 32,
        accuracy: 96,
        totalKeystrokes: 170,
        correctChars: 165,
        incorrectChars: 5,
        extraChars: 0,
        mostMistypedCharacters: [],
        language: 'hi',
      };

      const hindiEntry2: TypingHistoryEntry = {
        id: 'hi-dg-2',
        timestamp: now + 60000,
        duration: 60,
        grossWpm: 38,
        netWpm: 36,
        accuracy: 97,
        totalKeystrokes: 185,
        correctChars: 180,
        incorrectChars: 5,
        extraChars: 0,
        mostMistypedCharacters: [],
        language: 'hi',
      };

      saveHistoryEntry(hindiEntry1);
      saveHistoryEntry(hindiEntry2);

      const history = loadHistory();

      // Daily goal check (2 / 3)
      const dailyGoal = calculateDailyGoal(history, new Date(now));
      expect(dailyGoal.completedToday).toBe(2);
      expect(dailyGoal.isCompleted).toBe(false);

      // Streak check
      const streak = calculateStreak(history, new Date(now));
      expect(streak.currentStreak).toBe(1);

      // Level / XP check
      const cumulativeXp = calculateCumulativeXp(history);
      expect(cumulativeXp).toBeGreaterThan(0);
      const level = calculateLevel(cumulativeXp);
      expect(level.level).toBeGreaterThanOrEqual(1);
    });
  });
});
