'use client';

import React from 'react';
import { DailyGoal } from '@/engine/gamificationTypes';

interface DailyGoalCardProps {
  dailyGoal: DailyGoal;
}

export const DailyGoalCard: React.FC<DailyGoalCardProps> = ({ dailyGoal }) => {
  return (
    <div className="daily-goal-card" role="region" aria-label="Daily Typing Goal">
      <div className="daily-goal-header">
        <div>
          <h3 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Daily Goal</h3>
          <p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Complete {dailyGoal.target} standard tests each day to maintain your practice momentum.
          </p>
        </div>
        <div className="daily-goal-counter" data-testid="daily-goal-counter">
          <span className="count-completed" data-testid="daily-goal-completed">{dailyGoal.completedToday}</span>
          <span className="count-separator"> / </span>
          <span className="count-target" data-testid="daily-goal-target">{dailyGoal.target}</span>
          <span className="count-unit"> tests</span>
        </div>
      </div>

      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuenow={dailyGoal.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily goal progress"
        style={{ marginTop: 'var(--space-3)' }}
      >
        <div
          className={`progress-bar-fill ${dailyGoal.isCompleted ? 'goal-completed-fill' : 'goal-fill'}`}
          style={{ width: `${dailyGoal.progressPercent}%` }}
        />
      </div>

      <div className="daily-goal-footer" style={{ marginTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {dailyGoal.isCompleted
            ? 'Great job! You met your target for today.'
            : `${Math.max(0, dailyGoal.target - dailyGoal.completedToday)} more test${dailyGoal.target - dailyGoal.completedToday === 1 ? '' : 's'} needed today.`}
        </span>
        {dailyGoal.isCompleted && (
          <span className="goal-badge-complete" data-testid="goal-complete-badge">
            ✓ Goal Complete
          </span>
        )}
      </div>
    </div>
  );
};

export default DailyGoalCard;
