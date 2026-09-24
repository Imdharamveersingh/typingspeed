export interface DailyGoal {
  target: number;
  completedToday: number;
  isCompleted: boolean;
  progressPercent: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  isActiveToday: boolean;
}

export interface XpBreakdown {
  base: number;
  accuracyBonus: number;
  speedBonus: number;
  total: number;
}

export interface LevelInfo {
  level: number;
  currentXp: number;
  minXp: number;
  maxXp: number;
  xpIntoLevel: number;
  xpForLevel: number;
  progressPercent: number;
}

export type AchievementCategory = 'tests' | 'speed' | 'accuracy' | 'streak';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  isUnlocked: boolean;
  unlockedAt: number | null;
  progressText?: string;
}

export interface PersonalMilestones {
  hasCompletedFirstTest: boolean;
  bestNetWpm: number;
  bestAccuracy: number;
}

export interface GamificationOverview {
  dailyGoal: DailyGoal;
  streak: StreakInfo;
  level: LevelInfo;
  totalXp: number;
  achievements: Achievement[];
  milestones: PersonalMilestones;
}
