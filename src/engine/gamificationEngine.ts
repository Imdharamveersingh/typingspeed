import { TypingHistoryEntry } from './progressTypes';
import {
  Achievement,
  DailyGoal,
  GamificationOverview,
  LevelInfo,
  PersonalMilestones,
  StreakInfo,
  XpBreakdown,
} from './gamificationTypes';

export const DAILY_TEST_GOAL = 3;

/**
 * Returns a local calendar date string (YYYY-MM-DD) for a timestamp or Date object.
 * Strictly respects the browser / local timezone instead of UTC.
 */
export function getLocalDateString(dateInput: number | Date): string {
  const d = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a YYYY-MM-DD string into local midnight epoch days for streak continuity checks.
 */
function dateStringToLocalDays(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Math.round(date.getTime() / (1000 * 60 * 60 * 24));
}

/**
 * Pure deterministic calculation of XP earned from a single completed test.
 */
export function calculateTestXp(entry: TypingHistoryEntry): XpBreakdown {
  const base = 10;

  // Accuracy bonus
  let accuracyBonus = 0;
  if (entry.accuracy >= 98) {
    accuracyBonus = 10;
  } else if (entry.accuracy >= 95) {
    accuracyBonus = 5;
  }

  // Speed bonus (Net WPM)
  let speedBonus = 0;
  if (entry.netWpm >= 80) {
    speedBonus = 15;
  } else if (entry.netWpm >= 60) {
    speedBonus = 10;
  } else if (entry.netWpm >= 40) {
    speedBonus = 5;
  }

  return {
    base,
    accuracyBonus,
    speedBonus,
    total: base + accuracyBonus + speedBonus,
  };
}

/**
 * Calculates cumulative total XP earned across all completed tests in history.
 */
export function calculateCumulativeXp(entries: TypingHistoryEntry[]): number {
  return entries.reduce((acc, curr) => acc + calculateTestXp(curr).total, 0);
}

/**
 * Level tier thresholds conforming to specification:
 * Level 1: 0–99
 * Level 2: 100–249
 * Level 3: 250–499
 * Level 4: 500–999
 * Level 5: 1000–1749, etc.
 */
const BASE_LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, maxXp: 99 },
  { level: 2, minXp: 100, maxXp: 249 },
  { level: 3, minXp: 250, maxXp: 499 },
  { level: 4, minXp: 500, maxXp: 999 },
  { level: 5, minXp: 1000, maxXp: 1749 },
  { level: 6, minXp: 1750, maxXp: 2749 },
  { level: 7, minXp: 2750, maxXp: 3999 },
  { level: 8, minXp: 4000, maxXp: 5499 },
  { level: 9, minXp: 5500, maxXp: 7249 },
  { level: 10, minXp: 7250, maxXp: 9999 },
];

/**
 * Derives current level, level tier boundaries, and progress toward next level.
 */
export function calculateLevel(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, totalXp);

  // Check defined tiers
  for (const tier of BASE_LEVEL_THRESHOLDS) {
    if (safeXp >= tier.minXp && safeXp <= tier.maxXp) {
      const xpIntoLevel = safeXp - tier.minXp;
      const xpForLevel = tier.maxXp - tier.minXp + 1;
      const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100));
      return {
        level: tier.level,
        currentXp: safeXp,
        minXp: tier.minXp,
        maxXp: tier.maxXp,
        xpIntoLevel,
        xpForLevel,
        progressPercent,
      };
    }
  }

  // Beyond Level 10 dynamic tiering
  let level = 10;
  let minXp = 7250;
  let maxXp = 9999;
  let span = 3000;

  while (safeXp > maxXp) {
    level += 1;
    minXp = maxXp + 1;
    maxXp = minXp + span - 1;
    span += 500;
  }

  const xpIntoLevel = safeXp - minXp;
  const xpForLevel = maxXp - minXp + 1;
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100));

  return {
    level,
    currentXp: safeXp,
    minXp,
    maxXp,
    xpIntoLevel,
    xpForLevel,
    progressPercent,
  };
}

/**
 * Calculates today's progress toward the daily completed test goal.
 */
export function calculateDailyGoal(
  entries: TypingHistoryEntry[],
  referenceDate = new Date(),
  target = DAILY_TEST_GOAL
): DailyGoal {
  const todayStr = getLocalDateString(referenceDate);
  const completedToday = entries.filter((e) => getLocalDateString(e.timestamp) === todayStr).length;
  const isCompleted = completedToday >= target;
  const progressPercent = target > 0 ? Math.min(100, Math.round((completedToday / target) * 100)) : 100;

  return {
    target,
    completedToday,
    isCompleted,
    progressPercent,
  };
}

/**
 * Calculates current practice streak and all-time longest streak from test timestamps.
 * Uses local calendar day boundaries.
 */
export function calculateStreak(
  entries: TypingHistoryEntry[],
  referenceDate = new Date()
): StreakInfo {
  if (entries.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      isActiveToday: false,
    };
  }

  // Extract unique local dates
  const uniqueDates = Array.from(new Set(entries.map((e) => getLocalDateString(e.timestamp)))).sort();

  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      isActiveToday: false,
    };
  }

  const todayStr = getLocalDateString(referenceDate);
  const todayDays = dateStringToLocalDays(todayStr);
  const isActiveToday = uniqueDates.includes(todayStr);
  const lastActiveDate = uniqueDates[uniqueDates.length - 1];

  // Convert dates to epoch days
  const dayNumbers = uniqueDates.map(dateStringToLocalDays);

  // 1. Calculate longest streak across history
  let longestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < dayNumbers.length; i++) {
    if (dayNumbers[i] === dayNumbers[i - 1] + 1) {
      currentRun += 1;
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
    } else if (dayNumbers[i] > dayNumbers[i - 1] + 1) {
      currentRun = 1;
    }
  }

  // 2. Calculate current streak relative to referenceDate
  const lastDay = dayNumbers[dayNumbers.length - 1];
  const daysDiff = todayDays - lastDay;

  // If the last test was more than 1 day ago (2+ calendar days), the streak has broken
  let currentStreak = 0;
  if (daysDiff === 0 || daysDiff === 1) {
    // Walk backward from the last active day
    currentStreak = 1;
    for (let i = dayNumbers.length - 1; i > 0; i--) {
      if (dayNumbers[i] === dayNumbers[i - 1] + 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
    isActiveToday,
  };
}

/**
 * 10 Curated Achievements evaluated deterministically from test history.
 */
export function evaluateAchievements(
  entries: TypingHistoryEntry[],
  streakInfo?: StreakInfo
): Achievement[] {
  // Chronological order (oldest to newest) to identify first unlock timestamp
  const chronological = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const totalCount = entries.length;
  const bestWpm = entries.length > 0 ? Math.max(...entries.map((e) => e.netWpm)) : 0;
  const bestAccuracy = entries.length > 0 ? Math.max(...entries.map((e) => e.accuracy)) : 0;

  const streak = streakInfo ?? calculateStreak(entries);
  const maxStreak = Math.max(streak.longestStreak, streak.currentStreak);

  // Helper finding first entry matching condition
  const findUnlockTime = (predicate: (entry: TypingHistoryEntry) => boolean): number | null => {
    const found = chronological.find(predicate);
    return found ? found.timestamp : null;
  };

  const firstTestUnlock = chronological[0]?.timestamp ?? null;
  const tests5Unlock = chronological[4]?.timestamp ?? null;
  const tests10Unlock = chronological[9]?.timestamp ?? null;

  const speed40Unlock = findUnlockTime((e) => e.netWpm >= 40);
  const speed60Unlock = findUnlockTime((e) => e.netWpm >= 60);
  const speed80Unlock = findUnlockTime((e) => e.netWpm >= 80);

  const acc95Unlock = findUnlockTime((e) => e.accuracy >= 95);
  const acc98Unlock = findUnlockTime((e) => e.accuracy >= 98);

  // For streak achievements, unlock timestamp is the last recorded test when streak condition was met
  const streak3Unlock = maxStreak >= 3 ? chronological[chronological.length - 1]?.timestamp ?? null : null;
  const streak7Unlock = maxStreak >= 7 ? chronological[chronological.length - 1]?.timestamp ?? null : null;

  return [
    {
      id: 'first-test',
      title: 'First Keystrokes',
      description: 'Complete 1 typing test.',
      category: 'tests',
      isUnlocked: totalCount >= 1,
      unlockedAt: firstTestUnlock,
      progressText: `${Math.min(1, totalCount)} / 1 test`,
    },
    {
      id: 'tests-5',
      title: 'Getting Started',
      description: 'Complete 5 typing tests.',
      category: 'tests',
      isUnlocked: totalCount >= 5,
      unlockedAt: tests5Unlock,
      progressText: `${Math.min(5, totalCount)} / 5 tests`,
    },
    {
      id: 'tests-10',
      title: 'Regular Typist',
      description: 'Complete 10 typing tests.',
      category: 'tests',
      isUnlocked: totalCount >= 10,
      unlockedAt: tests10Unlock,
      progressText: `${Math.min(10, totalCount)} / 10 tests`,
    },
    {
      id: 'speed-40',
      title: 'Pace Setter',
      description: 'Reach 40+ Net WPM in a test.',
      category: 'speed',
      isUnlocked: bestWpm >= 40,
      unlockedAt: speed40Unlock,
      progressText: `Best: ${bestWpm} / 40 WPM`,
    },
    {
      id: 'speed-60',
      title: 'Rapid Fingers',
      description: 'Reach 60+ Net WPM in a test.',
      category: 'speed',
      isUnlocked: bestWpm >= 60,
      unlockedAt: speed60Unlock,
      progressText: `Best: ${bestWpm} / 60 WPM`,
    },
    {
      id: 'speed-80',
      title: 'Speed Demon',
      description: 'Reach 80+ Net WPM in a test.',
      category: 'speed',
      isUnlocked: bestWpm >= 80,
      unlockedAt: speed80Unlock,
      progressText: `Best: ${bestWpm} / 80 WPM`,
    },
    {
      id: 'accuracy-95',
      title: 'Sharp Shooter',
      description: 'Reach 95% or higher accuracy.',
      category: 'accuracy',
      isUnlocked: bestAccuracy >= 95,
      unlockedAt: acc95Unlock,
      progressText: `Best: ${bestAccuracy}% / 95%`,
    },
    {
      id: 'accuracy-98',
      title: 'Near Perfection',
      description: 'Reach 98% or higher accuracy.',
      category: 'accuracy',
      isUnlocked: bestAccuracy >= 98,
      unlockedAt: acc98Unlock,
      progressText: `Best: ${bestAccuracy}% / 98%`,
    },
    {
      id: 'streak-3',
      title: 'Three-Day Streak',
      description: 'Practice on 3 consecutive calendar days.',
      category: 'streak',
      isUnlocked: maxStreak >= 3,
      unlockedAt: streak3Unlock,
      progressText: `Streak: ${maxStreak} / 3 days`,
    },
    {
      id: 'streak-7',
      title: 'Seven-Day Streak',
      description: 'Practice on 7 consecutive calendar days.',
      category: 'streak',
      isUnlocked: maxStreak >= 7,
      unlockedAt: streak7Unlock,
      progressText: `Streak: ${maxStreak} / 7 days`,
    },
  ];
}

/**
 * Detects personal milestone achievements from historical entries.
 */
export function detectPersonalMilestones(entries: TypingHistoryEntry[]): PersonalMilestones {
  if (entries.length === 0) {
    return {
      hasCompletedFirstTest: false,
      bestNetWpm: 0,
      bestAccuracy: 0,
    };
  }

  return {
    hasCompletedFirstTest: true,
    bestNetWpm: Math.max(...entries.map((e) => e.netWpm)),
    bestAccuracy: Math.max(...entries.map((e) => e.accuracy)),
  };
}

/**
 * Master aggregation returning full gamification state from history.
 */
export function getGamificationOverview(
  entries: TypingHistoryEntry[],
  referenceDate = new Date()
): GamificationOverview {
  const totalXp = calculateCumulativeXp(entries);
  const level = calculateLevel(totalXp);
  const dailyGoal = calculateDailyGoal(entries, referenceDate);
  const streak = calculateStreak(entries, referenceDate);
  const achievements = evaluateAchievements(entries, streak);
  const milestones = detectPersonalMilestones(entries);

  return {
    dailyGoal,
    streak,
    level,
    totalXp,
    achievements,
    milestones,
  };
}
