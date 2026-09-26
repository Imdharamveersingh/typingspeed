import React from 'react';
import { TestType, TypingMetrics } from '@/engine/types';
import { formatDuration } from '@/utils/metrics';

interface MetricsBarProps {
  metrics: TypingMetrics;
  testType?: TestType;
  initialDuration?: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = React.memo(({
  metrics,
  testType = 'time',
}) => {
  const isCountMode = testType === 'words' || testType === 'characters';
  // Time mode: countdown of remaining seconds. Words/Chars mode: elapsed seconds.
  const timeDisplay = isCountMode
    ? formatDuration(Math.floor(metrics.elapsedSeconds))
    : formatDuration(metrics.remainingSeconds);

  return (
    <div className="metrics-bar" aria-label="Typing performance metrics" role="region">
      {/* 1. Gross WPM */}
      <div className="metric-card" data-testid="metric-gwpm">
        <div className="metric-value">{metrics.grossWPM}</div>
        <div className="metric-label">GWPM</div>
      </div>

      {/* 2. Net WPM */}
      <div className="metric-card metric-primary" data-testid="metric-net-wpm">
        <div className="metric-value highlight">{metrics.netWPM}</div>
        <div className="metric-label">Net WPM</div>
      </div>

      {/* 3. Accuracy */}
      <div className="metric-card" data-testid="metric-accuracy">
        <div className="metric-value">{metrics.accuracy}%</div>
        <div className="metric-label">Accuracy</div>
      </div>

      {/* 4. Time */}
      <div className="metric-card" data-testid="metric-time">
        <div className="metric-value">{timeDisplay}</div>
        <div className="metric-label">Time</div>
      </div>

      {/* 5. Errors — always displayed, starts at 0, updates visibly when wrong key pressed */}
      <div
        className={`metric-card ${metrics.uncorrectedErrors > 0 ? 'metric-errors' : ''}`}
        data-testid="metric-errors"
      >
        <div className={`metric-value ${metrics.uncorrectedErrors > 0 ? 'error' : ''}`}>
          {metrics.uncorrectedErrors}
        </div>
        <div className="metric-label">Errors</div>
      </div>
    </div>
  );
});

MetricsBar.displayName = 'MetricsBar';

export default MetricsBar;
