'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTypingEngine } from '@/engine/useTypingEngine';
import { DEFAULT_PASSAGE, PASSAGES } from '@/data/passages';
import { analyzeTypingResult } from '@/engine/analytics';
import { generatePracticePlan, PracticeType } from '@/engine/practiceEngine';
import { createHistoryEntry, saveHistoryEntry } from '@/engine/progressStorage';
import MetricsBar from './MetricsBar';
import TypingProgressBar from './TypingProgressBar';
import PassageDisplay from './PassageDisplay';
import ResultCard from './ResultCard';
import PracticeSession from '@/components/practice/PracticeSession';
import ExamInstructionsCard from '@/components/exam/ExamInstructionsCard';
import { getAllExamProfiles, getDefaultExamProfile } from '@/engine/examEngine';
import { ExamProfile } from '@/engine/examTypes';
import { TestDuration, TypingLanguage } from '@/engine/types';
import { formatDuration } from '@/utils/metrics';
import VirtualKeyboard from '@/components/keyboard/VirtualKeyboard';
import { generateTestPassage, TestDifficulty, TestType } from '@/engine/passageGenerator';
import { getCompletedWordCount } from '@/engine/typingEngine';

export interface TypingTestProps {
  initialTestMode?: 'standard' | 'exam';
  examNotice?: React.ReactNode;
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


/**
 * Isolated Exam Active Bar Component — memoized so it never re-renders during active typing
 */
const ExamActiveBar = React.memo(function ExamActiveBar({
  profile,
}: {
  profile: ExamProfile;
}) {
  return (
    <div className="exam-mode-active-bar" data-testid="exam-active-bar">
      <span className="exam-active-title">
        Preset: <strong>{profile.name}</strong>
      </span>
      <span className="exam-active-target">
        Target: <strong>{profile.targetValue} WPM</strong>
      </span>
      <span className="exam-active-duration">
        Duration: <strong>{formatDuration(profile.duration)}</strong>
      </span>
    </div>
  );
});

interface TestToolbarProps {
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  activeDropdown: 'target' | 'type' | 'language' | 'difficulty' | 'settings' | null;
  setActiveDropdown: React.Dispatch<React.SetStateAction<'target' | 'type' | 'language' | 'difficulty' | 'settings' | null>>;
  isRunning: boolean;
  testMode: 'standard' | 'exam';
  testType: TestType;
  testTypeLabel: string;
  targetLabel: { prefix: string; value: string };
  selectedLanguage: TypingLanguage;
  difficultyLabel: string;
  examProfiles: ExamProfile[];
  selectedExamProfile: ExamProfile;
  selectedWordTarget: number;
  selectedCharTarget: number;
  selectedDifficulty: TestDifficulty;
  duration: TestDuration;
  showKeyboard: boolean;
  onToggleKeyboard: () => void;
  onSelectTestType: (type: TestType) => void;
  onSelectExamProfile: (p: ExamProfile) => void;
  onSelectDuration: (dur: TestDuration) => void;
  onSelectWordTarget: (words: number) => void;
  onSelectCharTarget: (chars: number) => void;
  onSelectLanguage: (lang: TypingLanguage) => void;
  onSelectDifficulty: (diff: TestDifficulty) => void;
  onRetest: () => void;
  onSelectStandardMode: () => void;
  onCompleteTest: () => void;
}

/**
 * Isolated Compact Toolbar Component — memoized so all 6 buttons and popups skip rendering during active typing
 */
const TestToolbar = React.memo(function TestToolbar({
  toolbarRef,
  activeDropdown,
  setActiveDropdown,
  isRunning,
  testMode,
  testType,
  testTypeLabel,
  targetLabel,
  selectedLanguage,
  difficultyLabel,
  examProfiles,
  selectedExamProfile,
  selectedWordTarget,
  selectedCharTarget,
  selectedDifficulty,
  duration,
  showKeyboard,
  onToggleKeyboard,
  onSelectTestType,
  onSelectExamProfile,
  onSelectDuration,
  onSelectWordTarget,
  onSelectCharTarget,
  onSelectLanguage,
  onSelectDifficulty,
  onRetest,
  onSelectStandardMode,
  onCompleteTest,
}: TestToolbarProps) {
  return (
    <div className="test-compact-toolbar" ref={toolbarRef} role="toolbar" aria-label="Test configuration">
      {/* 1. Test Type Control (Time | Words | Characters) — FIRST */}
      <div className="toolbar-pill-wrapper" data-testid="test-type-selector">
        <button
          type="button"
          className={`toolbar-pill ${activeDropdown === 'type' ? 'active' : ''} ${testMode === 'exam' ? 'exam-active' : ''}`}
          onClick={() => setActiveDropdown((prev) => (prev === 'type' ? null : 'type'))}
          disabled={isRunning}
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
              onClick={() => onSelectTestType('time')}
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
              onClick={() => onSelectTestType('words')}
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
              onClick={() => onSelectTestType('characters')}
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
                  onClick={() => onSelectExamProfile(p)}
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

      {/* 2. Time / Target Count Control — SECOND */}
      <div className="toolbar-pill-wrapper" data-testid="duration-selector">
        <button
          type="button"
          className={`toolbar-pill ${activeDropdown === 'target' ? 'active' : ''}`}
          onClick={() => setActiveDropdown((prev) => (prev === 'target' ? null : 'target'))}
          disabled={isRunning || testMode === 'exam'}
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
                  className={`toolbar-dropdown-item ${duration === d.value ? 'selected' : ''}`}
                  onClick={() => onSelectDuration(d.value)}
                >
                  <span>{d.label}</span>
                  {duration === d.value && <span className="item-check">✓</span>}
                </button>
              ))}

            {testType === 'words' &&
              WORD_TARGETS.map((count) => (
                <button
                  key={count}
                  type="button"
                  role="menuitem"
                  className={`toolbar-dropdown-item ${selectedWordTarget === count ? 'selected' : ''}`}
                  onClick={() => onSelectWordTarget(count)}
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
                  onClick={() => onSelectCharTarget(count)}
                >
                  <span>{count} chars</span>
                  {selectedCharTarget === count && <span className="item-check">✓</span>}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* 3. Language Control */}
      <div className="toolbar-pill-wrapper" data-testid="language-selector">
        <button
          type="button"
          className={`toolbar-pill ${activeDropdown === 'language' ? 'active' : ''}`}
          onClick={() => setActiveDropdown((prev) => (prev === 'language' ? null : 'language'))}
          disabled={isRunning}
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
              onClick={() => onSelectLanguage('en')}
            >
              <span>English</span>
              {selectedLanguage === 'en' && <span className="item-check">✓</span>}
            </button>
            <button
              type="button"
              role="menuitem"
              data-testid="lang-hi-btn"
              className={`toolbar-dropdown-item ${selectedLanguage === 'hi' ? 'selected' : ''}`}
              onClick={() => onSelectLanguage('hi')}
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
          disabled={isRunning}
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
                onClick={() => onSelectDifficulty(d.value)}
              >
                <span>{d.label}</span>
                {selectedDifficulty === d.value && <span className="item-check">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. Settings Control Popover with Virtual Keyboard toggle */}
      <div className="toolbar-pill-wrapper" data-testid="settings-selector">
        <button
          type="button"
          className={`toolbar-pill toolbar-pill-settings ${activeDropdown === 'settings' ? 'active' : ''}`}
          data-testid="settings-btn"
          onClick={() => setActiveDropdown((prev) => (prev === 'settings' ? null : 'settings'))}
          aria-haspopup="true"
          aria-expanded={activeDropdown === 'settings'}
          title="Settings"
        >
          <span className="control-value">⚙ Settings</span>
          <span className="pill-arrow" aria-hidden="true">▾</span>
        </button>

        {activeDropdown === 'settings' && (
          <div className="toolbar-dropdown toolbar-dropdown-settings" role="menu">
            <div className="dropdown-section-title">Settings</div>
            <div className="settings-toggle-row">
              <span className="settings-toggle-label">Virtual Keyboard</span>
              <button
                type="button"
                role="switch"
                aria-checked={showKeyboard}
                data-testid="toggle-keyboard-btn"
                className={`settings-switch-btn ${showKeyboard ? 'is-on' : 'is-off'}`}
                onClick={onToggleKeyboard}
                title={showKeyboard ? 'Hide virtual keyboard' : 'Show virtual keyboard'}
              >
                <span className="switch-pill">
                  <span className="switch-dot" />
                </span>
                <span className="switch-status">{showKeyboard ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Retest Button */}
      <button
        type="button"
        onClick={onRetest}
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
        onClick={onSelectStandardMode}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      >
        Standard Test
      </button>
      <button
        type="button"
        data-testid="complete-test-btn"
        onClick={onCompleteTest}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      >
        Complete Test
      </button>
    </div>
  );
});

export const TypingTest: React.FC<TypingTestProps> = ({
  initialTestMode = 'standard',
  examNotice,
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
  const [activeDropdown, setActiveDropdown] = useState<'target' | 'type' | 'language' | 'difficulty' | 'settings' | null>(null);
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

  const handleToggleKeyboard = useCallback(() => {
    setShowKeyboard((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('typing_platform_keyboard_visible', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

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
    restart();
  }, [restart]);

  const handleSelectLanguage = useCallback((lang: TypingLanguage) => {
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
  }, [selectedLanguage, state.status, state.duration, testMode, testType, selectedWordTarget, selectedCharTarget, selectedDifficulty, setPassage, restart]);

  const handleSelectDifficulty = useCallback((diff: TestDifficulty) => {
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
  }, [testMode, testType, selectedWordTarget, selectedCharTarget, state.duration, selectedLanguage, setPassage, restart]);

  const handleSelectTestType = useCallback((type: TestType) => {
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
  }, [testMode, setTestType, selectedWordTarget, selectedCharTarget, state.duration, selectedLanguage, selectedDifficulty, setPassage, restart]);

  const handleSelectStandardMode = useCallback(() => {
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
  }, [setTestType, setDuration, selectedLanguage, selectedDifficulty, setPassage, restart]);

  const handleSelectExamProfile = useCallback((profile: ExamProfile) => {
    setTestMode('exam');
    setSelectedExamProfile(profile);
    setTestTypeState('time');
    setTestType('time', profile.duration);
    setDuration(profile.duration);
    const examPassage = PASSAGES.find((p) => p.id === profile.passageId) || DEFAULT_PASSAGE;
    setPassage(examPassage, 'time', profile.duration);
    setActiveDropdown(null);
    restart();
  }, [setTestType, setDuration, setPassage, restart]);

  const handleSelectDuration = useCallback((dur: TestDuration) => {
    setTestTypeState('time');
    setTestType('time', dur);
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
  }, [setTestType, setDuration, selectedLanguage, selectedDifficulty, setPassage, restart]);

  const handleSelectWordTarget = useCallback((words: number) => {
    setSelectedWordTarget(words);
    setTestTypeState('words');
    setTestType('words', words);
    const newPassage = generateTestPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'words',
      targetCount: words,
    });
    setPassage(newPassage, 'words', words);
    setActiveDropdown(null);
    restart();
  }, [selectedLanguage, selectedDifficulty, setTestType, setPassage, restart]);

  const handleSelectCharTarget = useCallback((chars: number) => {
    setSelectedCharTarget(chars);
    setTestTypeState('characters');
    setTestType('characters', chars);
    const newPassage = generateTestPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'characters',
      targetCount: chars,
    });
    setPassage(newPassage, 'characters', chars);
    setActiveDropdown(null);
    restart();
  }, [selectedLanguage, selectedDifficulty, setTestType, setPassage, restart]);

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

  // Generate deterministic practice plan only when test completes or in practice view to eliminate keystroke latency
  const isCompleted = state.status === 'completed';
  const shouldComputeAnalytics = isCompleted || viewMode === 'practice';

  const analytics = useMemo(() => {
    if (!shouldComputeAnalytics) return null;
    return analyzeTypingResult(state);
  }, [state, shouldComputeAnalytics]);

  const practicePlan = useMemo(() => {
    if (!shouldComputeAnalytics || !analytics) return null;
    return generatePracticePlan(state, analytics, practiceType);
  }, [state, analytics, practiceType, shouldComputeAnalytics]);

  // Automatically persist completed test attempt to localStorage (only once per completion)
  const lastSavedTestRef = useRef<string | null>(null);

  useEffect(() => {
    if (viewMode === 'test' && state.status === 'completed' && state.endTime !== null && analytics) {
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

  const effectiveTestType: TestType = state.testType || testType;

  // Synchronized target count and label for secondary toolbar pill
  const targetLabel = useMemo(() => {
    if (testMode === 'exam') {
      return { prefix: 'TIME', value: formatDuration(selectedExamProfile.duration) };
    }
    if (effectiveTestType === 'words') {
      return { prefix: 'WORDS', value: `${selectedWordTarget}` };
    }
    if (effectiveTestType === 'characters') {
      return { prefix: 'CHARS', value: `${selectedCharTarget}` };
    }
    const match = DURATIONS.find((d) => d.value === state.duration);
    return { prefix: 'TIME', value: match ? match.label : `${state.duration}s` };
  }, [testMode, effectiveTestType, selectedWordTarget, selectedCharTarget, selectedExamProfile.duration, state.duration]);

  const testTypeLabel = useMemo(() => {
    if (testMode === 'exam') return `Exam (${selectedExamProfile.shortName})`;
    if (effectiveTestType === 'words') return 'Words';
    if (effectiveTestType === 'characters') return 'Characters';
    return 'Time';
  }, [testMode, effectiveTestType, selectedExamProfile.shortName]);

  const difficultyLabel = useMemo(() => {
    const match = DIFFICULTIES.find((d) => d.value === selectedDifficulty);
    return match ? match.label : 'Standard';
  }, [selectedDifficulty]);


  const targetProgress = useMemo(() => {
    if (effectiveTestType === 'words') {
      const total = state.targetCount || selectedWordTarget;
      return {
        current: Math.min(getCompletedWordCount(state), total),
        total,
      };
    }
    if (effectiveTestType === 'characters') {
      const total = state.targetCount || selectedCharTarget;
      return {
        current: Math.min(state.currentIndex, total),
        total,
      };
    }
    return null;
  }, [effectiveTestType, state, selectedWordTarget, selectedCharTarget]);

  // If in practice session view
  if (viewMode === 'practice' && practicePlan) {
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
      {/* Contextual Control Toolbar - Hidden when test is completed */}
      {!isCompleted && (
        <TestToolbar
          toolbarRef={toolbarRef}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          isRunning={state.status === 'running'}
          testMode={testMode}
          testType={effectiveTestType}
          testTypeLabel={testTypeLabel}
          targetLabel={targetLabel}
          selectedLanguage={selectedLanguage}
          difficultyLabel={difficultyLabel}
          examProfiles={examProfiles}
          selectedExamProfile={selectedExamProfile}
          selectedWordTarget={selectedWordTarget}
          selectedCharTarget={selectedCharTarget}
          selectedDifficulty={selectedDifficulty}
          duration={state.duration}
          showKeyboard={showKeyboard}
          onToggleKeyboard={handleToggleKeyboard}
          onSelectTestType={handleSelectTestType}
          onSelectExamProfile={handleSelectExamProfile}
          onSelectDuration={handleSelectDuration}
          onSelectWordTarget={handleSelectWordTarget}
          onSelectCharTarget={handleSelectCharTarget}
          onSelectLanguage={handleSelectLanguage}
          onSelectDifficulty={handleSelectDifficulty}
          onRetest={handleRetest}
          onSelectStandardMode={handleSelectStandardMode}
          onCompleteTest={completeTest}
        />
      )}

      {/* Exam Mode Active Details (when in exam mode and test is active) */}
      {!isCompleted && testMode === 'exam' && (
        <ExamActiveBar profile={selectedExamProfile} />
      )}

      {/* Main Interactive Stage: Active Passage or Completed Results */}
      {isCompleted ? (
        <>
          <ResultCard
            state={state}
            onRestart={handleRetest}
            onChangeTest={handleRetest}
            onPracticeMistakes={() => setViewMode('practice')}
            testMode={testMode}
            examProfile={testMode === 'exam' ? selectedExamProfile : undefined}
          />
          {testMode === 'exam' && examNotice && (
            <div className="exam-supporting-info" style={{ marginTop: 'var(--space-6)' }}>
              {examNotice}
            </div>
          )}
        </>
      ) : (
        <div className="test-workspace-stage">
          {/* Live Metrics: GWPM | Net WPM | Accuracy | Time | Errors */}
          <MetricsBar
            metrics={metrics}
            testType={effectiveTestType}
            initialDuration={state.duration}
            targetProgress={targetProgress}
          />

          {/* Minimalist Live Typing Progress Bar */}
          <TypingProgressBar
            testType={effectiveTestType}
            status={state.status}
            duration={state.duration}
            elapsedSeconds={metrics.elapsedSeconds}
            targetProgress={targetProgress}
          />

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
          </div>

          {/* Optional Compact Virtual Keyboard (below passage, ~60% width on desktop) */}
          {showKeyboard && (
            <div className="test-keyboard-wrapper">
              <VirtualKeyboard
                typingState={state}
                language={state.passage.language}
                recentKey={recentKey}
                mistakes={analytics?.mostMistypedCharacters}
                visible={showKeyboard}
                onToggleVisible={handleToggleKeyboard}
              />
            </div>
          )}

          {/* Supporting Exam Information below typing interface & keyboard */}
          {testMode === 'exam' && (
            <div className="exam-supporting-info" style={{ marginTop: 'var(--space-6)' }}>
              {examNotice}
              {state.status === 'idle' && (
                <div style={{ marginTop: examNotice ? 'var(--space-4)' : 0 }}>
                  <ExamInstructionsCard profile={selectedExamProfile} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default TypingTest;
