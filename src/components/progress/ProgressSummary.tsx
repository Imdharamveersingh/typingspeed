import React from 'react';
import { ProgressSummary as IProgressSummary } from '@/engine/progressTypes';

interface ProgressSummaryProps {
  summary: IProgressSummary;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({ summary }) => {
  return (
    <div className="progress-summary-grid" role="region" aria-label="Performance Summary Overview">
      <div className="progress-card">
        <div className="progress-card-label">Tests Completed</div>
        <div className="progress-card-value">{summary.totalTests}</div>
        <div className="progress-card-sub">Session history</div>
      </div>

      <div className="progress-card highlight">
        <div className="progress-card-label">Average Speed</div>
        <div className="progress-card-value">
          {summary.averageNetWpm} <span className="progress-unit">WPM</span>
        </div>
        <div className="progress-card-sub">Net WPM average</div>
      </div>

      <div className="progress-card">
        <div className="progress-card-label">Best Speed</div>
        <div className="progress-card-value">
          {summary.bestNetWpm} <span className="progress-unit">WPM</span>
        </div>
        <div className="progress-card-sub">All-time record</div>
      </div>

      <div className="progress-card">
        <div className="progress-card-label">Average Accuracy</div>
        <div className="progress-card-value">{summary.averageAccuracy}%</div>
        <div className="progress-card-sub">Overall precision</div>
      </div>
    </div>
  );
};

export default ProgressSummary;
