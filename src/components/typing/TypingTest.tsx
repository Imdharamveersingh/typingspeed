'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTypingEngine } from '@/engine/useTypingEngine';
import { DEFAULT_PASSAGE, PASSAGES } from '@/data/passages';
import { DEFAULT_HINDI_PASSAGE, HINDI_PASSAGES } from '@/data/hindiPassages';
import { analyzeTypingResult } from '@/engine/analytics';
import { generatePracticePlan, PracticeType } from '@/engine/practiceEngine';
import { createHistoryEntry, saveHistoryEntry } from '@/engine/progressStorage';
import MetricsBar from './MetricsBar';
import PassageDisplay from './PassageDisplay';
import ResultCard from './ResultCard';
import PracticeSession from '@/components/practice/PracticeSession';
import ExamInstructionsCard from '@/components/exam/ExamInstructionsCard';
import { getAllExamProfiles, getDefaultExamProfile } from '@/engine/examEngine';
import { ExamProfile } from '@/engine/examTypes';
import { TestDuration, TypingLanguage } from '@/engine/types';
import { formatDuration } from '@/utils/metrics';
import VirtualKeyboard from '@/components/keyboard/VirtualKeyboard';

export interface TypingTestProps {
  initialTestMode?: 'standard' | 'exam';
}

const DURATIONS: { label: string; value: TestDuration }[] = [
  { label: '60s', value: 60 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
];

export const TypingTest: React.FC<TypingTestProps> = ({
  initialTestMode = 'standard',
}) => {
  const [viewMode, setViewMode] = useState<'test' | 'practice'>('test');
  const [practiceType, setPracticeType] = useState<PracticeType>('characters');
  const [testMode, setTestMode] = useState<'standard' | 'exam'>(initialTestMode);
  const [selectedLanguage, setSelectedLanguage] = useState<TypingLanguage>('en');
  const [selectedExamProfile, setSelectedExamProfile] = useState<ExamProfile>(getDefaultExamProfile());
  const [activeDropdown, setActiveDropdown] = useState<'duration' | 'language' | 'mode' | 'topic' | null>(null);
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const examProfiles = useMemo(() => getAllExamProfiles(), []);

  // Restore keyboard visibility preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('typing_platform_keyboard_visible');
      if (saved !== null) {
        setShowKeyboard(saved === 'true');
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleToggleKeyboard = () => {
    setShowKeyboard((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('typing_platform_keyboard_visible', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Close open dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const defaultExam = useMemo(() => getDefaultExamProfile(), []);
  const initialPassageForMode = useMemo(() => {
    if (initialTestMode === 'exam') {
      return PASSAGES.find((p) => p.id === defaultExam.passageId) || DEFAULT_PASSAGE;
    }
    return DEFAULT_PASSAGE;
  }, [initialTestMode, defaultExam]);

  const initialDurationForMode = initialTestMode === 'exam' ? defaultExam.duration : 60;

  const activePassages = useMemo(
    () => (selectedLanguage === 'hi' ? HINDI_PASSAGES : PASSAGES),
    [selectedLanguage]
  );

  const {
    state,
    metrics,
    inputRef,
    isFocused,
    focusTypingArea,
    restart,
    completeTest,
    setDuration,
    setPassage,
    recentKey,
    handleKeyDown,
    handleBeforeInput,
    handleInput,
    handleCompositionStart,
    handleCompositionEnd,
    handlePaste,
    handleFocus,
    handleBlur,
  } = useTypingEngine({
    initialPassage: initialPassageForMode,
    initialDuration: initialDurationForMode,
  });

  const handleSelectLanguage = (lang: TypingLanguage) => {
    if (lang === selectedLanguage || state.status === 'running') return;
    setSelectedLanguage(lang);
    const newPassage = lang === 'hi' ? DEFAULT_HINDI_PASSAGE : DEFAULT_PASSAGE;
    setPassage(newPassage);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectStandardMode = () => {
    if (testMode === 'standard') {
      setActiveDropdown(null);
      return;
    }
    setTestMode('standard');
    setDuration(60);
    const defaultPassage = selectedLanguage === 'hi' ? DEFAULT_HINDI_PASSAGE : DEFAULT_PASSAGE;
    setPassage(defaultPassage);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectExamProfile = (profile: ExamProfile) => {
    setTestMode('exam');
    setSelectedExamProfile(profile);
    setDuration(profile.duration);
    const examPassage = PASSAGES.find((p) => p.id === profile.passageId) || DEFAULT_PASSAGE;
    setPassage(examPassage);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectDuration = (dur: TestDuration) => {
    setDuration(dur);
    setActiveDropdown(null);
    restart();
  };

  // Focus typing area on mount if in test mode
  useEffect(() => {
    if (viewMode === 'test') {
      focusTypingArea();
    }
  }, [viewMode, focusTypingArea]);

  // Global keyboard shortcut: Escape restarts the test
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewMode === 'test' && activeDropdown === null) {
        restart();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [viewMode, activeDropdown, restart]);

  // Generate deterministic practice plan from latest test state
  const analytics = useMemo(() => analyzeTypingResult(state), [state]);
  const practicePlan = useMemo(
    () => generatePracticePlan(state, analytics, practiceType),
    [state, analytics, practiceType]
  );

  const isCompleted = state.status === 'completed';

  // Automatically persist completed test attempt to localStorage (only once per completion)
  const lastSavedTestRef = useRef<string | null>(null);

  useEffect(() => {
    if (viewMode === 'test' && state.status === 'completed' && state.endTime !== null) {
      // Unique fingerprint preventing duplicate saves during re-renders
      const completionFingerprint = `${state.startTime}_${state.endTime}_${state.duration}_${state.totalKeystrokes}_${testMode}_${state.passage.language}`;
      if (lastSavedTestRef.current !== completionFingerprint) {
        lastSavedTestRef.current = completionFingerprint;
        const entry = createHistoryEntry(
          state,
          analytics,
          Date.now(),
          testMode,
          testMode === 'exam' ? selectedExamProfile.id : undefined
        );
        saveHistoryEntry(entry);
      }
    }
  }, [
    viewMode,
    state.status,
    state.startTime,
    state.endTime,
    state.duration,
    state.totalKeystrokes,
    state,
    analytics,
    testMode,
    selectedExamProfile.id,
  ]);

  const durationLabel = useMemo(() => {
    if (testMode === 'exam') {
      return formatDuration(selectedExamProfile.duration);
    }
    const match = DURATIONS.find((d) => d.value === state.duration);
    return match ? match.label : `${state.duration}s`;
  }, [testMode, selectedExamProfile.duration, state.duration]);

  const modeLabel = useMemo(() => {
    if (testMode === 'standard') return 'Standard';
    return selectedExamProfile.shortName;
  }, [testMode, selectedExamProfile.shortName]);

  // If in practice session view
  if (viewMode === 'practice') {
    return (
      <section className="typing-test-container" aria-label="Practice session workspace">
        <PracticeSession
          plan={practicePlan}
          activeMode={practiceType}
          onChangeMode={setPracticeType}
          onBackToTest={() => setViewMode('test')}
        />
      </section>
    );
  }

  return (
    <section className="typing-test-container" aria-label="Typing test engine workspace">
      {/* 1. Streamlined Contextual Controls Bar */}
      <div className="test-compact-toolbar" ref={toolbarRef} role="toolbar" aria-label="Test configuration">
        {/* Duration Pill */}
        <div className="toolbar-pill-wrapper">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'duration' ? 'active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'duration' ? null : 'duration'))}
            disabled={state.status === 'running' || testMode === 'exam'}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'duration'}
            title={testMode === 'exam' ? `Exam duration: ${formatDuration(selectedExamProfile.duration)}` : 'Select duration'}
          >
            <span>{durationLabel}</span>
            {testMode !== 'exam' && <span className="pill-arrow" aria-hidden="true">▾</span>}
          </button>

          {activeDropdown === 'duration' && testMode !== 'exam' && (
            <div className="toolbar-dropdown" role="menu">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="menuitem"
                  className={`toolbar-dropdown-item ${state.duration === d.value ? 'selected' : ''}`}
                  onClick={() => handleSelectDuration(d.value)}
                >
                  <span>{d.label}</span>
                  {state.duration === d.value && <span className="item-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language Pill */}
        <div className="toolbar-pill-wrapper" data-testid="language-selector">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'language' ? 'active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'language' ? null : 'language'))}
            disabled={state.status === 'running'}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'language'}
            title="Select language"
          >
            <span>{selectedLanguage === 'hi' ? 'हिंदी' : 'English'}</span>
            <span className="pill-arrow" aria-hidden="true">▾</span>
          </button>

          {activeDropdown === 'language' && (
            <div className="toolbar-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                data-testid="lang-en-btn"
                className={`toolbar-dropdown-item ${selectedLanguage === 'en' ? 'selected' : ''}`}
                onClick={() => handleSelectLanguage('en')}
              >
                <span>English</span>
                {selectedLanguage === 'en' && <span className="item-check">✓</span>}
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="lang-hi-btn"
                className={`toolbar-dropdown-item ${selectedLanguage === 'hi' ? 'selected' : ''}`}
                onClick={() => handleSelectLanguage('hi')}
              >
                <span>हिंदी</span>
                {selectedLanguage === 'hi' && <span className="item-check">✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* Mode Pill */}
        <div className="toolbar-pill-wrapper">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'mode' ? 'active' : ''} ${testMode === 'exam' ? 'exam-active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'mode' ? null : 'mode'))}
            disabled={state.status === 'running'}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'mode'}
            title="Select test mode"
          >
            <span>{modeLabel}</span>
            <span className="pill-arrow" aria-hidden="true">▾</span>
          </button>

          {activeDropdown === 'mode' && (
            <div className="toolbar-dropdown toolbar-dropdown-wide" role="menu">
              <div className="dropdown-section-title">Standard</div>
              <button
                type="button"
                role="menuitem"
                data-testid="mode-standard-btn"
                className={`toolbar-dropdown-item ${testMode === 'standard' ? 'selected' : ''}`}
                onClick={handleSelectStandardMode}
              >
                <div>
                  <div className="item-title">Standard Test</div>
                  <div className="item-subtitle">Speed and accuracy practice</div>
                </div>
                {testMode === 'standard' && <span className="item-check">✓</span>}
              </button>

              <div className="dropdown-section-title" data-testid="mode-exam-btn">Gov. Exam Simulations</div>
              {examProfiles.map((p) => {
                const isSelected = testMode === 'exam' && selectedExamProfile.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitem"
                    data-testid={`exam-profile-${p.id}`}
                    className={`toolbar-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectExamProfile(p)}
                  >
                    <div>
                      <div className="item-title">{p.name}</div>
                      <div className="item-subtitle">
                        {formatDuration(p.duration)} • Target {p.targetValue} WPM
                        {p.minimumAccuracy ? ` • ${p.minimumAccuracy}% min acc` : ''}
                      </div>
                    </div>
                    {isSelected && <span className="item-check">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Topic Pill (Standard mode only) */}
        {testMode === 'standard' && (
          <div className="toolbar-pill-wrapper">
            <button
              type="button"
              className={`toolbar-pill ${activeDropdown === 'topic' ? 'active' : ''}`}
              onClick={() => setActiveDropdown((prev) => (prev === 'topic' ? null : 'topic'))}
              disabled={state.status === 'running'}
              aria-haspopup="true"
              aria-expanded={activeDropdown === 'topic'}
              title="Select topic passage"
            >
              <span>Topic</span>
              <span className="pill-arrow" aria-hidden="true">▾</span>
            </button>

            {activeDropdown === 'topic' && (
              <div className="toolbar-dropdown toolbar-dropdown-wide" role="menu">
                <div className="dropdown-section-title">Passages ({selectedLanguage === 'hi' ? 'हिंदी' : 'English'})</div>
                {activePassages.map((p) => {
                  const isSelected = state.passage.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="menuitem"
                      className={`toolbar-dropdown-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setPassage(p);
                        setActiveDropdown(null);
                        restart();
                      }}
                    >
                      <div>
                        <div className="item-title">{p.title}</div>
                        <div className="item-subtitle" style={{ textTransform: 'capitalize' }}>Difficulty: {p.difficulty}</div>
                      </div>
                      {isSelected && <span className="item-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Virtual Keyboard Toggle Pill */}
        <button
          type="button"
          className={`toolbar-pill ${showKeyboard ? 'active' : ''}`}
          onClick={handleToggleKeyboard}
          data-testid="toggle-keyboard-btn"
          aria-pressed={showKeyboard}
          title={showKeyboard ? 'Hide virtual keyboard' : 'Show virtual keyboard'}
        >
          <span>⌨️ Keyboard</span>
        </button>

        {/* Restart Button */}
        <button
          type="button"
          onClick={restart}
          className="toolbar-pill toolbar-pill-reset"
          title="Restart Test (Esc)"
        >
          <span>↺ Reset</span>
        </button>

        {/* Hidden complete-test trigger for deterministic testing */}
        <button
          type="button"
          data-testid="complete-test-btn"
          onClick={completeTest}
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
        >
          Complete Test
        </button>
      </div>

      {/* Exam Mode Active Details (when in exam mode) */}
      {testMode === 'exam' && (
        <div className="exam-mode-active-bar" data-testid="exam-active-bar">
          <span className="exam-active-title">
            Preset: <strong>{selectedExamProfile.name}</strong>
          </span>
          <span className="exam-active-target">
            Target: <strong>{selectedExamProfile.targetValue} WPM</strong>
          </span>
          <span className="exam-active-duration">
            Duration: <strong>{formatDuration(selectedExamProfile.duration)}</strong>
          </span>
        </div>
      )}

      {/* Main Interactive Stage: Active Passage or Completed Results */}
      {isCompleted ? (
        <ResultCard
          state={state}
          onRestart={restart}
          onChangeTest={restart}
          onPracticeMistakes={() => setViewMode('practice')}
          testMode={testMode}
          examProfile={testMode === 'exam' ? selectedExamProfile : undefined}
        />
      ) : (
        <div className="test-workspace-stage">
          {/* Exam Instructions Card when in exam mode and idle */}
          {testMode === 'exam' && state.status === 'idle' && (
            <ExamInstructionsCard profile={selectedExamProfile} />
          )}

          {/* Live Metrics — above the passage */}
          <MetricsBar metrics={metrics} />

          {/* Primary Typing Passage */}
          <PassageDisplay
            characters={state.characters}
            extraCharacters={state.extraCharacters}
            currentIndex={state.currentIndex}
            status={state.status}
            isFocused={isFocused}
            language={state.passage.language}
            inputRef={inputRef}
            onContainerClick={focusTypingArea}
            onKeyDown={handleKeyDown}
            onBeforeInput={handleBeforeInput}
            onInput={handleInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />

          {/* Helper Instructions below passage */}
          <div className="test-guidance-line">
            <span>
              {state.status === 'idle'
                ? selectedLanguage === 'hi'
                  ? 'टाइमर शुरू करने के लिए कोई भी वर्ण टाइप करें'
                  : 'Press any key to start'
                : selectedLanguage === 'hi'
                ? 'परीक्षण जारी है — टाइप करते रहें'
                : 'Test in progress — keep typing!'}
            </span>
            <span className="reset-shortcut-hint">
              <kbd>Esc</kbd> to restart
            </span>
          </div>

          {/* Optional Virtual Keyboard (collapsed by default) */}
          {showKeyboard && (
            <div className="test-keyboard-wrapper">
              <VirtualKeyboard
                typingState={state}
                language={state.passage.language}
                recentKey={recentKey}
                mistakes={analytics.mostMistypedCharacters}
                visible={showKeyboard}
                onToggleVisible={handleToggleKeyboard}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default TypingTest;
