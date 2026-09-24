'use client';

import React from 'react';
import { LevelInfo, StreakInfo } from '@/engine/gamificationTypes';

interface GamificationSummaryProps {
  level: LevelInfo;
  streak: StreakInfo;
  totalXp: number;
}

export const GamificationSummary: React.FC<GamificationSummaryProps> = ({
  level,
  streak,
  totalXp,
}) => {
  return (
    <div className="gamification-summary-card" role="region" aria-label="Gamification Overview">
      <div className="gamification-header-row">
        {/* Level & XP Overview */}
        <div className="gamification-level-block">
          <div className="gamification-level-badge">
            <span className="level-label">Level</span>
            <span className="level-number" data-testid="user-level">{level.level}</span>
          </div>
          <div className="gamification-xp-details">
            <div className="gamification-xp-title">
              <span className="total-xp" data-testid="total-xp">{totalXp} XP</span>
              <span className="xp-next-target">
                {level.xpIntoLevel} / {level.xpForLevel} XP to Level {level.level + 1}
              </span>
            </div>
            {/* Progress bar to next level */}
            <div
              className="progress-bar-track"
              role="progressbar"
              aria-valuenow={level.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress to Level ${level.level + 1}`}
            >
              <div
                className="progress-bar-fill level-fill"
                style={{ width: `${level.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Streak Stats */}
        <div className="gamification-streak-badges">
          <div className="streak-badge-card" data-testid="current-streak-card">
            <div className="streak-icon">🔥</div>
            <div className="streak-text">
              <div className="streak-value" data-testid="current-streak">
                {streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'}
              </div>
              <div className="streak-label">
                Current Streak {streak.isActiveToday ? '(Active Today)' : ''}
              </div>
            </div>
          </div>

          <div className="streak-badge-card" data-testid="longest-streak-card">
            <div className="streak-icon">⚡</div>
            <div className="streak-text">
              <div className="streak-value" data-testid="longest-streak">
                {streak.longestStreak} {streak.longestStreak === 1 ? 'day' : 'days'}
              </div>
              <div className="streak-label">Best Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationSummary;
