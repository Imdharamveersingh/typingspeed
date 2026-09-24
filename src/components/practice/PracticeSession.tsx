'use client';

import React, { useEffect } from 'react';
import { PracticePlan, PracticeType } from '@/engine/practiceEngine';
import { useTypingEngine } from '@/engine/useTypingEngine';
import PassageDisplay from '@/components/typing/PassageDisplay';
import MetricsBar from '@/components/typing/MetricsBar';
import { formatDuration } from '@/utils/metrics';
import VirtualKeyboard from '@/components/keyboard/VirtualKeyboard';

interface PracticeSessionProps {
  plan: PracticePlan;
  activeMode: PracticeType;
  onChangeMode: (mode: PracticeType) => void;
  onBackToTest: () => void;
  backButtonLabel?: string;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  plan,
  activeMode,
  onChangeMode,
  onBackToTest,
  backButtonLabel,
}) => {
  const {
    state,
    metrics,
    inputRef,
    isFocused,
    focusTypingArea,
    restart,
    completeTest,
    recentKey,
    handleKeyDown,
    handleBeforeInput,
    handlePaste,
    handleFocus,
    handleBlur,
  } = useTypingEngine({
    initialPassage: plan.passage,
    initialDuration: 60,
  });

  // Focus typing area whenever plan or component mounts
  useEffect(() => {
    if (plan.hasContent) {
      focusTypingArea();
    }
  }, [plan, focusTypingArea]);

  const isCompleted = state.status === 'completed';

  return (
    <div className="practice-container" role="region" aria-label="Targeted Practice Session">
      {/* Practice Navigation Header */}
      <div className="practice-header">
        <div className="practice-title-group">
          <h2>{plan.title}</h2>
          <p className="practice-description">{plan.description}</p>
        </div>

        {/* Practice Mode Selector Tabs */}
        <div className="practice-mode-tabs" role="tablist" aria-label="Select practice mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'characters'}
            className={`practice-mode-tab ${activeMode === 'characters' ? 'active' : ''}`}
            onClick={() => onChangeMode('characters')}
          >
            Focus Keys
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'words'}
            className={`practice-mode-tab ${activeMode === 'words' ? 'active' : ''}`}
            onClick={() => onChangeMode('words')}
          >
            Missed Words
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'bigrams'}
            className={`practice-mode-tab ${activeMode === 'bigrams' ? 'active' : ''}`}
            onClick={() => onChangeMode('bigrams')}
          >
            Targeted Bigrams
          </button>
          <button
            type="button"
            onClick={onBackToTest}
            className="btn btn-outline"
            style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}
          >
            {backButtonLabel || 'Back to Results'}
          </button>

          {/* Deterministic practice completion trigger (for testing without affecting production UX) */}
          <button
            type="button"
            data-testid="complete-practice-btn"
            onClick={completeTest}
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          >
            Complete Practice
          </button>
        </div>
      </div>

      {/* Empty / Insufficient Mistake State */}
      {!plan.hasContent ? (
        <div className="practice-empty-card">
          <h3 style={{ marginBottom: 'var(--space-2)' }}>No Mistakes Recorded</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto var(--space-6)', fontSize: 'var(--text-sm)' }}>
            {plan.description} Try completing another typing test with some mistakes to generate targeted drills.
          </p>
          <button onClick={onBackToTest} className="btn btn-primary" type="button">
            {backButtonLabel || 'Return to Test'}
          </button>
        </div>
      ) : isCompleted ? (
        /* Practice Completion Summary */
        <div className="result-card" style={{ marginTop: 'var(--space-4)' }}>
          <span className="brand-badge" style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>
            Drill Complete
          </span>
          <h3>Practice Completed</h3>
          <div className="result-headline-card">
            <div className="result-headline-wpm">
              {metrics.netWPM} <span style={{ fontSize: 'var(--text-xl)', color: 'var(--text-secondary)' }}>WPM</span>
            </div>
            <div className="result-headline-sub">
              {metrics.accuracy}% Accuracy
            </div>
          </div>

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

          <div className="result-actions">
            <button onClick={restart} className="btn btn-primary" type="button" autoFocus>
              Practice Again
            </button>
            <button onClick={onBackToTest} className="btn btn-outline" type="button">
              {backButtonLabel || 'Back to Test Results'}
            </button>
          </div>
        </div>
      ) : (
        /* Active Practice Canvas */
        <>
          {/* Target Indicators */}
          {plan.targetItems.length > 0 && (
            <div className="practice-target-tags">
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', alignSelf: 'center', fontWeight: 500 }}>
                Targets:
              </span>
              {plan.targetItems.map((item, idx) => (
                <span key={idx} className="practice-target-tag">
                  {item}
                </span>
              ))}
            </div>
          )}

          <MetricsBar metrics={metrics} />

          <PassageDisplay
            characters={state.characters}
            extraCharacters={state.extraCharacters}
            currentIndex={state.currentIndex}
            status={state.status}
            isFocused={isFocused}
            language={plan.passage.language}
            inputRef={inputRef}
            onContainerClick={focusTypingArea}
            onKeyDown={handleKeyDown}
            onBeforeInput={handleBeforeInput}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'var(--space-3)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              {state.status === 'idle'
                ? 'Type any character to start targeted practice drill'
                : 'Drill in progress — focus on key transitions!'}
            </span>
            <button
              onClick={restart}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 'inherit',
              }}
            >
              Restart Drill
            </button>
          </div>

          {/* Phase 9: Keyboard Visualization during Practice Session */}
          <VirtualKeyboard
            typingState={state}
            language={plan.passage.language}
            recentKey={recentKey}
            focusKeys={activeMode === 'characters' ? plan.targetKeys : undefined}
          />

        </>
      )}

    </div>
  );
};

export default PracticeSession;
