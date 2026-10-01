'use client';

import React from 'react';
import { TestStatus, TestType } from '@/engine/types';

export interface TypingProgressBarProps {
  testType: TestType;
  status: TestStatus;
  duration: number; // in seconds
  elapsedSeconds: number;
  targetProgress?: { current: number; total: number } | null;
}

/**
 * Derives pure progress percentage (0 - 100) from authoritative engine state.
 */
export function calculateProgressPercentage({
  testType,
  status,
  duration,
  elapsedSeconds,
  targetProgress,
}: {
  testType: TestType;
  status: TestStatus;
  duration: number;
  elapsedSeconds: number;
  targetProgress?: { current: number; total: number } | null;
}): number {
  if (status === 'completed') {
    if ((testType === 'words' || testType === 'characters') && targetProgress && targetProgress.total > 0) {
      if (targetProgress.current < targetProgress.total) {
        return Math.min(100, Math.max(0, (targetProgress.current / targetProgress.total) * 100));
      }
    }
    return 100;
  }

  if (status === 'idle') {
    return 0;
  }

  if (testType === 'words') {
    const current = targetProgress?.current ?? 0;
    const total = targetProgress?.total ?? 100;
    const rawPct = total > 0 ? (current / total) * 100 : 0;
    return Math.min(100, Math.max(0, rawPct));
  }

  if (testType === 'characters') {
    const current = targetProgress?.current ?? 0;
    const total = targetProgress?.total ?? 500;
    const rawPct = total > 0 ? (current / total) * 100 : 0;
    return Math.min(100, Math.max(0, rawPct));
  }

  // Time mode
  const validDuration = duration > 0 ? duration : 60;
  const rawPct = (elapsedSeconds / validDuration) * 100;
  return Math.min(100, Math.max(0, rawPct));
}

/**
 * Minimalist horizontal pill progress bar.
 * Clean, compact visual progress indicator between Metrics and Passage.
 */
export const TypingProgressBar: React.FC<TypingProgressBarProps> = React.memo(({
  testType,
  status,
  duration,
  elapsedSeconds,
  targetProgress,
}) => {
  const percentage = calculateProgressPercentage({
    testType,
    status,
    duration,
    elapsedSeconds,
    targetProgress,
  });

  return (
    <div
      className="typing-progress-bar-wrapper"
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Typing progress"
      data-testid="typing-progress-bar"
    >
      <div className="typing-progress-bar-track">
        <div
          className="typing-progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

TypingProgressBar.displayName = 'TypingProgressBar';

export default TypingProgressBar;
