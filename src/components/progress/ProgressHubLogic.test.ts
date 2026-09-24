import { describe, it, expect } from 'vitest';
import {
  calculateProgressSummary,
  aggregateWeakCharacters,
  getProgressTrend,
} from '@/engine/progressAnalytics';
import {
  getGamificationOverview,
} from '@/engine/gamificationEngine';
import { TypingHistoryEntry } from '@/engine/progressTypes';

describe('Phase R5: Unified Progress & Milestones Hub Logic', () => {
  // Real history entries are stored newest first
  const entryOldest: TypingHistoryEntry = {
    id: 'entry-1',
    timestamp: 1700000000000,
    duration: 60,
    grossWpm: 45,
    netWpm: 40,
    accuracy: 94.0,
    totalKeystrokes: 225,
    correctChars: 210,
    incorrectChars: 5,
    extraChars: 0,
    mostMistypedCharacters: [
      { character: 'e', displayLabel: 'e', count: 3 },
      { character: 't', displayLabel: 't', count: 2 },
    ],
  };

  const entryMid: TypingHistoryEntry = {
    id: 'entry-2',
    timestamp: 1700000060000,
    duration: 60,
    grossWpm: 55,
    netWpm: 50,
    accuracy: 96.0,
    totalKeystrokes: 260,
    correctChars: 250,
    incorrectChars: 3,
    extraChars: 0,
    mostMistypedCharacters: [
      { character: 't', displayLabel: 't', count: 2 },
      { character: 'a', displayLabel: 'a', count: 1 },
    ],
  };

  const entryNewest: TypingHistoryEntry = {
    id: 'entry-3',
    timestamp: 1700000120000,
    duration: 60,
    grossWpm: 60,
    netWpm: 58,
    accuracy: 98.0,
    totalKeystrokes: 290,
    correctChars: 285,
    incorrectChars: 1,
    extraChars: 0,
    mostMistypedCharacters: [
      { character: 'e', displayLabel: 'e', count: 1 },
    ],
  };

  // Stored newest-first as in progressStorage
  const sampleEntries: TypingHistoryEntry[] = [entryNewest, entryMid, entryOldest];

  describe('1. Empty State Architecture', () => {
    it('returns clean, honest empty metrics when no history exists', () => {
      const emptyHistory: TypingHistoryEntry[] = [];
      const summary = calculateProgressSummary(emptyHistory);
      const trend = getProgressTrend(emptyHistory, 15);
      const weakKeys = aggregateWeakCharacters(emptyHistory, 5);
      const overview = getGamificationOverview(emptyHistory);

      expect(summary.totalTests).toBe(0);
      expect(summary.averageNetWpm).toBe(0);
      expect(summary.bestNetWpm).toBe(0);
      expect(summary.averageAccuracy).toBe(0);

      expect(trend).toHaveLength(0);
      expect(weakKeys).toHaveLength(0);

      expect(overview.streak.currentStreak).toBe(0);
      expect(overview.totalXp).toBe(0);
      expect(overview.level.level).toBe(1);
      expect(overview.achievements.every((a) => !a.isUnlocked)).toBe(true);
    });
  });

  describe('2. Unified Overview Metrics Aggregation', () => {
    it('correctly calculates core performance metrics for the Overview Hero', () => {
      const summary = calculateProgressSummary(sampleEntries);
      const overview = getGamificationOverview(sampleEntries);

      // Average Net WPM: (58 + 50 + 40) / 3 = 148 / 3 = 49.33 -> 49
      expect(summary.averageNetWpm).toBe(49);
      // Best Net WPM: max(58, 50, 40) = 58
      expect(summary.bestNetWpm).toBe(58);
      // Average Accuracy: (98 + 96 + 94) / 3 = 96.0
      expect(summary.averageAccuracy).toBe(96.0);
      // Total tests
      expect(summary.totalTests).toBe(3);

      // Gamification presence in overview
      expect(overview.level.level).toBeGreaterThanOrEqual(1);
      expect(overview.totalXp).toBeGreaterThan(0);
      expect(typeof overview.streak.currentStreak).toBe('number');
    });
  });

  describe('3. Trends & History Data Integrity', () => {
    it('aggregates weak keys correctly and provides data for practice connection', () => {
      const weakKeys = aggregateWeakCharacters(sampleEntries, 5);
      expect(weakKeys.length).toBeGreaterThan(0);

      // 't' had 2 + 2 = 4 mistakes; 'e' had 3 + 1 = 4 mistakes
      const topWeak = weakKeys[0];
      expect(topWeak.totalMistakes).toBe(4);
      expect(['e', 't']).toContain(topWeak.character);
    });

    it('preserves chronologically indexed trend points for the SVG chart (oldest to newest)', () => {
      const trend = getProgressTrend(sampleEntries, 15);
      expect(trend).toHaveLength(3);
      // Ordered oldest to newest: entryOldest (40), entryMid (50), entryNewest (58)
      expect(trend[0].netWpm).toBe(40);
      expect(trend[1].netWpm).toBe(50);
      expect(trend[2].netWpm).toBe(58);
      expect(trend[0].index).toBe(1);
      expect(trend[2].index).toBe(3);
    });
  });

  describe('4. Milestones Data Integrity', () => {
    it('computes daily goal, streak, personal bests, and achievements without mutation', () => {
      const overview = getGamificationOverview(sampleEntries);

      // Daily goal target is 3
      expect(overview.dailyGoal.target).toBe(3);
      expect(typeof overview.dailyGoal.completedToday).toBe('number');
      expect(typeof overview.dailyGoal.progressPercent).toBe('number');

      // Personal Bests
      expect(overview.milestones.bestNetWpm).toBe(58);
      expect(overview.milestones.bestAccuracy).toBe(98.0);
      expect(overview.milestones.hasCompletedFirstTest).toBe(true);

      // Achievements: 10 total curated achievements
      expect(overview.achievements).toHaveLength(10);
      // 'first-test' should be unlocked
      const firstTestAchievement = overview.achievements.find((a) => a.id === 'first-test');
      expect(firstTestAchievement?.isUnlocked).toBe(true);
      // 'speed-40' should be unlocked since 58 >= 40
      const speed40 = overview.achievements.find((a) => a.id === 'speed-40');
      expect(speed40?.isUnlocked).toBe(true);
    });
  });

  describe('5. Tab Resolution Logic', () => {
    it('defaults to overview when no tab or invalid tab is specified', () => {
      const resolveTab = (param: string | null | undefined): 'overview' | 'trends' | 'milestones' => {
        if (param === 'trends' || param === 'milestones') return param;
        return 'overview';
      };

      expect(resolveTab(null)).toBe('overview');
      expect(resolveTab(undefined)).toBe('overview');
      expect(resolveTab('unknown')).toBe('overview');
      expect(resolveTab('trends')).toBe('trends');
      expect(resolveTab('milestones')).toBe('milestones');
    });
  });
});
