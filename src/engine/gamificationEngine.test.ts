import { describe, it, expect } from 'vitest';
import { TypingHistoryEntry } from './progressTypes';
import {
  calculateTestXp,
  calculateCumulativeXp,
  calculateLevel,
  calculateDailyGoal,
  calculateStreak,
  evaluateAchievements,
  detectPersonalMilestones,
  getGamificationOverview,
  getLocalDateString,
  DAILY_TEST_GOAL,
} from './gamificationEngine';

function createEntry(
  overrides: Partial<TypingHistoryEntry> = {}
): TypingHistoryEntry {
  return {
    id: overrides.id ?? `entry-${Math.random()}`,
    timestamp: overrides.timestamp ?? Date.now(),
    duration: overrides.duration ?? 60,
    grossWpm: overrides.grossWpm ?? 50,
    netWpm: overrides.netWpm ?? 45,
    accuracy: overrides.accuracy ?? 96,
    totalKeystrokes: overrides.totalKeystrokes ?? 250,
    correctChars: overrides.correctChars ?? 240,
    incorrectChars: overrides.incorrectChars ?? 2,
    extraChars: overrides.extraChars ?? 0,
    mostMistypedCharacters: overrides.mostMistypedCharacters ?? [],
    ...overrides,
  };
}

describe('Gamification Engine', () => {
  describe('XP Calculations', () => {
    it('awards base 10 XP for standard test completion with low wpm and accuracy', () => {
      const entry = createEntry({ netWpm: 30, accuracy: 90 });
      const xp = calculateTestXp(entry);
      expect(xp.base).toBe(10);
      expect(xp.accuracyBonus).toBe(0);
      expect(xp.speedBonus).toBe(0);
      expect(xp.total).toBe(10);
    });

    it('awards accuracy bonuses at 95% and 98%', () => {
      const entry95 = createEntry({ netWpm: 30, accuracy: 95 });
      expect(calculateTestXp(entry95).accuracyBonus).toBe(5);
      expect(calculateTestXp(entry95).total).toBe(15);

      const entry97 = createEntry({ netWpm: 30, accuracy: 97 });
      expect(calculateTestXp(entry97).accuracyBonus).toBe(5);

      const entry98 = createEntry({ netWpm: 30, accuracy: 98 });
      expect(calculateTestXp(entry98).accuracyBonus).toBe(10);
      expect(calculateTestXp(entry98).total).toBe(20);

      const entry100 = createEntry({ netWpm: 30, accuracy: 100 });
      expect(calculateTestXp(entry100).accuracyBonus).toBe(10);
    });

    it('awards speed bonuses at 40, 60, and 80 Net WPM', () => {
      const entry39 = createEntry({ netWpm: 39, accuracy: 90 });
      expect(calculateTestXp(entry39).speedBonus).toBe(0);

      const entry40 = createEntry({ netWpm: 40, accuracy: 90 });
      expect(calculateTestXp(entry40).speedBonus).toBe(5);
      expect(calculateTestXp(entry40).total).toBe(15);

      const entry60 = createEntry({ netWpm: 60, accuracy: 90 });
      expect(calculateTestXp(entry60).speedBonus).toBe(10);
      expect(calculateTestXp(entry60).total).toBe(20);

      const entry85 = createEntry({ netWpm: 85, accuracy: 90 });
      expect(calculateTestXp(entry85).speedBonus).toBe(15);
      expect(calculateTestXp(entry85).total).toBe(25);
    });

    it('combines base XP, maximum accuracy bonus, and maximum speed bonus', () => {
      const topEntry = createEntry({ netWpm: 92, accuracy: 99 });
      const breakdown = calculateTestXp(topEntry);
      expect(breakdown.base).toBe(10);
      expect(breakdown.accuracyBonus).toBe(10);
      expect(breakdown.speedBonus).toBe(15);
      expect(breakdown.total).toBe(35);
    });

    it('calculates cumulative XP across multiple entries', () => {
      const entries = [
        createEntry({ netWpm: 30, accuracy: 90 }), // 10 XP
        createEntry({ netWpm: 45, accuracy: 96 }), // 10 + 5 + 5 = 20 XP
        createEntry({ netWpm: 80, accuracy: 99 }), // 10 + 10 + 15 = 35 XP
      ];
      expect(calculateCumulativeXp(entries)).toBe(65);
    });
  });

  describe('Level System', () => {
    it('calculates Level 1 for 0 to 99 XP', () => {
      const lvl0 = calculateLevel(0);
      expect(lvl0.level).toBe(1);
      expect(lvl0.currentXp).toBe(0);
      expect(lvl0.minXp).toBe(0);
      expect(lvl0.maxXp).toBe(99);
      expect(lvl0.xpIntoLevel).toBe(0);
      expect(lvl0.progressPercent).toBe(0);

      const lvl50 = calculateLevel(50);
      expect(lvl50.level).toBe(1);
      expect(lvl50.xpIntoLevel).toBe(50);
      expect(lvl50.progressPercent).toBe(50);

      const lvl99 = calculateLevel(99);
      expect(lvl99.level).toBe(1);
      expect(lvl99.xpIntoLevel).toBe(99);
      expect(lvl99.progressPercent).toBe(99);
    });

    it('calculates Level 2 for 100 to 249 XP', () => {
      const lvl100 = calculateLevel(100);
      expect(lvl100.level).toBe(2);
      expect(lvl100.minXp).toBe(100);
      expect(lvl100.maxXp).toBe(249);
      expect(lvl100.xpIntoLevel).toBe(0);
      expect(lvl100.xpForLevel).toBe(150);
      expect(lvl100.progressPercent).toBe(0);

      const lvl175 = calculateLevel(175);
      expect(lvl175.level).toBe(2);
      expect(lvl175.xpIntoLevel).toBe(75);
      expect(lvl175.progressPercent).toBe(50);
    });

    it('calculates Level 3 (250-499) and Level 4 (500-999)', () => {
      const lvl250 = calculateLevel(250);
      expect(lvl250.level).toBe(3);
      expect(lvl250.minXp).toBe(250);
      expect(lvl250.maxXp).toBe(499);

      const lvl500 = calculateLevel(500);
      expect(lvl500.level).toBe(4);
      expect(lvl500.minXp).toBe(500);
      expect(lvl500.maxXp).toBe(999);
    });

    it('scales to higher levels past Level 10 gracefully', () => {
      const highLvl = calculateLevel(12000);
      expect(highLvl.level).toBeGreaterThan(10);
      expect(highLvl.progressPercent).toBeGreaterThanOrEqual(0);
      expect(highLvl.progressPercent).toBeLessThanOrEqual(100);
    });
  });

  describe('Daily Goal', () => {
    const refDate = new Date(2026, 4, 15, 14, 30, 0); // May 15, 2026

    it('reports 0 completed tests when history is empty', () => {
      const goal = calculateDailyGoal([], refDate);
      expect(goal.target).toBe(DAILY_TEST_GOAL);
      expect(goal.completedToday).toBe(0);
      expect(goal.isCompleted).toBe(false);
      expect(goal.progressPercent).toBe(0);
    });

    it('counts only tests completed on the reference calendar day', () => {
      const todayTs = new Date(2026, 4, 15, 10, 0, 0).getTime();
      const yesterdayTs = new Date(2026, 4, 14, 23, 50, 0).getTime();

      const entries = [
        createEntry({ timestamp: yesterdayTs }),
        createEntry({ timestamp: todayTs }),
      ];

      const goal = calculateDailyGoal(entries, refDate);
      expect(goal.completedToday).toBe(1);
      expect(goal.isCompleted).toBe(false);
      expect(goal.progressPercent).toBe(33);
    });

    it('marks goal complete when 3 tests are reached', () => {
      const today1 = new Date(2026, 4, 15, 9, 0, 0).getTime();
      const today2 = new Date(2026, 4, 15, 11, 0, 0).getTime();
      const today3 = new Date(2026, 4, 15, 13, 0, 0).getTime();

      const entries = [
        createEntry({ timestamp: today1 }),
        createEntry({ timestamp: today2 }),
        createEntry({ timestamp: today3 }),
      ];

      const goal = calculateDailyGoal(entries, refDate);
      expect(goal.completedToday).toBe(3);
      expect(goal.isCompleted).toBe(true);
      expect(goal.progressPercent).toBe(100);
    });

    it('handles exceeding the daily goal correctly (capped at 100% progress)', () => {
      const entries = [
        createEntry({ timestamp: new Date(2026, 4, 15, 8, 0).getTime() }),
        createEntry({ timestamp: new Date(2026, 4, 15, 9, 0).getTime() }),
        createEntry({ timestamp: new Date(2026, 4, 15, 10, 0).getTime() }),
        createEntry({ timestamp: new Date(2026, 4, 15, 11, 0).getTime() }),
      ];

      const goal = calculateDailyGoal(entries, refDate);
      expect(goal.completedToday).toBe(4);
      expect(goal.isCompleted).toBe(true);
      expect(goal.progressPercent).toBe(100);
    });
  });

  describe('Streak Calculation', () => {
    it('returns zero streak for empty history', () => {
      const streak = calculateStreak([], new Date(2026, 4, 15));
      expect(streak.currentStreak).toBe(0);
      expect(streak.longestStreak).toBe(0);
      expect(streak.isActiveToday).toBe(false);
      expect(streak.lastActiveDate).toBeNull();
    });

    it('recognizes a 1-day streak when active today', () => {
      const refDate = new Date(2026, 4, 15, 12, 0);
      const entries = [createEntry({ timestamp: refDate.getTime() })];

      const streak = calculateStreak(entries, refDate);
      expect(streak.currentStreak).toBe(1);
      expect(streak.longestStreak).toBe(1);
      expect(streak.isActiveToday).toBe(true);
      expect(streak.lastActiveDate).toBe(getLocalDateString(refDate));
    });

    it('maintains streak on the next day before testing (1-day grace period)', () => {
      const day1 = new Date(2026, 4, 14, 18, 0);
      const day2Ref = new Date(2026, 4, 15, 10, 0); // Next morning

      const entries = [createEntry({ timestamp: day1.getTime() })];
      const streak = calculateStreak(entries, day2Ref);

      expect(streak.currentStreak).toBe(1);
      expect(streak.isActiveToday).toBe(false);
      expect(streak.longestStreak).toBe(1);
      expect(streak.lastActiveDate).toBe(getLocalDateString(day1));
    });

    it('does not count multiple tests on the same day as multiple streak days', () => {
      const refDate = new Date(2026, 4, 15, 18, 0);
      const entries = [
        createEntry({ timestamp: new Date(2026, 4, 15, 9, 0).getTime() }),
        createEntry({ timestamp: new Date(2026, 4, 15, 12, 0).getTime() }),
        createEntry({ timestamp: new Date(2026, 4, 15, 15, 0).getTime() }),
      ];

      const streak = calculateStreak(entries, refDate);
      expect(streak.currentStreak).toBe(1);
      expect(streak.longestStreak).toBe(1);
    });

    it('calculates 3 consecutive active days', () => {
      const day1 = new Date(2026, 4, 13, 10, 0).getTime();
      const day2 = new Date(2026, 4, 14, 15, 0).getTime();
      const day3 = new Date(2026, 4, 15, 20, 0).getTime();
      const refDate = new Date(2026, 4, 15, 21, 0);

      const entries = [
        createEntry({ timestamp: day1 }),
        createEntry({ timestamp: day2 }),
        createEntry({ timestamp: day3 }),
      ];

      const streak = calculateStreak(entries, refDate);
      expect(streak.currentStreak).toBe(3);
      expect(streak.longestStreak).toBe(3);
      expect(streak.isActiveToday).toBe(true);
    });

    it('resets current streak after a gap of 1+ calendar days, but preserves longest streak', () => {
      const day1 = new Date(2026, 4, 10, 10, 0).getTime();
      const day2 = new Date(2026, 4, 11, 10, 0).getTime();
      const day3 = new Date(2026, 4, 12, 10, 0).getTime();
      // Gap: 13th and 14th skipped
      const day6 = new Date(2026, 4, 15, 10, 0).getTime();
      const refDate = new Date(2026, 4, 15, 12, 0);

      const entries = [
        createEntry({ timestamp: day1 }),
        createEntry({ timestamp: day2 }),
        createEntry({ timestamp: day3 }),
        createEntry({ timestamp: day6 }),
      ];

      const streak = calculateStreak(entries, refDate);
      expect(streak.currentStreak).toBe(1);
      expect(streak.longestStreak).toBe(3);
    });

    it('handles month boundaries correctly', () => {
      const may31 = new Date(2026, 4, 31, 23, 30).getTime();
      const jun01 = new Date(2026, 5, 1, 8, 30).getTime();
      const refDate = new Date(2026, 5, 1, 12, 0);

      const entries = [
        createEntry({ timestamp: may31 }),
        createEntry({ timestamp: jun01 }),
      ];

      const streak = calculateStreak(entries, refDate);
      expect(streak.currentStreak).toBe(2);
      expect(streak.longestStreak).toBe(2);
    });

    it('handles year boundaries correctly', () => {
      const dec31 = new Date(2025, 11, 31, 22, 0).getTime();
      const jan01 = new Date(2026, 0, 1, 9, 0).getTime();
      const refDate = new Date(2026, 0, 1, 12, 0);

      const entries = [
        createEntry({ timestamp: dec31 }),
        createEntry({ timestamp: jan01 }),
      ];

      const streak = calculateStreak(entries, refDate);
      expect(streak.currentStreak).toBe(2);
      expect(streak.longestStreak).toBe(2);
    });
  });

  describe('Achievements', () => {
    it('initializes all 10 achievements as locked when history is empty', () => {
      const achievements = evaluateAchievements([]);
      expect(achievements).toHaveLength(10);
      expect(achievements.every((a) => !a.isUnlocked)).toBe(true);
      expect(achievements.every((a) => a.unlockedAt === null)).toBe(true);
    });

    it('unlocks first-test on 1 completed test', () => {
      const entry = createEntry({ netWpm: 35, accuracy: 90 });
      const achievements = evaluateAchievements([entry]);
      const first = achievements.find((a) => a.id === 'first-test');
      expect(first?.isUnlocked).toBe(true);
      expect(first?.unlockedAt).toBe(entry.timestamp);

      const tests5 = achievements.find((a) => a.id === 'tests-5');
      expect(tests5?.isUnlocked).toBe(false);
    });

    it('unlocks tests-5 and tests-10 at corresponding counts', () => {
      const entries5 = Array.from({ length: 5 }, (_, i) =>
        createEntry({ timestamp: 1000 + i * 100 })
      );
      const a5 = evaluateAchievements(entries5);
      expect(a5.find((a) => a.id === 'tests-5')?.isUnlocked).toBe(true);
      expect(a5.find((a) => a.id === 'tests-10')?.isUnlocked).toBe(false);

      const entries10 = Array.from({ length: 10 }, (_, i) =>
        createEntry({ timestamp: 1000 + i * 100 })
      );
      const a10 = evaluateAchievements(entries10);
      expect(a10.find((a) => a.id === 'tests-10')?.isUnlocked).toBe(true);
    });

    it('unlocks speed tiers: 40, 60, and 80 WPM', () => {
      const low = createEntry({ netWpm: 38 });
      expect(evaluateAchievements([low]).find((a) => a.id === 'speed-40')?.isUnlocked).toBe(false);

      const med = createEntry({ netWpm: 45 });
      const aMed = evaluateAchievements([low, med]);
      expect(aMed.find((a) => a.id === 'speed-40')?.isUnlocked).toBe(true);
      expect(aMed.find((a) => a.id === 'speed-60')?.isUnlocked).toBe(false);

      const fast = createEntry({ netWpm: 65 });
      const aFast = evaluateAchievements([low, med, fast]);
      expect(aFast.find((a) => a.id === 'speed-60')?.isUnlocked).toBe(true);
      expect(aFast.find((a) => a.id === 'speed-80')?.isUnlocked).toBe(false);

      const demon = createEntry({ netWpm: 88 });
      const aDemon = evaluateAchievements([low, med, fast, demon]);
      expect(aDemon.find((a) => a.id === 'speed-80')?.isUnlocked).toBe(true);
    });

    it('unlocks accuracy tiers: 95% and 98%', () => {
      const e94 = createEntry({ accuracy: 94.5 });
      expect(evaluateAchievements([e94]).find((a) => a.id === 'accuracy-95')?.isUnlocked).toBe(false);

      const e95 = createEntry({ accuracy: 95 });
      const a95 = evaluateAchievements([e94, e95]);
      expect(a95.find((a) => a.id === 'accuracy-95')?.isUnlocked).toBe(true);
      expect(a95.find((a) => a.id === 'accuracy-98')?.isUnlocked).toBe(false);

      const e99 = createEntry({ accuracy: 99 });
      const a98 = evaluateAchievements([e94, e95, e99]);
      expect(a98.find((a) => a.id === 'accuracy-98')?.isUnlocked).toBe(true);
    });

    it('unlocks streak achievements at 3 and 7 consecutive days', () => {
      const days = [
        new Date(2026, 4, 1, 10, 0).getTime(),
        new Date(2026, 4, 2, 10, 0).getTime(),
        new Date(2026, 4, 3, 10, 0).getTime(),
      ];
      const entries = days.map((t) => createEntry({ timestamp: t }));
      const a = evaluateAchievements(entries);
      expect(a.find((ach) => ach.id === 'streak-3')?.isUnlocked).toBe(true);
      expect(a.find((ach) => ach.id === 'streak-7')?.isUnlocked).toBe(false);

      const days7 = Array.from({ length: 7 }, (_, i) =>
        new Date(2026, 4, 1 + i, 10, 0).getTime()
      );
      const entries7 = days7.map((t) => createEntry({ timestamp: t }));
      const a7 = evaluateAchievements(entries7);
      expect(a7.find((ach) => ach.id === 'streak-7')?.isUnlocked).toBe(true);
    });
  });

  describe('Personal Milestones', () => {
    it('returns empty milestones when history is empty', () => {
      const pm = detectPersonalMilestones([]);
      expect(pm.hasCompletedFirstTest).toBe(false);
      expect(pm.bestNetWpm).toBe(0);
      expect(pm.bestAccuracy).toBe(0);
    });

    it('detects best WPM and accuracy across entries', () => {
      const entries = [
        createEntry({ netWpm: 45, accuracy: 92 }),
        createEntry({ netWpm: 60, accuracy: 90 }),
        createEntry({ netWpm: 55, accuracy: 98 }),
      ];

      const pm = detectPersonalMilestones(entries);
      expect(pm.hasCompletedFirstTest).toBe(true);
      expect(pm.bestNetWpm).toBe(60);
      expect(pm.bestAccuracy).toBe(98);
    });
  });

  describe('Gamification Overview Master Aggregator', () => {
    it('assembles all subsystems deterministically', () => {
      const refDate = new Date(2026, 4, 15, 12, 0);
      const entries = [
        createEntry({ timestamp: refDate.getTime(), netWpm: 50, accuracy: 96 }),
      ];

      const overview = getGamificationOverview(entries, refDate);
      expect(overview.totalXp).toBe(20); // 10 base + 5 acc + 5 speed
      expect(overview.level.level).toBe(1);
      expect(overview.dailyGoal.completedToday).toBe(1);
      expect(overview.streak.currentStreak).toBe(1);
      expect(overview.achievements.find((a) => a.id === 'first-test')?.isUnlocked).toBe(true);
      expect(overview.milestones.bestNetWpm).toBe(50);
    });
  });
});
