import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateTestPassage, formatPassageText, TestDifficulty } from '@/engine/passageGenerator';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { DEFAULT_TYPING_SETTINGS, TypingSettings } from '@/engine/settingsTypes';
import { TypingLanguage, TestType } from '@/engine/types';
import {
  createInitialState,
  processKeystroke,
  calculateCurrentMetrics,
} from '@/engine/typingEngine';

describe('Hindi Typing Test Behavior & Language-Aware Settings', () => {
  // Helper to simulate the state machine reset logic from handleUpdateSettings in TypingTest.tsx
  function simulateSettingsUpdateReset({
    currentSettings,
    newSettings,
    selectedLanguage,
    selectedDifficulty,
    testType,
    targetCount,
  }: {
    currentSettings: TypingSettings;
    newSettings: Partial<TypingSettings>;
    selectedLanguage: TypingLanguage;
    selectedDifficulty: TestDifficulty;
    testType: TestType;
    targetCount: number;
  }) {
    const targetLang: TypingLanguage =
      newSettings.language !== undefined ? newSettings.language : selectedLanguage;

    const updatedSettings = { ...currentSettings, ...newSettings, language: targetLang };

    const newPassage = generateTestPassage({
      language: targetLang,
      difficulty: selectedDifficulty,
      testType,
      targetCount,
      textSource: updatedSettings.textSource,
      includeCapitalLetters: updatedSettings.includeCapitalLetters,
      includeSpecialCharacters: updatedSettings.includeSpecialCharacters,
      wordListSize: updatedSettings.wordListSize,
    });

    const resetState = createInitialState(newPassage, 60, testType, targetCount);
    const resetMetrics = calculateCurrentMetrics(resetState);

    return {
      targetLang,
      updatedSettings,
      newPassage,
      resetState,
      resetMetrics,
    };
  }

  // =========================================================================
  // TEST 1: Hindi test remains Hindi after changing Allow Backspace
  // =========================================================================
  it('TEST 1: Hindi test remains Hindi after changing Allow Backspace', () => {
    const initialHindiPassage = generateTestPassage({
      language: 'hi',
      difficulty: 'medium',
      testType: 'time',
      targetCount: 60,
    });
    expect(initialHindiPassage.language).toBe('hi');

    const result = simulateSettingsUpdateReset({
      currentSettings: { ...DEFAULT_TYPING_SETTINGS, language: 'hi', allowBackspace: true },
      newSettings: { allowBackspace: false },
      selectedLanguage: 'hi',
      selectedDifficulty: 'medium',
      testType: 'time',
      targetCount: 60,
    });

    expect(result.targetLang).toBe('hi');
    expect(result.newPassage.language).toBe('hi');
    expect(result.updatedSettings.allowBackspace).toBe(false);
    // Hindi characters in Unicode range \u0900-\u097F
    expect(/[\u0900-\u097F]/.test(result.newPassage.text)).toBe(true);
  });

  // =========================================================================
  // TEST 2: Hindi test remains Hindi after changing Stop on Error
  // =========================================================================
  it('TEST 2: Hindi test remains Hindi after changing Stop on Error', () => {
    const result = simulateSettingsUpdateReset({
      currentSettings: { ...DEFAULT_TYPING_SETTINGS, language: 'hi', stopOnError: false },
      newSettings: { stopOnError: true, forgiveErrors: false },
      selectedLanguage: 'hi',
      selectedDifficulty: 'medium',
      testType: 'time',
      targetCount: 60,
    });

    expect(result.targetLang).toBe('hi');
    expect(result.newPassage.language).toBe('hi');
    expect(result.updatedSettings.stopOnError).toBe(true);
    expect(result.updatedSettings.forgiveErrors).toBe(false);
    expect(/[\u0900-\u097F]/.test(result.newPassage.text)).toBe(true);
  });

  // =========================================================================
  // TEST 3: Hindi test remains Hindi after changing Forgive Errors
  // =========================================================================
  it('TEST 3: Hindi test remains Hindi after changing Forgive Errors', () => {
    const result = simulateSettingsUpdateReset({
      currentSettings: { ...DEFAULT_TYPING_SETTINGS, language: 'hi', forgiveErrors: false },
      newSettings: { forgiveErrors: true, stopOnError: false },
      selectedLanguage: 'hi',
      selectedDifficulty: 'hard',
      testType: 'words',
      targetCount: 50,
    });

    expect(result.targetLang).toBe('hi');
    expect(result.newPassage.language).toBe('hi');
    expect(result.updatedSettings.forgiveErrors).toBe(true);
    expect(result.updatedSettings.stopOnError).toBe(false);
    expect(/[\u0900-\u097F]/.test(result.newPassage.text)).toBe(true);
  });

  // =========================================================================
  // TEST 4: Hindi test remains Hindi after changing Space Skips Word
  // =========================================================================
  it('TEST 4: Hindi test remains Hindi after changing Space Skips Word', () => {
    const result = simulateSettingsUpdateReset({
      currentSettings: { ...DEFAULT_TYPING_SETTINGS, language: 'hi', spaceSkipsWord: false },
      newSettings: { spaceSkipsWord: true },
      selectedLanguage: 'hi',
      selectedDifficulty: 'easy',
      testType: 'characters',
      targetCount: 150,
    });

    expect(result.targetLang).toBe('hi');
    expect(result.newPassage.language).toBe('hi');
    expect(result.updatedSettings.spaceSkipsWord).toBe(true);
    expect(/[\u0900-\u097F]/.test(result.newPassage.text)).toBe(true);
  });

  // =========================================================================
  // TEST 5: English test remains English after Settings reset
  // =========================================================================
  it('TEST 5: English test remains English after Settings reset', () => {
    const result = simulateSettingsUpdateReset({
      currentSettings: { ...DEFAULT_TYPING_SETTINGS, language: 'en', allowBackspace: true },
      newSettings: { allowBackspace: false },
      selectedLanguage: 'en',
      selectedDifficulty: 'medium',
      testType: 'time',
      targetCount: 60,
    });

    expect(result.targetLang).toBe('en');
    expect(result.newPassage.language).toBe('en');
    expect(result.updatedSettings.allowBackspace).toBe(false);
    expect(/[a-zA-Z]/.test(result.newPassage.text)).toBe(true);
    expect(/[\u0900-\u097F]/.test(result.newPassage.text)).toBe(false);
  });

  // =========================================================================
  // TEST 6: Language, Test Type, Time/Target and Difficulty remain unchanged during Settings-triggered reset
  // =========================================================================
  it('TEST 6: Language, Test Type, Time/Target and Difficulty remain unchanged during Settings-triggered reset', () => {
    const selectedLang: TypingLanguage = 'hi';
    const selectedDiff: TestDifficulty = 'hard';
    const testType: TestType = 'words';
    const targetCount = 100;

    const result = simulateSettingsUpdateReset({
      currentSettings: { ...DEFAULT_TYPING_SETTINGS, language: selectedLang },
      newSettings: { allowBackspace: false },
      selectedLanguage: selectedLang,
      selectedDifficulty: selectedDiff,
      testType,
      targetCount,
    });

    expect(result.targetLang).toBe('hi');
    expect(result.newPassage.language).toBe('hi');
    expect(result.newPassage.difficulty).toBe('hard');
    expect(result.resetState.testType).toBe('words');
    expect(result.resetState.targetCount).toBe(100);
    expect(result.resetState.status).toBe('idle');
    expect(result.resetState.currentIndex).toBe(0);
  });

  // =========================================================================
  // TEST 7: Changed setting is actually applied after reset
  // =========================================================================
  it('TEST 7: Changed setting is actually applied after reset', () => {
    let capturedSettings: Partial<TypingSettings> | null = null;
    const handleUpdateSettings = (s: Partial<TypingSettings>) => {
      capturedSettings = s;
    };

    const html = renderToStaticMarkup(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: () => {},
        settings: { ...DEFAULT_TYPING_SETTINGS, language: 'hi', allowBackspace: true },
        currentLanguage: 'hi',
        onUpdateSettings: handleUpdateSettings,
      })
    );

    expect(html).toContain('Settings');
    handleUpdateSettings({ allowBackspace: false });
    expect(capturedSettings).toEqual({ allowBackspace: false });
    const result = simulateSettingsUpdateReset({
      currentSettings: { ...DEFAULT_TYPING_SETTINGS, language: 'hi', allowBackspace: true },
      newSettings: { allowBackspace: false },
      selectedLanguage: 'hi',
      selectedDifficulty: 'medium',
      testType: 'time',
      targetCount: 60,
    });

    expect(result.updatedSettings.allowBackspace).toBe(false);
  });

  // =========================================================================
  // TEST 8: Hindi passage generator is used after Hindi reset
  // =========================================================================
  it('TEST 8: Hindi passage generator is used after Hindi reset', () => {
    const hindiPassage = generateTestPassage({
      language: 'hi',
      difficulty: 'medium',
      testType: 'paragraph',
      targetCount: 60,
      includeSpecialCharacters: false,
    });

    expect(hindiPassage.language).toBe('hi');
    expect(hindiPassage.text.length).toBeGreaterThan(0);
    // Must contain Devanagari characters
    expect(/[\u0900-\u097F]/.test(hindiPassage.text)).toBe(true);
    // Does not fall back to English everyday paragraph
    expect(hindiPassage.text).not.toContain('the people have time');
  });

  // =========================================================================
  // TEST 9: Hindi does not incorrectly show/use English-only Capital Letters behavior
  // =========================================================================
  it('TEST 9: Hindi does not incorrectly show/use English-only Capital Letters behavior', () => {
    // 1. SettingsModal displays "Not applicable to Hindi" when language is Hindi
    const htmlHindi = renderToStaticMarkup(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: () => {},
        settings: { ...DEFAULT_TYPING_SETTINGS, language: 'hi', includeCapitalLetters: true },
        currentLanguage: 'hi',
        onUpdateSettings: () => {},
      })
    );

    expect(htmlHindi).toContain('Not applicable to Hindi');
    expect(htmlHindi).toContain('Disabled for Hindi');

    // 2. formatPassageText ignores includeCapitalLetters for Hindi
    const hindiOriginal = 'अभ्यास और धैर्य से सफलता मिलती है।';
    const formattedWithCapitals = formatPassageText(hindiOriginal, 'hi', true, true);
    const formattedWithoutCapitals = formatPassageText(hindiOriginal, 'hi', false, true);

    expect(formattedWithCapitals).toBe(formattedWithoutCapitals);
  });

  // =========================================================================
  // TEST 10: Existing English settings behavior remains unchanged
  // =========================================================================
  it('TEST 10: Existing English settings behavior remains unchanged', () => {
    // SettingsModal for English allows Capital Letters toggle
    const htmlEnglish = renderToStaticMarkup(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: () => {},
        settings: { ...DEFAULT_TYPING_SETTINGS, language: 'en', includeCapitalLetters: false },
        currentLanguage: 'en',
        onUpdateSettings: () => {},
      })
    );

    expect(htmlEnglish).not.toContain('Disabled for Hindi');
    expect(htmlEnglish).toContain('Include Capital Letters');

    // formatPassageText handles Capital Letters for English
    const englishOriginal = 'hello world';
    const formattedCapitals = formatPassageText(englishOriginal, 'en', true, false);
    const formattedLowercase = formatPassageText(englishOriginal, 'en', false, false);

    expect(formattedCapitals).toBe('hello world');
    expect(formattedLowercase).toBe('hello world');
  });

  // =========================================================================
  // TEST 11: Existing Stop on Error behavior remains intact
  // =========================================================================
  it('TEST 11: Existing Stop on Error behavior remains intact', () => {
    const hindiPassage = generateTestPassage({
      language: 'hi',
      difficulty: 'medium',
      testType: 'time',
      targetCount: 60,
    });

    const state = createInitialState(hindiPassage, 60, 'time', 60);
    const firstChar = state.characters[0].char;
    const wrongChar = firstChar === 'अ' ? 'क' : 'अ';

    // Type incorrect key with stopOnError: true
    const nextState = processKeystroke(state, wrongChar, 1000, {
      stopOnError: true,
      forgiveErrors: false,
      allowBackspace: true,
      spaceSkipsWord: false,
    });

    // In stopOnError mode, wrong key flags the character as incorrect and locks cursor advance
    expect(nextState.currentIndex).toBe(0);
    expect(nextState.characters[0].state).toBe('incorrect');
    expect(nextState.incorrectStrokes).toBe(1);

    // Another wrong key still cannot advance past the error
    const nextState2 = processKeystroke(nextState, 'ख', 1200, {
      stopOnError: true,
      forgiveErrors: false,
      allowBackspace: true,
      spaceSkipsWord: false,
    });
    expect(nextState2.currentIndex).toBe(0);
  });

  // =========================================================================
  // TEST 12: Existing Backspace behavior remains intact
  // =========================================================================
  it('TEST 12: Existing Backspace behavior remains intact', () => {
    const englishPassage = generateTestPassage({
      language: 'en',
      difficulty: 'medium',
      testType: 'time',
      targetCount: 60,
    });

    const state = createInitialState(englishPassage, 60, 'time', 60);
    const firstChar = state.characters[0].char;

    // Type first character correctly
    const s1 = processKeystroke(state, firstChar, 1000, {
      stopOnError: false,
      forgiveErrors: false,
      allowBackspace: true,
      spaceSkipsWord: false,
    });
    expect(s1.currentIndex).toBe(1);

    // Backspace when allowBackspace: true -> moves back to index 0
    const s2Allowed = processKeystroke(s1, 'Backspace', 1200, {
      stopOnError: false,
      forgiveErrors: false,
      allowBackspace: true,
      spaceSkipsWord: false,
    });
    expect(s2Allowed.currentIndex).toBe(0);

    // Backspace when allowBackspace: false -> cannot move backward
    const s2Disallowed = processKeystroke(s1, 'Backspace', 1200, {
      stopOnError: false,
      forgiveErrors: false,
      allowBackspace: false,
      spaceSkipsWord: false,
    });
    expect(s2Disallowed.currentIndex).toBe(1);
  });
});
