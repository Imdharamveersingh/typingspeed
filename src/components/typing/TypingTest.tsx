'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTypingEngine } from '@/engine/useTypingEngine';
import { DEFAULT_PASSAGE, PASSAGES } from '@/data/passages';
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
import { ENCOURAGEMENT_TITLES, getNextEncouragementTitle } from '@/data/encouragementTitles';
import { generateTestPassage, TestDifficulty, TestType } from '@/engine/passageGenerator';

export interface TypingTestProps {
  initialTestMode?: 'standard' | 'exam';
}

const DURATIONS: { label: string; value: TestDuration }[] = [
  { label: '60s', value: 60 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
];

const WORD_TARGETS: number[] = [25, 50, 100, 250, 500];
const CHAR_TARGETS: number[] = [100, 250, 500, 1000, 2000];

const DIFFICULTIES: { label: string; value: TestDifficulty }[] = [
  { label: 'Easy', value: 'easy' },
  { label: 'Standard', value: 'medium' },
  { label: 'Hard', value: 'hard' },
];

export const TypingTest: React.FC<TypingTestProps> = ({
  initialTestMode = 'standard',
}) => {
  const [viewMode, setViewMode] = useState<'test' | 'practice'>('test');
  const [practiceType, setPracticeType] = useState<PracticeType>('characters');
  const [testMode, setTestMode] = useState<'standard' | 'exam'>(initialTestMode);
  const [testType, setTestTypeState] = useState<TestType>('time');
  const [selectedLanguage, setSelectedLanguage] = useState<TypingLanguage>('en');
  const [selectedDifficulty, setSelectedDifficulty] = useState<TestDifficulty>('medium');
  const [selectedWordTarget, setSelectedWordTarget] = useState<number>(50);
  const [selectedCharTarget, setSelectedCharTarget] = useState<number>(250);
  const [selectedExamProfile, setSelectedExamProfile] = useState<ExamProfile>(getDefaultExamProfile());
  const [activeDropdown, setActiveDropdown] = useState<'target' | 'type' | 'language' | 'difficulty' | null>(null);
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [titleIndex, setTitleIndex] = useState<number>(0);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const examProfiles = useMemo(() => getAllExamProfiles(), []);

  // Set random title on client mount to avoid SSR hydration mismatch
  useEffect(() => {
    const initial = getNextEncouragementTitle(0);
    setTitleIndex(initial.index);
  }, []);

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
    return generateTestPassage({
      language: 'en',
      difficulty: 'medium',
      testType: 'time',
      targetCount: 60,
    });
  }, [initialTestMode, defaultExam]);

  const initialDurationForMode = initialTestMode === 'exam' ? defaultExam.duration : 60;

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
    setTestType,
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
    initialTestType: 'time',
  });

  const handleRetest = useCallback(() => {
    const next = getNextEncouragementTitle(titleIndex);
    setTitleIndex(next.index);
    restart();
  }, [titleIndex, restart]);

  const handleSelectLanguage = (lang: TypingLanguage) => {
    if (lang === selectedLanguage || state.status === 'running') return;
    setSelectedLanguage(lang);
    if (testMode === 'exam') {
      setActiveDropdown(null);
      return;
    }
    const target =
      testType === 'words'
        ? selectedWordTarget
        : testType === 'characters'
        ? selectedCharTarget
        : state.duration;
    const newPassage = generateTestPassage({
      language: lang,
      difficulty: selectedDifficulty,
      testType,
      targetCount: target,
    });
    setPassage(newPassage, testType, target);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectDifficulty = (diff: TestDifficulty) => {
    setSelectedDifficulty(diff);
    if (testMode === 'exam') {
      setActiveDropdown(null);
      return;
    }
    const target =
      testType === 'words'
        ? selectedWordTarget
        : testType === 'characters'
        ? selectedCharTarget
        : state.duration;
    const newPassage = generateTestPassage({
      language: selectedLanguage,
      difficulty: diff,
      testType,
      targetCount: target,
    });
    setPassage(newPassage, testType, target);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectTestType = (type: TestType) => {
    if (testMode === 'exam') {
      setTestMode('standard');
    }
    setTestTypeState(type);
    setTestType(type);
    const target =
      type === 'words'
        ? selectedWordTarget
        : type === 'characters'
        ? selectedCharTarget
        : state.duration;
    const newPassage = generateTestPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: type,
      targetCount: target,
    });
    setPassage(newPassage, type, target);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectStandardMode = () => {
    setTestMode('standard');
    setTestTypeState('time');
    setTestType('time');
    setDuration(60);
    const newPassage = generateTestPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'time',
      targetCount: 60,
    });
    setPassage(newPassage, 'time', 60);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectExamProfile = (profile: ExamProfile) => {
    setTestMode('exam');
    setSelectedExamProfile(profile);
    setDuration(profile.duration);
    const examPassage = PASSAGES.find((p) => p.id === profile.passageId) || DEFAULT_PASSAGE;
    setPassage(examPassage, 'time', profile.duration);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectDuration = (dur: TestDuration) => {
    setDuration(dur);
    const newPassage = generateTestPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'time',
      targetCount: dur,
    });
    setPassage(newPassage, 'time', dur);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectWordTarget = (words: number) => {
    setSelectedWordTarget(words);
    const newPassage = generateTestPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'words',
      targetCount: words,
    });
    setPassage(newPassage, 'words', words);
    setActiveDropdown(null);
    restart();
  };

  const handleSelectCharTarget = (chars: number) => {
    setSelectedCharTarget(chars);
    const newPassage = generateTestPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'characters',
      targetCount: chars,
    });
    setPassage(newPassage, 'characters', chars);
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
        handleRetest();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [viewMode, activeDropdown, handleRetest]);

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
      const completionFingerprint = `${state.startTime}_${state.endTime}_${state.duration}_${state.totalKeystrokes}_${testMode}_${state.passage.language}_${testType}`;
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
    testType,
    selectedExamProfile.id,
  ]);

  // Labels for rectangular controls
  const targetLabel = useMemo(() => {
    if (testMode === 'exam') {
      return { prefix: 'TIME', value: formatDuration(selectedExamProfile.duration) };
    }
    if (testType === 'words') {
      return { prefix: 'WORDS', value: `${selectedWordTarget}` };
    }
    if (testType === 'characters') {
      return { prefix: 'CHARS', value: `${selectedCharTarget}` };
    }
    const match = DURATIONS.find((d) => d.value === state.duration);
    return { prefix: 'TIME', value: match ? match.label : `${state.duration}s` };
  }, [testMode, testType, selectedWordTarget, selectedCharTarget, selectedExamProfile.duration, state.duration]);

  const testTypeLabel = useMemo(() => {
    if (testMode === 'exam') return `Exam (${selectedExamProfile.shortName})`;
    if (testType === 'words') return 'Words';
    if (testType === 'characters') return 'Characters';
    return 'Time';
  }, [testMode, testType, selectedExamProfile.shortName]);

  const difficultyLabel = useMemo(() => {
    const match = DIFFICULTIES.find((d) => d.value === selectedDifficulty);
    return match ? match.label : 'Standard';
  }, [selectedDifficulty]);

  const keyboardName = selectedLanguage === 'hi' ? 'InScript' : 'QWERTY';
  const currentTitle = ENCOURAGEMENT_TITLES[titleIndex] ?? ENCOURAGEMENT_TITLES[0];

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
      {/* 1. Large Encouragement Title with Typewriter Reveal */}
      <div className="encouragement-title-container" data-testid="encouragement-title">
        <h1
          key={titleIndex}
          className="encouragement-title-text encouragement-title-animated"
        >
          {currentTitle}
        </h1>
      </div>

      {/* 2. Modern Rectangular Contextual Control Toolbar:
             Order: 1. Time/Target | 2. Test Type | 3. Language | 4. Difficulty | 5. Keyboard | 6. Retest */}
      <div className="test-compact-toolbar" ref={toolbarRef} role="toolbar" aria-label="Test configuration">
        {/* 1. Time / Target Count Control */}
        <div className="toolbar-pill-wrapper" data-testid="duration-selector">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'target' ? 'active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'target' ? null : 'target'))}
            disabled={state.status === 'running' || testMode === 'exam'}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'target'}
            title={testMode === 'exam' ? `Exam duration: ${formatDuration(selectedExamProfile.duration)}` : `Select target ${targetLabel.prefix.toLowerCase()}`}
          >
            <span className="control-label">{targetLabel.prefix}</span>
            <span className="control-value">{targetLabel.value}</span>
            {testMode !== 'exam' && <span className="pill-arrow" aria-hidden="true">▾</span>}
          </button>

          {activeDropdown === 'target' && testMode !== 'exam' && (
            <div className="toolbar-dropdown" role="menu">
              {testType === 'time' &&
                DURATIONS.map((d) => (
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

              {testType === 'words' &&
                WORD_TARGETS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    role="menuitem"
                    className={`toolbar-dropdown-item ${selectedWordTarget === count ? 'selected' : ''}`}
                    onClick={() => handleSelectWordTarget(count)}
                  >
                    <span>{count} words</span>
                    {selectedWordTarget === count && <span className="item-check">✓</span>}
                  </button>
                ))}

              {testType === 'characters' &&
                CHAR_TARGETS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    role="menuitem"
                    className={`toolbar-dropdown-item ${selectedCharTarget === count ? 'selected' : ''}`}
                    onClick={() => handleSelectCharTarget(count)}
                  >
                    <span>{count} chars</span>
                    {selectedCharTarget === count && <span className="item-check">✓</span>}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* 2. Test Type Control (Time | Words | Characters) */}
        <div className="toolbar-pill-wrapper" data-testid="test-type-selector">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'type' ? 'active' : ''} ${testMode === 'exam' ? 'exam-active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'type' ? null : 'type'))}
            disabled={state.status === 'running'}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'type'}
            title="Select test type"
          >
            <span className="control-label">TYPE</span>
            <span className="control-value">{testTypeLabel}</span>
            <span className="pill-arrow" aria-hidden="true">▾</span>
          </button>

          {activeDropdown === 'type' && (
            <div className="toolbar-dropdown toolbar-dropdown-wide" role="menu">
              <div className="dropdown-section-title">Standard Modes</div>
              <button
                type="button"
                role="menuitem"
                data-testid="type-time-btn"
                className={`toolbar-dropdown-item ${testMode === 'standard' && testType === 'time' ? 'selected' : ''}`}
                onClick={() => handleSelectTestType('time')}
              >
                <div>
                  <div className="item-title">Time Test</div>
                  <div className="item-subtitle">Timed speed challenge (60s, 3m, 5m, 10m)</div>
                </div>
                {testMode === 'standard' && testType === 'time' && <span className="item-check">✓</span>}
              </button>

              <button
                type="button"
                role="menuitem"
                data-testid="type-words-btn"
                className={`toolbar-dropdown-item ${testMode === 'standard' && testType === 'words' ? 'selected' : ''}`}
                onClick={() => handleSelectTestType('words')}
              >
                <div>
                  <div className="item-title">Words Test</div>
                  <div className="item-subtitle">Fixed target word count (25, 50, 100, 250, 500)</div>
                </div>
                {testMode === 'standard' && testType === 'words' && <span className="item-check">✓</span>}
              </button>

              <button
                type="button"
                role="menuitem"
                data-testid="type-characters-btn"
                className={`toolbar-dropdown-item ${testMode === 'standard' && testType === 'characters' ? 'selected' : ''}`}
                onClick={() => handleSelectTestType('characters')}
              >
                <div>
                  <div className="item-title">Characters Test</div>
                  <div className="item-subtitle">Fixed character volume (100, 250, 500, 1000, 2000)</div>
                </div>
                {testMode === 'standard' && testType === 'characters' && <span className="item-check">✓</span>}
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

        {/* 3. Language Control */}
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
            <span className="control-label">LANG</span>
            <span className="control-value">{selectedLanguage === 'hi' ? 'हिंदी' : 'English'}</span>
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

        {/* 4. Difficulty Control */}
        <div className="toolbar-pill-wrapper" data-testid="difficulty-selector">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'difficulty' ? 'active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'difficulty' ? null : 'difficulty'))}
            disabled={state.status === 'running'}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'difficulty'}
            title="Select difficulty"
          >
            <span className="control-label">DIFFICULTY</span>
            <span className="control-value">{difficultyLabel}</span>
            <span className="pill-arrow" aria-hidden="true">▾</span>
          </button>

          {activeDropdown === 'difficulty' && (
            <div className="toolbar-dropdown" role="menu">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="menuitem"
                  className={`toolbar-dropdown-item ${selectedDifficulty === d.value ? 'selected' : ''}`}
                  onClick={() => handleSelectDifficulty(d.value)}
                >
                  <span>{d.label}</span>
                  {selectedDifficulty === d.value && <span className="item-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. Virtual Keyboard Control */}
        <button
          type="button"
          className={`toolbar-pill ${showKeyboard ? 'active' : ''}`}
          onClick={handleToggleKeyboard}
          data-testid="toggle-keyboard-btn"
          aria-pressed={showKeyboard}
          title={showKeyboard ? 'Hide virtual keyboard' : 'Show virtual keyboard'}
        >
          <span className="control-label">KEYBOARD</span>
          <span className="control-value">⌨️ {keyboardName}</span>
        </button>

        {/* 6. Retest Button */}
        <button
          type="button"
          onClick={handleRetest}
          data-testid="retest-btn"
          className="toolbar-pill toolbar-pill-reset"
          title="Retest (Esc)"
        >
          <span className="control-value">↺ Retest</span>
        </button>

        {/* Hidden test-mode and complete-test triggers for deterministic automated tests */}
        <button
          type="button"
          data-testid="mode-standard-btn"
          onClick={handleSelectStandardMode}
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
        >
          Standard Test
        </button>
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
          onRestart={handleRetest}
          onChangeTest={handleRetest}
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

          {/* Live Metrics: GWPM | Net WPM | Accuracy | Time | Errors */}
          <MetricsBar metrics={metrics} testType={testType} initialDuration={state.duration} />

          {/* Primary 5-Line Rolling Typing Passage */}
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

          {/* Helper Guidance below passage */}
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
              <kbd>Esc</kbd> to retest
            </span>
          </div>

          {/* Optional Compact Virtual Keyboard (below passage, ~60% width on desktop) */}
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
