import React from 'react';
import { TypingMetrics } from '@/engine/types';
import { formatDuration } from '@/utils/metrics';

interface MetricsBarProps {
  metrics: TypingMetrics;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics }) => {
  return (
    <div className="metrics-bar" aria-label="Typing performance metrics" role="region">
      <div className="metric-card metric-primary">
        <div className="metric-value highlight">{metrics.netWPM}</div>
        <div className="metric-label">WPM</div>
      </div>

      <div className="metric-card">
        <div className="metric-value">{metrics.accuracy}%</div>
        <div className="metric-label">Accuracy</div>
      </div>

      <div className="metric-card">
        <div className="metric-value">{formatDuration(metrics.remainingSeconds)}</div>
        <div className="metric-label">Time</div>
      </div>

      {metrics.uncorrectedErrors > 0 && (
        <div className="metric-card metric-errors">
          <div className="metric-value error">{metrics.uncorrectedErrors}</div>
          <div className="metric-label">Errors</div>
        </div>
      )}
    </div>
  );
};

export default MetricsBar;
