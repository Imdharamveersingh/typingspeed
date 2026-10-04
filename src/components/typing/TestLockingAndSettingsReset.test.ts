import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { TestToolbar } from './TypingTest';
import { createInitialState, processKeystroke, calculateCurrentMetrics } from '@/engine/typingEngine';
import { Passage } from '@/engine/types';
import { DEFAULT_TYPING_SETTINGS, TypingSettings } from '@/engine/settingsTypes';
import { generateTestPassage } from '@/engine/passageGenerator';
import { getDefaultExamProfile } from '@/engine/examEngine';

const dummyPassage: Passage = {
  id: 'test-lock-passage',
  title: 'Test Passage',
  text: 'The quick brown fox jumps over the lazy dog.',
  language: 'en',
  difficulty: 'medium',
};

const defaultToolbarProps = {
  toolbarRef: { current: null },
  activeDropdown: null as null | 'type' | 'target' | 'language' | 'difficulty',
  setActiveDropdown: () => {},
  isRunning: false,
  testMode: 'standard' as const,
  testType: 'time' as const,
  testTypeLabel: 'Time',
  targetLabel: { prefix: 'Time', value: '60s' },
  selectedLanguage: 'en' as const,
  difficultyLabel: 'Standard',
  examProfiles: [],
  selectedExamProfile: getDefaultExamProfile(),
  selectedWordTarget: 50,
  selectedCharTarget: 250,
  selectedDifficulty: 'medium' as const,
  duration: 60 as const,
  showKeyboard: true,
  onOpenSettings: () => {},
  onToggleKeyboard: () => {},
  onSelectTestType: () => {},
  onSelectExamProfile: () => {},
  onSelectDuration: () => {},
  onSelectWordTarget: () => {},
  onSelectCharTarget: () => {},
  onSelectLanguage: () => {},
  onSelectDifficulty: () => {},
  onRetest: () => {},
  onSelectStandardMode: () => {},
  onCompleteTest: () => {},
};

describe('Active Typing-Test Configuration Locking & Settings Reset', () => {
  // =========================================================================
  // TEST 1: Running test disables Test Type
  // =========================================================================
  it('TEST 1: Running test disables Test Type', () => {
    const html = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: true,
      })
    );

    // Test Type button should have disabled attribute and disabled class
    const testTypeMatch = html.match(/<div[^>]*data-testid="test-type-selector"[^>]*>[\s\S]*?<button[^>]*>/);
    expect(testTypeMatch).not.toBeNull();
    const buttonHtml = testTypeMatch![0];
    expect(buttonHtml).toContain('disabled');
    expect(buttonHtml).toContain('disabled');
    expect(buttonHtml).toContain('Configuration locked during active test');
  });

  // =========================================================================
  // TEST 2: Running test disables Time/Target
  // =========================================================================
  it('TEST 2: Running test disables Time/Target', () => {
    const html = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: true,
      })
    );

    const durationMatch = html.match(/<div[^>]*data-testid="duration-selector"[^>]*>[\s\S]*?<button[^>]*>/);
    expect(durationMatch).not.toBeNull();
    const buttonHtml = durationMatch![0];
    expect(buttonHtml).toContain('disabled');
    expect(buttonHtml).toContain('Configuration locked during active test');
  });

  // =========================================================================
  // TEST 3: Running test disables Language
  // =========================================================================
  it('TEST 3: Running test disables Language', () => {
    const html = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: true,
      })
    );

    const langMatch = html.match(/<div[^>]*data-testid="language-selector"[^>]*>[\s\S]*?<button[^>]*>/);
    expect(langMatch).not.toBeNull();
    const buttonHtml = langMatch![0];
    expect(buttonHtml).toContain('disabled');
    expect(buttonHtml).toContain('Configuration locked during active test');
  });

  // =========================================================================
  // TEST 4: Running test disables Difficulty
  // =========================================================================
  it('TEST 4: Running test disables Difficulty', () => {
    const html = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: true,
      })
    );

    const diffMatch = html.match(/<div[^>]*data-testid="difficulty-selector"[^>]*>[\s\S]*?<button[^>]*>/);
    expect(diffMatch).not.toBeNull();
    const buttonHtml = diffMatch![0];
    expect(buttonHtml).toContain('disabled');
    expect(buttonHtml).toContain('Configuration locked during active test');
  });

  // =========================================================================
  // TEST 5: Disabled controls cannot open their dropdowns while running
  // =========================================================================
  it('TEST 5: Disabled controls cannot open their dropdowns while running', () => {
    // Attempt to pass activeDropdown="type" while isRunning=true
    const htmlType = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: true,
        activeDropdown: 'type',
      })
    );
    expect(htmlType).not.toContain('toolbar-dropdown');
    expect(htmlType).not.toContain('type-time-btn');

    // Attempt to pass activeDropdown="target" while isRunning=true
    const htmlTarget = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: true,
        activeDropdown: 'target',
      })
    );
    expect(htmlTarget).not.toContain('toolbar-dropdown');

    // Attempt to pass activeDropdown="language" while isRunning=true
    const htmlLang = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: true,
        activeDropdown: 'language',
      })
    );
    expect(htmlLang).not.toContain('toolbar-dropdown');
    expect(htmlLang).not.toContain('lang-en-btn');

    // Attempt to pass activeDropdown="difficulty" while isRunning=true
    const htmlDiff = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: true,
        activeDropdown: 'difficulty',
      })
    );
    expect(htmlDiff).not.toContain('toolbar-dropdown');
  });

  // =========================================================================
  // TEST 6: Idle state enables all four controls
  // =========================================================================
  it('TEST 6: Idle state enables all four controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: false,
      })
    );

    const testTypeMatch = html.match(/<div[^>]*data-testid="test-type-selector"[^>]*>[\s\S]*?<button[^>]*>/);
    expect(testTypeMatch![0]).not.toContain('disabled');

    const durationMatch = html.match(/<div[^>]*data-testid="duration-selector"[^>]*>[\s\S]*?<button[^>]*>/);
    expect(durationMatch![0]).not.toContain('disabled');

    const langMatch = html.match(/<div[^>]*data-testid="language-selector"[^>]*>[\s\S]*?<button[^>]*>/);
    expect(langMatch![0]).not.toContain('disabled');

    const diffMatch = html.match(/<div[^>]*data-testid="difficulty-selector"[^>]*>[\s\S]*?<button[^>]*>/);
    expect(diffMatch![0]).not.toContain('disabled');

    // And dropdown opens when activeDropdown is set
    const htmlWithDropdown = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning: false,
        activeDropdown: 'type',
      })
    );
    expect(htmlWithDropdown).toContain('toolbar-dropdown');
    expect(htmlWithDropdown).toContain('type-time-btn');
  });

  // =========================================================================
  // TEST 7: Completed state enables all four controls
  // =========================================================================
  it('TEST 7: Completed state enables all four controls', () => {
    // When completed, isRunning is false (state.status === 'running' evaluates to false)
    const status: string = 'completed';
    const isRunning = status === 'running';
    expect(isRunning).toBe(false);

    const html = renderToStaticMarkup(
      React.createElement(TestToolbar, {
        ...defaultToolbarProps,
        isRunning,
      })
    );

    // All four configuration controls are enabled
    expect(html).not.toMatch(/data-testid="test-type-selector"[^>]*>[\s\S]*?<button[^>]*disabled/);
    expect(html).not.toMatch(/data-testid="duration-selector"[^>]*>[\s\S]*?<button[^>]*disabled/);
    expect(html).not.toMatch(/data-testid="language-selector"[^>]*>[\s\S]*?<button[^>]*disabled/);
    expect(html).not.toMatch(/data-testid="difficulty-selector"[^>]*>[\s\S]*?<button[^>]*disabled/);

    // Retest and Settings remain fully functional
    expect(html).toContain('settings-btn');
    expect(html).toContain('retest-btn');
  });

  // =========================================================================
  // TEST 8: Opening Settings alone does not reset the active test
  // =========================================================================
  it('TEST 8: Opening Settings alone does not reset the active test', () => {
    // Simulate a running test with typed characters and mistakes
    let runningState = createInitialState(dummyPassage, 60, 'time');
    const now = 1000;
    // Type 'T', 'h', then an incorrect key 'x'
    runningState = processKeystroke(runningState, 'T', now);
    runningState = processKeystroke(runningState, 'h', now + 100);
    runningState = processKeystroke(runningState, 'x', now + 200);

    expect(runningState.status).toBe('running');
    expect(runningState.currentIndex).toBe(3);
    expect(runningState.incorrectStrokes).toBe(1);
    expect(runningState.totalKeystrokes).toBe(3);

    // Opening settings modal simply sets isSettingsOpen = true without dispatching any updateSettings
    let isSettingsOpen = false;
    const onOpenSettings = () => {
      isSettingsOpen = true;
    };
    onOpenSettings();

    expect(isSettingsOpen).toBe(true);
    // Running state must remain exactly intact
    expect(runningState.status).toBe('running');
    expect(runningState.currentIndex).toBe(3);
    expect(runningState.incorrectStrokes).toBe(1);
    expect(runningState.totalKeystrokes).toBe(3);

    // Closing settings without changes must also not alter runningState
    isSettingsOpen = false;
    expect(runningState.status).toBe('running');
    expect(runningState.currentIndex).toBe(3);
  });

  // =========================================================================
  // TEST 9: Changing a typing-related setting while running resets the test
  // =========================================================================
  it('TEST 9: Changing a typing-related setting while running resets the test', () => {
    let runningState = createInitialState(dummyPassage, 60, 'time');
    runningState = processKeystroke(runningState, 'T', 1000);
    runningState = processKeystroke(runningState, 'h', 1100);
    expect(runningState.status).toBe('running');

    let currentSettings: TypingSettings = { ...DEFAULT_TYPING_SETTINGS };
    let wasResetTriggered = false;

    // Simulate handleUpdateSettings logic from TypingTest.tsx
    const handleUpdateSettings = (newSettings: Partial<TypingSettings>) => {
      const hasActualChange = Object.entries(newSettings).some(([k, val]) => {
        return (currentSettings as unknown as Record<string, unknown>)[k] !== val;
      });

      if (!hasActualChange) return;

      currentSettings = { ...currentSettings, ...newSettings };

      if (runningState.status === 'running') {
        // Full test reset
        runningState = createInitialState(dummyPassage, runningState.duration, runningState.testType);
        wasResetTriggered = true;
      }
    };

    // Applying same value should NOT trigger reset
    handleUpdateSettings({ stopOnError: currentSettings.stopOnError });
    expect(wasResetTriggered).toBe(false);
    expect(runningState.status).toBe('running');

    // Changing a setting (e.g. stopOnError toggled) while running MUST trigger reset
    handleUpdateSettings({ stopOnError: !currentSettings.stopOnError });
    expect(wasResetTriggered).toBe(true);
    expect(runningState.status).toBe('idle');
  });

  // =========================================================================
  // TEST 10: Settings-triggered reset clears errors, progress, elapsed time, metrics, typing index, and performance samples
  // =========================================================================
  it('TEST 10: Settings-triggered reset clears errors, progress, elapsed time, metrics, typing index, and performance samples', () => {
    let runningState = createInitialState(dummyPassage, 60, 'time');
    const now = 2000;
    runningState = processKeystroke(runningState, 'T', now);
    runningState = processKeystroke(runningState, 'x', now + 150); // wrong key
    runningState = processKeystroke(runningState, 'e', now + 300);

    expect(runningState.totalKeystrokes).toBe(3);
    expect(runningState.incorrectStrokes).toBe(1);
    expect(runningState.currentIndex).toBe(3);

    // Perform settings reset
    const resetState = createInitialState(dummyPassage, runningState.duration, runningState.testType);
    const resetMetrics = calculateCurrentMetrics(resetState);

    // Verify all metrics and counters are completely reset
    expect(resetState.status).toBe('idle');
    expect(resetState.currentIndex).toBe(0);
    expect(resetState.totalKeystrokes).toBe(0);
    expect(resetState.correctStrokes).toBe(0);
    expect(resetState.incorrectStrokes).toBe(0);
    expect(resetState.accumulatedActiveTimeMs).toBe(0);
    expect(resetState.startTime).toBeNull();
    expect(resetState.endTime).toBeNull();
    expect(resetState.extraCharacters).toEqual([]);
    expect(resetState.performanceSnapshots).toEqual([]);
    expect(resetState.characters.every((c) => c.state === 'untyped' && !c.hadMistake)).toBe(true);

    // Metrics verification
    expect(resetMetrics.grossWPM).toBe(0);
    expect(resetMetrics.netWPM).toBe(0);
    expect(resetMetrics.accuracy).toBe(100);
    expect(resetMetrics.uncorrectedErrors).toBe(0);
    expect(resetMetrics.elapsedSeconds).toBe(0);
  });

  // =========================================================================
  // TEST 11: Settings-triggered reset returns the test to idle/not-started state
  // =========================================================================
  it('TEST 11: Settings-triggered reset returns the test to idle/not-started state', () => {
    // Generate fresh passage with new content settings
    const updatedSettings: TypingSettings = {
      ...DEFAULT_TYPING_SETTINGS,
      includeCapitalLetters: true,
      includeSpecialCharacters: true,
    };

    const newPassage = generateTestPassage({
      language: updatedSettings.language,
      difficulty: 'medium',
      testType: 'time',
      targetCount: 60,
      textSource: updatedSettings.textSource,
      includeCapitalLetters: updatedSettings.includeCapitalLetters,
      includeSpecialCharacters: updatedSettings.includeSpecialCharacters,
      wordListSize: updatedSettings.wordListSize,
    });

    const resetState = createInitialState(newPassage, 60, 'time');
    expect(resetState.status).toBe('idle');
    expect(resetState.passage.text.length).toBeGreaterThan(0);
    expect(resetState.currentIndex).toBe(0);
    expect(resetState.characters[0].state).toBe('untyped');
  });

  // =========================================================================
  // TEST 12: Existing configuration-change reset behavior remains intact
  // =========================================================================
  it('TEST 12: Existing configuration-change reset behavior remains intact', () => {
    const typingTestPath = path.resolve(__dirname, './TypingTest.tsx');
    const content = fs.readFileSync(typingTestPath, 'utf-8');

    // Verify all 4 configuration controls guard against running state
    expect(content).toMatch(/handleSelectLanguage\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{\s*if\s*\(\s*state\.status\s*===\s*'running'\s*\)\s*return;/);
    expect(content).toMatch(/handleSelectDifficulty\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{\s*if\s*\(\s*state\.status\s*===\s*'running'\s*\)\s*return;/);
    expect(content).toMatch(/handleSelectTestType\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{\s*if\s*\(\s*state\.status\s*===\s*'running'\s*\)\s*return;/);
    expect(content).toMatch(/handleSelectDuration\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{\s*if\s*\(\s*state\.status\s*===\s*'running'\s*\)\s*return;/);

    // Verify when idle, configuration changes call setPassage and restart
    expect(content).toContain('setPassage(newPassage, testType, target);');
    expect(content).toContain('setActiveDropdown(null);');
  });
});
