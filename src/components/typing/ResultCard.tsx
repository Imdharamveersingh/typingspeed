'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TypingState } from '@/engine/types';
import { analyzeTypingResult, calculatePerformanceInsights } from '@/engine/analytics';
import { formatDuration } from '@/utils/metrics';
import {
  calculateLevel,
  calculateStreak,
  calculateTestXp,
  calculateCumulativeXp,
} from '@/engine/gamificationEngine';
import { loadHistory } from '@/engine/progressStorage';
import { ExamProfile } from '@/engine/examTypes';
import { evaluateExamResult } from '@/engine/examEngine';
import VirtualKeyboard from '@/components/keyboard/VirtualKeyboard';
import PerformanceGraphs from './PerformanceGraphs';

interface ResultCardProps {
  state: TypingState;
  onRestart: () => void;
  onChangeTest: () => void;
  onPracticeMistakes: () => void;
  testMode?: 'standard' | 'exam';
  examProfile?: ExamProfile;
}

interface HistoricalSummary {
  previousBestWpm: number;
  averageWpm: number;
  previousBestAccuracy: number;
  averageAccuracy: number;
  totalTests: number;
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
  const {
    metrics,
    mostMistypedCharacters,
    mistakeDetails,
    hasMistakes,
  } = analytics;

  const totalMistakes = analytics.totalMistakes ?? 0;
  const correctedMistakes = analytics.correctedMistakes ?? 0;
  const uncorrectedMistakes = analytics.uncorrectedMistakes ?? 0;
  const performanceSnapshots = useMemo(
    () => analytics.performanceSnapshots ?? [],
    [analytics.performanceSnapshots]
  );
  const displayErrors = metrics.errors ?? totalMistakes;
  const isFlawless = displayErrors === 0 && !hasMistakes;

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

  // Read client-side history for level, streak, and historical progress comparison
  const [levelInfo, setLevelInfo] = useState<{ level: number } | null>(null);
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [historySummary, setHistorySummary] = useState<HistoricalSummary | null>(null);

  useEffect(() => {
    const history = loadHistory();
    const totalXp = calculateCumulativeXp(history);
    const lvl = calculateLevel(totalXp);
    const streak = calculateStreak(history);
    setLevelInfo({ level: lvl.level });
    setStreakDays(streak.currentStreak);

    if (history.length > 0) {
      const wpms = history.map((h) => h.netWpm);
      const accs = history.map((h) => h.accuracy);
      const bestWpm = Math.max(...wpms);
      const avgWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / history.length);
      const bestAcc = Math.max(...accs);
      const avgAcc = Math.round((accs.reduce((a, b) => a + b, 0) / history.length) * 10) / 10;
      setHistorySummary({
        previousBestWpm: bestWpm,
        averageWpm: avgWpm,
        previousBestAccuracy: bestAcc,
        averageAccuracy: avgAcc,
        totalTests: history.length,
      });
    }
  }, []);

  // Performance insights
  const insights = useMemo(() => {
    return calculatePerformanceInsights(
      metrics,
      totalMistakes,
      correctedMistakes,
      performanceSnapshots
    );
  }, [metrics, totalMistakes, correctedMistakes, performanceSnapshots]);

  const hasPracticeData = hasMistakes && mostMistypedCharacters.length > 0;

  return (
    <div className="result-card" role="region" aria-label="Test Results Summary">
      {/* Optional Language Badge for Hindi */}
      {state.passage.language === 'hi' && (
        <div className="result-top-badges">
          <span
            className="brand-badge"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              borderColor: 'rgba(245, 158, 11, 0.3)',
            }}
            data-testid="hindi-result-badge"
          >
            हिंदी (Hindi)
          </span>
        </div>
      )}

      {/* Exam Practice Simulation Evaluation Banner (if in exam mode) */}
      {examEvaluation && (
        <div
          className={`exam-result-banner ${
            examEvaluation.status === 'target_reached' ? 'qualified' : 'unqualified'
          }`}
          data-testid="exam-result-banner"
          role="region"
          aria-label="Exam Practice Evaluation"
        >
          <div className="exam-banner-top">
            <span className="exam-banner-badge" data-testid="exam-result-badge">
              {examEvaluation.shortName} Simulation
            </span>
            <span
              className={`exam-status-tag ${
                examEvaluation.status === 'target_reached' ? 'reached' : 'not-reached'
              }`}
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

      {/* 1. RESULT HERO (Large Net WPM + Accuracy) */}
      <div className="result-headline-card">
        <div className="result-headline-wpm">
          {metrics.netWPM} <span className="result-wpm-unit">WPM</span>
        </div>
        <div className="result-headline-sub">{metrics.accuracy}% Accuracy</div>

        {/* Duration, Errors, and Gross WPM context line */}
        <div className="result-context-line">
          <span>{formatDuration(state.duration)}</span>
          <span className="context-dot" aria-hidden="true">·</span>
          <span>{displayErrors} {displayErrors === 1 ? 'error' : 'errors'}</span>
          <span className="context-dot" aria-hidden="true">·</span>
          <span>{metrics.grossWPM} Gross WPM</span>
        </div>
      </div>

      {/* 2. DYNAMIC PERFORMANCE MESSAGE (Strict canonical accuracy) */}
      <div className="result-dynamic-message-card" data-testid="result-dynamic-message">
        {isFlawless ? (
          <div className="dynamic-msg-flawless">
            <span className="dynamic-msg-title">✨ Flawless typing!</span>
            <span className="dynamic-msg-desc">Zero mistakes during this test.</span>
          </div>
        ) : (
          <div className="dynamic-msg-standard">
            <span className="dynamic-msg-title">⚡ Good run!</span>
            <span className="dynamic-msg-desc">
              You made {displayErrors} {displayErrors === 1 ? 'mistake' : 'mistakes'} while typing {metrics.totalKeystrokes} keystrokes.
            </span>
          </div>
        )}
      </div>

      {/* Weak Keys Chips if mistakes exist */}
      {hasPracticeData && (
        <div className="result-diagnostic-block">
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
        </div>
      )}

      {/* 3. PRIMARY & SECONDARY ACTIONS */}
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
            data-testid="test-again-btn"
          >
            ⚡ Test Again
          </button>
        )}

        <div className="result-secondary-actions">
          {hasPracticeData && (
            <button
              onClick={onRestart}
              className="btn-result-secondary"
              type="button"
              aria-label="Test Again"
              data-testid="test-again-btn"
            >
              Test Again
            </button>
          )}
          <button
            onClick={onChangeTest}
            className="btn-result-secondary"
            type="button"
            aria-label="Change Test"
            data-testid="change-test-btn"
          >
            Change Test
          </button>
          <Link
            href="/progress"
            className="btn-result-secondary"
            aria-label="View Progress"
            data-testid="view-progress-btn"
          >
            View Progress
          </Link>
          <Link
            href="/achievements"
            className="btn-result-secondary"
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

      {/* 4. COMPACT GAMIFICATION STRIP */}
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

      {/* 5. PERFORMANCE OVERVIEW */}
      <div className="analytics-section" data-testid="performance-overview-section">
        <h3>
          <span>Performance Overview</span>
        </h3>
        <div className="result-grid">
          <div className="result-item">
            <div className="result-item-value">{metrics.grossWPM}</div>
            <div className="result-item-label">Gross WPM</div>
          </div>

          <div className="result-item">
            <div className="result-item-value" style={{ color: 'var(--brand-primary)' }}>
              {metrics.netWPM}
            </div>
            <div className="result-item-label">Net WPM</div>
          </div>

          <div className="result-item">
            <div className="result-item-value">{metrics.accuracy}%</div>
            <div className="result-item-label">Accuracy</div>
          </div>

          <div className="result-item">
            <div
              className="result-item-value"
              style={{ color: displayErrors > 0 ? 'var(--status-error)' : 'inherit' }}
            >
              {displayErrors}
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
      </div>

      {/* 6. PERFORMANCE GRAPHS */}
      <div className="analytics-section" data-testid="performance-graphs-section">
        <PerformanceGraphs
          snapshots={performanceSnapshots}
          duration={state.duration}
        />
      </div>

      {/* 7. PERFORMANCE INSIGHTS */}
      <div className="analytics-section" data-testid="performance-insights-section">
        <h3>
          <span>Performance Insights</span>
        </h3>
        <div className="performance-insights-grid">
          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-category">Speed</span>
              <span className="insight-badge badge-speed">{insights.speedRating}</span>
            </div>
            <p className="insight-desc">{insights.speedDescription}</p>
          </div>

          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-category">Accuracy</span>
              <span className="insight-badge badge-accuracy">{insights.accuracyRating}</span>
            </div>
            <p className="insight-desc">{insights.accuracyDescription}</p>
          </div>

          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-category">Consistency</span>
              <span className="insight-badge badge-consistency">{insights.consistencyRating}</span>
            </div>
            <p className="insight-desc">{insights.consistencyDescription}</p>
          </div>

          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-category">Error Handling</span>
              <span className="insight-badge badge-error">{insights.errorRating}</span>
            </div>
            <p className="insight-desc">{insights.errorDescription}</p>
          </div>
        </div>
      </div>

      {/* 8. ERROR BREAKDOWN */}
      <div className="analytics-section" data-testid="error-breakdown-section">
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
            <div
              className="result-item-value"
              style={{ color: totalMistakes > 0 ? 'var(--status-error)' : 'inherit' }}
            >
              {totalMistakes}
            </div>
            <div className="result-item-label">Mistakes</div>
          </div>

          <div className="result-item">
            <div className="result-item-value" style={{ color: '#f59e0b' }}>
              {correctedMistakes}
            </div>
            <div className="result-item-label">Corrected Mistakes</div>
          </div>

          <div className="result-item">
            <div
              className="result-item-value"
              style={{ color: uncorrectedMistakes > 0 ? 'var(--status-error)' : 'inherit' }}
            >
              {uncorrectedMistakes}
            </div>
            <div className="result-item-label">Uncorrected Mistakes</div>
          </div>

          <div className="result-item">
            <div
              className="result-item-value"
              style={{ color: analytics.extraCharacters > 0 ? '#f87171' : 'inherit' }}
            >
              {analytics.extraCharacters}
            </div>
            <div className="result-item-label">Extra Characters</div>
          </div>

          <div className="result-item">
            <div className="result-item-value">{analytics.accuracy}%</div>
            <div className="result-item-label">Accuracy Rate</div>
          </div>
        </div>
      </div>

      {/* 9. MISTAKE DETAILS */}
      <div className="analytics-section" data-testid="mistake-details-section">
        <h3>
          <span>Mistake Details</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            {mistakeDetails.length} recorded
          </span>
        </h3>

        {mistakeDetails.length > 0 ? (
          <div className="mismatch-list" role="table" aria-label="Mistake details list">
            {mistakeDetails.slice(0, 20).map((detail, idx) => {
              const isCorrected = detail.status === 'corrected';
              return (
                <div key={idx} className="mismatch-row" role="row">
                  <span>
                    #<strong>{idx + 1}</strong>
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
                  <div>
                    <span style={{ color: 'var(--text-muted)', marginRight: 'var(--space-1)' }}>Pos:</span>
                    <span>{detail.index + 1}</span>
                  </div>
                  <div>
                    <span
                      className={`mistake-status-tag ${isCorrected ? 'status-tag-corrected' : 'status-tag-incorrect'}`}
                    >
                      {isCorrected ? 'Corrected' : 'Uncorrected'}
                    </span>
                  </div>
                </div>
              );
            })}
            {mistakeDetails.length > 20 && (
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  marginTop: 'var(--space-2)',
                }}
              >
                Showing first 20 mistakes of {mistakeDetails.length}.
              </p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            No character mismatches to display.
          </p>
        )}
      </div>

      {/* 10. KEYBOARD MISTAKE HEATMAP */}
      <div className="analytics-section" data-testid="keyboard-mistake-heatmap-section">
        <h3>
          <span>Keyboard Mistake Heatmap</span>
        </h3>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          Color intensity reflects mistake frequency on each key during this session.
        </p>
        <div style={{ marginTop: 'var(--space-2)' }}>
          <VirtualKeyboard
            typingState={state}
            language={state.passage.language}
            mistakes={mostMistypedCharacters}
            initialVisible={true}
            defaultShowMistakes={true}
          />
        </div>
      </div>

      {/* 11. PERSONAL PROGRESS (Historical comparison if history exists) */}
      {historySummary && (
        <div className="analytics-section" data-testid="personal-progress-section">
          <h3>
            <span>Your Progress</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'normal' }}>
              Based on {historySummary.totalTests} previous tests
            </span>
          </h3>
          <div className="progress-compare-grid">
            <div className="progress-compare-card">
              <span className="progress-compare-label">Current Net WPM</span>
              <strong className="progress-compare-value" style={{ color: 'var(--brand-primary)' }}>
                {metrics.netWPM} WPM
              </strong>
            </div>
            <div className="progress-compare-card">
              <span className="progress-compare-label">Previous Best</span>
              <strong className="progress-compare-value">
                {historySummary.previousBestWpm} WPM
              </strong>
            </div>
            <div className="progress-compare-card">
              <span className="progress-compare-label">Historical Average</span>
              <strong className="progress-compare-value">
                {historySummary.averageWpm} WPM
              </strong>
            </div>
            <div className="progress-compare-card">
              <span className="progress-compare-label">Current Accuracy</span>
              <strong className="progress-compare-value" style={{ color: 'var(--status-success)' }}>
                {metrics.accuracy}%
              </strong>
            </div>
            <div className="progress-compare-card">
              <span className="progress-compare-label">Historical Best Acc</span>
              <strong className="progress-compare-value">
                {historySummary.previousBestAccuracy}%
              </strong>
            </div>
            <div className="progress-compare-card">
              <span className="progress-compare-label">Average Accuracy</span>
              <strong className="progress-compare-value">
                {historySummary.averageAccuracy}%
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 12. FINAL CTA ACTION (Bottom Test Again) */}
      <div className="result-bottom-cta">
        <button
          onClick={onRestart}
          className="btn-result-primary"
          type="button"
          aria-label="Test Again"
        >
          ⚡ Test Again
        </button>
      </div>
    </div>
  );
};

export default ResultCard;
