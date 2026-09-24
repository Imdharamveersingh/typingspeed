'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TypingState } from '@/engine/types';
import { analyzeTypingResult } from '@/engine/analytics';
import { formatDuration } from '@/utils/metrics';
import { calculateLevel, calculateStreak, calculateTestXp, calculateCumulativeXp } from '@/engine/gamificationEngine';
import { loadHistory } from '@/engine/progressStorage';
import { ExamProfile } from '@/engine/examTypes';
import { evaluateExamResult } from '@/engine/examEngine';
import VirtualKeyboard from '@/components/keyboard/VirtualKeyboard';

interface ResultCardProps {
  state: TypingState;
  onRestart: () => void;
  onChangeTest: () => void;
  onPracticeMistakes: () => void;
  testMode?: 'standard' | 'exam';
  examProfile?: ExamProfile;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  state,
  onRestart,
  onChangeTest,
  onPracticeMistakes,
  testMode = 'standard',
  examProfile,
}) => {
  const analytics = useMemo(() => analyzeTypingResult(state), [state]);
  const { metrics, mostMistypedCharacters, mistakeDetails, hasMistakes } = analytics;

  // Evaluate exam results if in exam practice mode
  const examEvaluation = useMemo(() => {
    if (testMode === 'exam' && examProfile) {
      return evaluateExamResult(
        {
          netWpm: metrics.netWPM,
          grossWpm: metrics.grossWPM,
          accuracy: metrics.accuracy,
        },
        examProfile
      );
    }
    return null;
  }, [testMode, examProfile, metrics]);

  // Calculate deterministic XP for this test attempt
  const earnedXp = useMemo(() => {
    return calculateTestXp({
      id: 'current',
      timestamp: Date.now(),
      duration: state.duration,
      grossWpm: metrics.grossWPM,
      netWpm: metrics.netWPM,
      accuracy: metrics.accuracy,
      totalKeystrokes: metrics.totalKeystrokes,
      correctChars: analytics.correctCharacters,
      incorrectChars: analytics.incorrectCharacters,
      extraChars: analytics.extraCharacters,
      mostMistypedCharacters: analytics.mostMistypedCharacters,
    });
  }, [state.duration, metrics, analytics]);

  // Read client-side history for overall level & streak
  const [levelInfo, setLevelInfo] = useState<{ level: number } | null>(null);
  const [streakDays, setStreakDays] = useState<number | null>(null);

  useEffect(() => {
    const history = loadHistory();
    const totalXp = calculateCumulativeXp(history);
    const lvl = calculateLevel(totalXp);
    const streak = calculateStreak(history);
    setLevelInfo({ level: lvl.level });
    setStreakDays(streak.currentStreak);
  }, []);

  const hasPracticeData = hasMistakes && mostMistypedCharacters.length > 0;
  const [showDetails, setShowDetails] = useState<boolean>(false);

  return (
    <div className="result-card" role="region" aria-label="Test Results Summary">
      {/* Top Header Badge & Language Badge */}
      <div className="result-top-badges">
        <span className="brand-badge">
          {testMode === 'exam' && examProfile ? `${examProfile.shortName} Practice Complete` : 'Test Complete'}
        </span>
        {state.passage.language === 'hi' && (
          <span
            className="brand-badge"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
            data-testid="hindi-result-badge"
          >
            हिंदी (Hindi)
          </span>
        )}
      </div>

      {/* Exam Practice Simulation Evaluation Banner (if in exam mode) */}
      {examEvaluation && (
        <div
          className={`exam-result-banner ${examEvaluation.status === 'target_reached' ? 'qualified' : 'unqualified'}`}
          data-testid="exam-result-banner"
          role="region"
          aria-label="Exam Practice Evaluation"
        >
          <div className="exam-banner-top">
            <span className="exam-banner-badge" data-testid="exam-result-badge">
              {examEvaluation.shortName} Simulation
            </span>
            <span
              className={`exam-status-tag ${examEvaluation.status === 'target_reached' ? 'reached' : 'not-reached'}`}
              data-testid="exam-status-tag"
            >
              {examEvaluation.status === 'target_reached' ? '✓ Target Reached' : '✕ Below Target'}
            </span>
          </div>

          <h3 className="exam-banner-headline" data-testid="exam-banner-headline">
            {examEvaluation.headline}
          </h3>

          <div className="exam-banner-comparison">
            <div className="exam-comp-item">
              <span className="comp-label">Net Speed</span>
              <span className="comp-value" data-testid="exam-actual-speed">
                <strong>{examEvaluation.actualNetWpm}</strong> / {examEvaluation.targetWpm} WPM
              </span>
            </div>
            {examEvaluation.minimumAccuracy && (
              <div className="exam-comp-item">
                <span className="comp-label">Accuracy</span>
                <span className="comp-value" data-testid="exam-actual-accuracy">
                  <strong>{examEvaluation.accuracy}%</strong> / {examEvaluation.minimumAccuracy}%
                </span>
              </div>
            )}
          </div>

          <p className="exam-banner-msg">{examEvaluation.message}</p>
          <p className="exam-banner-disclaimer" data-testid="exam-result-disclaimer">
            {examEvaluation.disclaimer}
          </p>
        </div>
      )}

      {/* TIER 1: PRIMARY RESULT (Large Net WPM + Accuracy) */}
      <div className="result-headline-card">
        <div className="result-headline-wpm">
          {metrics.netWPM} <span className="result-wpm-unit">WPM</span>
        </div>
        <div className="result-headline-sub">
          {metrics.accuracy}% Accuracy
        </div>

        {/* TIER 2: COMPACT CONTEXT (Duration & Errors) */}
        <div className="result-context-line">
          <span>{formatDuration(state.duration)}</span>
          <span className="context-dot" aria-hidden="true">·</span>
          <span>{metrics.uncorrectedErrors} {metrics.uncorrectedErrors === 1 ? 'error' : 'errors'}</span>
          <span className="context-dot" aria-hidden="true">·</span>
          <span>{metrics.grossWPM} Gross WPM</span>
        </div>
      </div>

      {/* TIER 3: DIAGNOSTIC INSIGHT (Weak Keys or Flawless Confirmation) */}
      <div className="result-diagnostic-block">
        {hasPracticeData ? (
          <div className="result-weak-keys-card">
            <span className="diagnostic-label">Your weak keys</span>
            <div className="mistyped-chips-grid">
              {mostMistypedCharacters.slice(0, 5).map((item, idx) => (
                <div key={idx} className="mistyped-chip">
                  <span className="mistyped-chip-char">{item.displayLabel}</span>
                  <span className="mistyped-chip-count">{item.count}×</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="result-flawless-msg">
            ✨ Flawless typing! You made zero uncorrected mistakes during this test.
          </p>
        )}
      </div>

      {/* TIER 4: ACTION HIERARCHY (One Dominant Primary Action) */}
      <div className="result-cta-group">
        {hasPracticeData ? (
          <button
            onClick={onPracticeMistakes}
            className="btn-result-primary"
            type="button"
            data-testid="practice-mistakes-btn"
            autoFocus
            aria-label="Practice My Mistakes"
          >
            🎯 Practice My Mistakes
          </button>
        ) : (
          <button
            onClick={onRestart}
            className="btn-result-primary"
            type="button"
            autoFocus
            aria-label="Test Again"
          >
            ⚡ Test Again (Enter)
          </button>
        )}

        <div className="result-secondary-actions">
          {hasPracticeData && (
            <button
              onClick={onRestart}
              className="btn-result-link"
              type="button"
              aria-label="Test Again"
            >
              Test Again (Esc)
            </button>
          )}
          <button
            onClick={onChangeTest}
            className="btn-result-link"
            type="button"
            aria-label="Change Test"
          >
            Change Test
          </button>
          <Link
            href="/progress"
            className="btn-result-link"
            aria-label="View Progress"
            data-testid="view-progress-btn"
          >
            View Progress
          </Link>
          <Link
            href="/achievements"
            className="btn-result-link"
            aria-label="View Achievements"
            data-testid="view-achievements-btn"
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
          >
            Achievements
          </Link>
        </div>
      </div>

      {/* Compact Gamification Feedback Strip (Secondary) */}
      <div className="result-gamification-strip" data-testid="result-gamification-strip">
        <span className="gamification-pill-xp">
          <span className="pill-xp-badge" data-testid="result-xp-gain">+{earnedXp.total} XP</span>
        </span>
        {levelInfo && (
          <span className="gamification-pill-stat">
            <span className="pill-stat-label">Level</span>
            <strong className="pill-stat-val" data-testid="result-level">{levelInfo.level}</strong>
          </span>
        )}
        {streakDays !== null && streakDays > 0 && (
          <span className="gamification-pill-stat">
            <span className="pill-stat-icon">🔥</span>
            <strong className="pill-stat-val" data-testid="result-streak">
              {streakDays} {streakDays === 1 ? 'day' : 'days'}
            </strong>
          </span>
        )}
      </div>

      {/* PROGRESSIVE DISCLOSURE: Detailed Analysis Toggle Button */}
      <div className="result-details-toggle-wrapper">
        <button
          type="button"
          className="btn-details-toggle"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
          aria-controls="detailed-analysis-panel"
        >
          <span>{showDetails ? 'Hide detailed analysis' : 'Show detailed analysis'}</span>
          <span aria-hidden="true" className="toggle-chevron">{showDetails ? '▴' : '▾'}</span>
        </button>
      </div>

      {/* Expandable Detailed Analysis Panel */}
      {showDetails && (
        <div
          id="detailed-analysis-panel"
          className="result-detailed-panel"
          role="region"
          aria-label="Detailed Typing Performance Analysis"
        >
          {/* Detailed Performance Metrics Grid */}
          <div className="result-grid">
            <div className="result-item">
              <div className="result-item-value">{metrics.grossWPM}</div>
              <div className="result-item-label">Gross WPM</div>
            </div>

            <div className="result-item">
              <div className="result-item-value" style={{ color: metrics.uncorrectedErrors > 0 ? 'var(--status-error)' : 'inherit' }}>
                {metrics.uncorrectedErrors}
              </div>
              <div className="result-item-label">Errors</div>
            </div>

            <div className="result-item">
              <div className="result-item-value">{metrics.totalKeystrokes}</div>
              <div className="result-item-label">Keystrokes</div>
            </div>

            <div className="result-item">
              <div className="result-item-value">{formatDuration(state.duration)}</div>
              <div className="result-item-label">Duration</div>
            </div>
          </div>

          {/* Section 1: Error Breakdown */}
          <div className="analytics-section">
            <h3>
              <span>Error Breakdown</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                Total Processed: {analytics.totalProcessedCharacters}
              </span>
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              <div className="result-item">
                <div className="result-item-value" style={{ color: 'var(--status-success)' }}>
                  {analytics.correctCharacters}
                </div>
                <div className="result-item-label">Correct Characters</div>
              </div>

              <div className="result-item">
                <div className="result-item-value" style={{ color: analytics.incorrectCharacters > 0 ? 'var(--status-error)' : 'inherit' }}>
                  {analytics.incorrectCharacters}
                </div>
                <div className="result-item-label">Incorrect Existing</div>
              </div>

              <div className="result-item">
                <div className="result-item-value" style={{ color: analytics.extraCharacters > 0 ? '#f87171' : 'inherit' }}>
                  {analytics.extraCharacters}
                </div>
                <div className="result-item-label">Extra Characters</div>
              </div>

              <div className="result-item">
                <div className="result-item-value">
                  {analytics.accuracy}%
                </div>
                <div className="result-item-label">Accuracy Rate</div>
              </div>
            </div>
          </div>

          {/* Section 2: Mistake Details (Lightweight Mismatch View) */}
          <div className="analytics-section">
            <h3>
              <span>Mistake Details</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                {mistakeDetails.length} recorded
              </span>
            </h3>

            {mistakeDetails.length > 0 ? (
              <div className="mismatch-list">
                {mistakeDetails.slice(0, 15).map((detail, idx) => (
                  <div key={idx} className="mismatch-row">
                    <span>
                      Position <strong>#{detail.index + 1}</strong>
                    </span>
                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: 'var(--space-2)' }}>Expected:</span>
                      <span className="mismatch-expected">
                        &apos;{detail.expected === ' ' ? 'Space' : detail.expected}&apos;
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: 'var(--space-2)' }}>Typed:</span>
                      <span className="mismatch-typed">
                        &apos;{detail.typed === ' ' ? 'Space' : detail.typed}&apos;
                      </span>
                    </div>
                  </div>
                ))}
                {mistakeDetails.length > 15 && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-2)' }}>
                    Showing first 15 mistakes.
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                No character mismatches to display.
              </p>
            )}
          </div>

          {/* Section 3: Virtual Keyboard Mistake Heatmap */}
          {hasMistakes && (
            <div className="analytics-section">
              <h3>
                <span>Keyboard Mistake Heatmap</span>
              </h3>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <VirtualKeyboard
                  typingState={state}
                  language={state.passage.language}
                  mistakes={mostMistypedCharacters}
                  initialVisible={true}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultCard;
