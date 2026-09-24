'use client';

import React, { useState } from 'react';
import { Achievement } from '@/engine/gamificationTypes';

interface AchievementsCardProps {
  achievements: Achievement[];
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({ achievements }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;

  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked') return a.isUnlocked;
    if (filter === 'locked') return !a.isUnlocked;
    return true;
  });

  const getCategoryIcon = (category: Achievement['category']) => {
    switch (category) {
      case 'speed':
        return '⚡';
      case 'accuracy':
        return '🎯';
      case 'streak':
        return '🔥';
      case 'tests':
      default:
        return '⌨️';
    }
  };

  return (
    <div className="achievements-section" role="region" aria-label="Achievements Showcase">
      <div className="achievements-section-header">
        <div>
          <h3 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Achievements</h3>
          <p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Earn badges by hitting speed targets, staying accurate, and practicing consistently.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div className="achievements-counter-badge" data-testid="achievements-ratio">
            {unlockedCount} / {totalCount} Unlocked
          </div>

          <div className="achievements-filter-tabs">
            <button
              type="button"
              className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`tab-btn ${filter === 'unlocked' ? 'active' : ''}`}
              onClick={() => setFilter('unlocked')}
            >
              Unlocked ({unlockedCount})
            </button>
            <button
              type="button"
              className={`tab-btn ${filter === 'locked' ? 'active' : ''}`}
              onClick={() => setFilter('locked')}
            >
              Locked ({totalCount - unlockedCount})
            </button>
          </div>
        </div>
      </div>

      <div className="achievements-grid" data-testid="achievements-grid">
        {filteredAchievements.map((achievement) => (
          <div
            key={achievement.id}
            data-testid={`achievement-card-${achievement.id}`}
            className={`achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}
          >
            <div className="achievement-icon-wrapper">
              <span className="achievement-icon">{getCategoryIcon(achievement.category)}</span>
              {achievement.isUnlocked && <span className="achievement-check-badge">✓</span>}
            </div>

            <div className="achievement-info">
              <div className="achievement-title-row">
                <h4 className="achievement-title">{achievement.title}</h4>
                <span className="achievement-status-badge">
                  {achievement.isUnlocked ? 'Unlocked' : 'Locked'}
                </span>
              </div>

              <p className="achievement-desc">{achievement.description}</p>

              <div className="achievement-meta">
                <span className="achievement-progress">{achievement.progressText}</span>
                {achievement.isUnlocked && achievement.unlockedAt && (
                  <span className="achievement-unlocked-date">
                    {new Date(achievement.unlockedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsCard;
