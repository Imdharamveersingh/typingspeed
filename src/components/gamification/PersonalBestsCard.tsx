'use client';

import React from 'react';
import { PersonalMilestones } from '@/engine/gamificationTypes';

interface PersonalBestsCardProps {
  milestones: PersonalMilestones;
  totalTests: number;
}

export const PersonalBestsCard: React.FC<PersonalBestsCardProps> = ({
  milestones,
  totalTests,
}) => {
  return (
    <div className="personal-bests-card" role="region" aria-label="Personal Records and Milestones">
      <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--text-lg)' }}>
        Personal Bests
      </h3>

      <div className="personal-bests-grid">
        <div className="pb-stat-card">
          <div className="pb-stat-label">Best Speed</div>
          <div className="pb-stat-value" data-testid="pb-wpm">
            {milestones.bestNetWpm > 0 ? milestones.bestNetWpm : '—'}{' '}
            <span className="pb-stat-unit">Net WPM</span>
          </div>
          <div className="pb-stat-sub">All-time highest clean typing rate</div>
        </div>

        <div className="pb-stat-card">
          <div className="pb-stat-label">Best Accuracy</div>
          <div className="pb-stat-value" data-testid="pb-accuracy">
            {milestones.bestAccuracy > 0 ? `${milestones.bestAccuracy}%` : '—'}
          </div>
          <div className="pb-stat-sub">Highest recorded test accuracy</div>
        </div>

        <div className="pb-stat-card">
          <div className="pb-stat-label">Total Tests</div>
          <div className="pb-stat-value" data-testid="pb-total-tests">
            {totalTests}
          </div>
          <div className="pb-stat-sub">
            {milestones.hasCompletedFirstTest
              ? 'Completed practice sessions'
              : 'Take your first test to begin'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalBestsCard;
