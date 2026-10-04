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
import SettingsModal from '@/components/settings/SettingsModal';
import {
  DEFAULT_TYPING_SETTINGS,
  loadTypingSettings,
  saveTypingSettings,
  TypingSettings,
} from '@/engine/settingsTypes';

export interface TypingTestProps {
  initialTestMode?: 'standard' | 'exam';
  examNotice?: React.ReactNode;
}

const DURATIONS: { label: string; value: TestDuration }[] = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
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
  activeDropdown: 'target' | 'type' | 'language' | 'difficulty' | null;
  setActiveDropdown: React.Dispatch<React.SetStateAction<'target' | 'type' | 'language' | 'difficulty' | null>>;
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
  onOpenSettings: () => void;
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

const DropdownChevron = React.memo(function DropdownChevron({ isOpen = false }: { isOpen?: boolean }) {
  return (
    <svg
      className={`pill-chevron pill-arrow ${isOpen ? 'open' : ''}`}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/**
 * Isolated Compact Toolbar Component — memoized so all 6 buttons and popups skip rendering during active typing
 */
const TestToolbar = React.memo(function TestToolbar({
  toolbarRef,
  activeDropdown,
  setActiveDropdown,
  isRunning: _isRunning,
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
  showKeyboard: _showKeyboard,
  onOpenSettings,
  onToggleKeyboard: _onToggleKeyboard,
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
      {/* 1. Test Type Control (Time | Words | Paragraph | Characters) — FIRST */}
      <div className="toolbar-group" data-testid="test-type-selector">
        <span className="control-label">Test Type</span>
        <div className="toolbar-pill-wrapper">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'type' ? 'active' : ''} ${testMode === 'exam' ? 'exam-active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'type' ? null : 'type'))}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'type'}
            title="Select test type"
          >
            <span className="control-select-pill">
              <span className="control-value">{testTypeLabel}</span>
              <DropdownChevron isOpen={activeDropdown === 'type'} />
            </span>
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
                  <div className="item-subtitle">Timed speed challenge (15s, 30s, 60s, 3m, 5m, 10m)</div>
                </div>
                <span className={`item-radio ${testMode === 'standard' && testType === 'time' ? 'selected' : ''}`} aria-hidden="true" />
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
                <span className={`item-radio ${testMode === 'standard' && testType === 'words' ? 'selected' : ''}`} aria-hidden="true" />
              </button>

              <button
                type="button"
                role="menuitem"
                data-testid="type-paragraph-btn"
                className={`toolbar-dropdown-item ${testMode === 'standard' && testType === 'paragraph' ? 'selected' : ''}`}
                onClick={() => onSelectTestType('paragraph')}
              >
                <div>
                  <div className="item-title">Paragraph Test</div>
                  <div className="item-subtitle">Continuous everyday readable paragraph</div>
                </div>
                <span className={`item-radio ${testMode === 'standard' && testType === 'paragraph' ? 'selected' : ''}`} aria-hidden="true" />
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
                <span className={`item-radio ${testMode === 'standard' && testType === 'characters' ? 'selected' : ''}`} aria-hidden="true" />
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
                    <span className={`item-radio ${isSelected ? 'selected' : ''}`} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Time / Target Count Control — SECOND */}
      <div className="toolbar-group" data-testid="duration-selector">
        <span className="control-label">{targetLabel.prefix}</span>
        <div className="toolbar-pill-wrapper">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'target' ? 'active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'target' ? null : 'target'))}
            disabled={testMode === 'exam'}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'target'}
            title={testMode === 'exam' ? `Exam duration: ${formatDuration(selectedExamProfile.duration)}` : `Select target ${targetLabel.prefix.toLowerCase()}`}
          >
            <span className="control-select-pill">
              <span className="control-value">{targetLabel.value}</span>
              {testMode !== 'exam' && <DropdownChevron isOpen={activeDropdown === 'target'} />}
            </span>
          </button>

          {activeDropdown === 'target' && testMode !== 'exam' && (
            <div className="toolbar-dropdown" role="menu">
              {(testType === 'time' || testType === 'paragraph') &&
                DURATIONS.map((d) => {
                  const isSelected = duration === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      role="menuitem"
                      className={`toolbar-dropdown-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelectDuration(d.value)}
                    >
                      <span>{d.label}</span>
                      <span className={`item-radio ${isSelected ? 'selected' : ''}`} aria-hidden="true" />
                    </button>
                  );
                })}

              {testType === 'words' &&
                WORD_TARGETS.map((count) => {
                  const isSelected = selectedWordTarget === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      role="menuitem"
                      className={`toolbar-dropdown-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelectWordTarget(count)}
                    >
                      <span>{count} words</span>
                      <span className={`item-radio ${isSelected ? 'selected' : ''}`} aria-hidden="true" />
                    </button>
                  );
                })}

              {testType === 'characters' &&
                CHAR_TARGETS.map((count) => {
                  const isSelected = selectedCharTarget === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      role="menuitem"
                      className={`toolbar-dropdown-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelectCharTarget(count)}
                    >
                      <span>{count} chars</span>
                      <span className={`item-radio ${isSelected ? 'selected' : ''}`} aria-hidden="true" />
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Language Control */}
      <div className="toolbar-group" data-testid="language-selector">
        <span className="control-label">Language</span>
        <div className="toolbar-pill-wrapper">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'language' ? 'active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'language' ? null : 'language'))}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'language'}
            title="Select language"
          >
            <span className="control-select-pill">
              <span className="control-value">{selectedLanguage === 'hi' ? 'हिंदी' : 'English'}</span>
              <DropdownChevron isOpen={activeDropdown === 'language'} />
            </span>
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
                <span className={`item-radio ${selectedLanguage === 'en' ? 'selected' : ''}`} aria-hidden="true" />
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="lang-hi-btn"
                className={`toolbar-dropdown-item ${selectedLanguage === 'hi' ? 'selected' : ''}`}
                onClick={() => onSelectLanguage('hi')}
              >
                <span>हिंदी</span>
                <span className={`item-radio ${selectedLanguage === 'hi' ? 'selected' : ''}`} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Difficulty Control */}
      <div className="toolbar-group" data-testid="difficulty-selector">
        <span className="control-label">Difficulty</span>
        <div className="toolbar-pill-wrapper">
          <button
            type="button"
            className={`toolbar-pill ${activeDropdown === 'difficulty' ? 'active' : ''}`}
            onClick={() => setActiveDropdown((prev) => (prev === 'difficulty' ? null : 'difficulty'))}
            aria-haspopup="true"
            aria-expanded={activeDropdown === 'difficulty'}
            title="Select difficulty"
          >
            <span className="control-select-pill">
              <span className="control-value">{difficultyLabel}</span>
              <DropdownChevron isOpen={activeDropdown === 'difficulty'} />
            </span>
          </button>

          {activeDropdown === 'difficulty' && (
            <div className="toolbar-dropdown" role="menu">
              {DIFFICULTIES.map((d) => {
                const isSelected = selectedDifficulty === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    role="menuitem"
                    className={`toolbar-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectDifficulty(d.value)}
                  >
                    <span>{d.label}</span>
                    <span className={`item-radio ${isSelected ? 'selected' : ''}`} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Settings Control — opens large modal */}
      <div className="toolbar-group toolbar-group-action" data-testid="settings-selector">
        <span className="control-label-spacer" aria-hidden="true" />
        <div className="toolbar-pill-wrapper">
          <button
            type="button"
            className="toolbar-pill toolbar-pill-settings"
            data-testid="settings-btn"
            onClick={onOpenSettings}
            title="Open Settings"
            aria-haspopup="dialog"
          >
            <span className="control-select-pill">
              <span className="control-value">⚙ Settings</span>
            </span>
          </button>
        </div>
      </div>

      {/* 6. Retest Button */}
      <div className="toolbar-group toolbar-group-action">
        <span className="control-label-spacer" aria-hidden="true" />
        <div className="toolbar-pill-wrapper">
          <button
            type="button"
            onClick={onRetest}
            data-testid="retest-btn"
            className="toolbar-pill toolbar-pill-reset"
            title="Retest (Esc)"
          >
            <span className="control-select-pill">
              <span className="control-value">↺ Retest</span>
            </span>
          </button>
        </div>
      </div>

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
  const [activeDropdown, setActiveDropdown] = useState<'target' | 'type' | 'language' | 'difficulty' | null>(null);
  const [settings, setSettings] = useState<TypingSettings>(DEFAULT_TYPING_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showKeyboard, setShowKeyboard] = useState<boolean>(DEFAULT_TYPING_SETTINGS.keyboardVisible);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const examProfiles = useMemo(() => getAllExamProfiles(), []);

  const handleToggleKeyboard = useCallback(() => {
    setShowKeyboard((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('typing_platform_keyboard_visible', String(next));
      } catch {}
      setSettings((current) => {
        const updated = { ...current, keyboardVisible: next };
        saveTypingSettings(updated);
        return updated;
      });
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
      textSource: 'common',
      includeCapitalLetters: false,
      includeSpecialCharacters: false,
      wordListSize: 'medium',
    });
  }, [initialTestMode, defaultExam]);

  const initialDurationForMode = initialTestMode === 'exam' ? defaultExam.duration : 60;

  const engineOptions = useMemo(
    () => ({
      stopOnError: settings.stopOnError,
      forgiveErrors: settings.forgiveErrors,
      spaceSkipsWord: settings.spaceSkipsWord,
      allowBackspace: settings.allowBackspace,
    }),
    [settings.stopOnError, settings.forgiveErrors, settings.spaceSkipsWord, settings.allowBackspace]
  );

  const soundOptions = useMemo(
    () => ({
      mode: settings.soundMode,
      volume: settings.soundVolume,
      theme: settings.soundTheme,
    }),
    [settings.soundMode, settings.soundVolume, settings.soundTheme]
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
    engineOptions,
    soundOptions,
  });

  // Hydrate user settings from localStorage safely after client mount (zero SSR mismatch)
  useEffect(() => {
    const loaded = loadTypingSettings();
    setSettings(loaded);
    setShowKeyboard(loaded.keyboardVisible);

    if (
      initialTestMode !== 'exam' &&
      (loaded.language !== 'en' ||
        loaded.textSource !== 'common' ||
        loaded.includeCapitalLetters !== false ||
        loaded.includeSpecialCharacters !== false ||
        loaded.wordListSize !== 'medium')
    ) {
      if (loaded.language && loaded.language !== 'en') {
        setSelectedLanguage(loaded.language);
      }
      const customPassage = generateTestPassage({
        language: loaded.language || 'en',
        difficulty: selectedDifficulty,
        testType: 'time',
        targetCount: 60,
        textSource: loaded.textSource,
        includeCapitalLetters: loaded.includeCapitalLetters,
        includeSpecialCharacters: loaded.includeSpecialCharacters,
        wordListSize: loaded.wordListSize,
      });
      setPassage(customPassage);
    }
  }, [initialTestMode, selectedDifficulty, setPassage]);

  const createPassage = useCallback(
    (opts: {
      language?: TypingLanguage;
      difficulty?: TestDifficulty;
      testType?: TestType;
      targetCount?: number;
    }) => {
      return generateTestPassage({
        language: opts.language ?? selectedLanguage,
        difficulty: opts.difficulty ?? selectedDifficulty,
        testType: opts.testType ?? testType,
        targetCount:
          opts.targetCount ??
          (testType === 'words'
            ? selectedWordTarget
            : testType === 'characters'
            ? selectedCharTarget
            : state.duration),
        textSource: settings.textSource,
        includeCapitalLetters: settings.includeCapitalLetters,
        includeSpecialCharacters: settings.includeSpecialCharacters,
        wordListSize: settings.wordListSize,
      });
    },
    [selectedLanguage, selectedDifficulty, testType, selectedWordTarget, selectedCharTarget, state.duration, settings]
  );

  const handleUpdateSettings = useCallback(
    (newSettings: Partial<TypingSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        saveTypingSettings(updated);

        if (newSettings.keyboardVisible !== undefined) {
          setShowKeyboard(newSettings.keyboardVisible);
        }

        if (
          newSettings.language !== undefined &&
          newSettings.language !== selectedLanguage &&
          state.status !== 'running' &&
          testMode !== 'exam'
        ) {
          setSelectedLanguage(newSettings.language);
        }

        // If test is idle (not running/completed) and not exam mode, regenerate passage with new settings immediately
        if (state.status === 'idle' && testMode !== 'exam') {
          const target =
            testType === 'words'
              ? selectedWordTarget
              : testType === 'characters'
              ? selectedCharTarget
              : state.duration;

          const newPassage = generateTestPassage({
            language: newSettings.language || updated.language || selectedLanguage,
            difficulty: selectedDifficulty,
            testType,
            targetCount: target,
            textSource: updated.textSource,
            includeCapitalLetters: updated.includeCapitalLetters,
            includeSpecialCharacters: updated.includeSpecialCharacters,
            wordListSize: updated.wordListSize,
          });

          setPassage(newPassage, testType, target);
        }

        return updated;
      });
    },
    [selectedLanguage, state.status, state.duration, testMode, testType, selectedWordTarget, selectedCharTarget, selectedDifficulty, setPassage]
  );

  const handleRetest = useCallback(() => {
    if (testMode === 'standard') {
      const target =
        testType === 'words'
          ? selectedWordTarget
          : testType === 'characters'
          ? selectedCharTarget
          : state.duration;
      const newPassage = createPassage({
        language: selectedLanguage,
        difficulty: selectedDifficulty,
        testType,
        targetCount: target,
      });
      setPassage(newPassage, testType, target);
    }
    restart();
  }, [testMode, testType, selectedWordTarget, selectedCharTarget, state.duration, createPassage, selectedLanguage, selectedDifficulty, setPassage, restart]);

  const handleSelectLanguage = useCallback((lang: TypingLanguage) => {
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
    const newPassage = createPassage({
      language: lang,
      difficulty: selectedDifficulty,
      testType,
      targetCount: target,
    });
    setPassage(newPassage, testType, target);
    setActiveDropdown(null);
    restart();
  }, [testMode, testType, selectedWordTarget, selectedCharTarget, state.duration, selectedDifficulty, createPassage, setPassage, restart]);

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
    const newPassage = createPassage({
      language: selectedLanguage,
      difficulty: diff,
      testType,
      targetCount: target,
    });
    setPassage(newPassage, testType, target);
    setActiveDropdown(null);
    restart();
  }, [testMode, testType, selectedWordTarget, selectedCharTarget, state.duration, selectedLanguage, createPassage, setPassage, restart]);

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
    const newPassage = createPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: type,
      targetCount: target,
    });
    setPassage(newPassage, type, target);
    setActiveDropdown(null);
    restart();
  }, [testMode, setTestType, selectedWordTarget, selectedCharTarget, state.duration, selectedLanguage, selectedDifficulty, createPassage, setPassage, restart]);

  const handleSelectStandardMode = useCallback(() => {
    setTestMode('standard');
    setTestTypeState('time');
    setTestType('time');
    setDuration(60);
    const newPassage = createPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'time',
      targetCount: 60,
    });
    setPassage(newPassage, 'time', 60);
    setActiveDropdown(null);
    restart();
  }, [setTestType, setDuration, selectedLanguage, selectedDifficulty, createPassage, setPassage, restart]);

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
    const newPassage = createPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'time',
      targetCount: dur,
    });
    setPassage(newPassage, 'time', dur);
    setActiveDropdown(null);
    restart();
  }, [setTestType, setDuration, selectedLanguage, selectedDifficulty, createPassage, setPassage, restart]);

  const handleSelectWordTarget = useCallback((words: number) => {
    setSelectedWordTarget(words);
    setTestTypeState('words');
    setTestType('words', words);
    const newPassage = createPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'words',
      targetCount: words,
    });
    setPassage(newPassage, 'words', words);
    setActiveDropdown(null);
    restart();
  }, [selectedLanguage, selectedDifficulty, setTestType, createPassage, setPassage, restart]);

  const handleSelectCharTarget = useCallback((chars: number) => {
    setSelectedCharTarget(chars);
    setTestTypeState('characters');
    setTestType('characters', chars);
    const newPassage = createPassage({
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      testType: 'characters',
      targetCount: chars,
    });
    setPassage(newPassage, 'characters', chars);
    setActiveDropdown(null);
    restart();
  }, [selectedLanguage, selectedDifficulty, setTestType, createPassage, setPassage, restart]);

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
      return { prefix: 'Time', value: formatDuration(selectedExamProfile.duration) };
    }
    if (effectiveTestType === 'words') {
      return { prefix: 'Words', value: `${selectedWordTarget}` };
    }
    if (effectiveTestType === 'characters') {
      return { prefix: 'Chars', value: `${selectedCharTarget}` };
    }
    const match = DURATIONS.find((d) => d.value === state.duration);
    return { prefix: 'Time', value: match ? match.label : `${state.duration}s` };
  }, [testMode, effectiveTestType, selectedWordTarget, selectedCharTarget, selectedExamProfile.duration, state.duration]);

  const testTypeLabel = useMemo(() => {
    if (testMode === 'exam') return `Exam (${selectedExamProfile.shortName})`;
    if (effectiveTestType === 'paragraph') return 'Paragraph';
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
          onOpenSettings={() => setIsSettingsOpen(true)}
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
            fontFamily={settings.fontFamily}
            whitespaceStyle={settings.whitespaceStyle}
            cursorShape={settings.cursorShape}
            cursorMovement={settings.cursorMovement}
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

      {/* Large SaaS Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </section>
  );
};

export default TypingTest;
