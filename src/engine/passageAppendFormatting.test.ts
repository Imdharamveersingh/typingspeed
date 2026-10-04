import { describe, expect, it } from 'vitest';
import {
  appendPassageContent,
  generateTestPassage,
  formatPassageText,
} from './passageGenerator';
import { createInitialState, processKeystroke } from './typingEngine';
import { Passage } from './types';

describe('Passage Append Formatting Pipeline', () => {
  it('TEST 1 — LOWERCASE: appended content does not introduce uppercase letters when capitalLetters=false', () => {
    const initialPassage = generateTestPassage({
      language: 'en',
      difficulty: 'medium',
      testType: 'time',
      includeCapitalLetters: false,
      includeSpecialCharacters: false,
    });

    // Verify initial passage has zero uppercase letters
    expect(/[A-Z]/.test(initialPassage.text)).toBe(false);

    const initialState = createInitialState(initialPassage, 60, 'time');
    const extendedState = appendPassageContent(initialState, 80);

    const appendedSubstring = extendedState.passage.text.slice(initialPassage.text.length);

    // Appended substring must have content
    expect(appendedSubstring.length).toBeGreaterThan(0);
    // Appended substring must NOT contain any uppercase letters
    expect(/[A-Z]/.test(appendedSubstring)).toBe(false);
  });

  it('TEST 2 — SPECIAL CHARACTERS DISABLED: appended content strips punctuation when specialCharacters=false', () => {
    const initialPassage = generateTestPassage({
      language: 'en',
      difficulty: 'medium',
      testType: 'time',
      includeCapitalLetters: false,
      includeSpecialCharacters: false,
    });

    // Verify initial passage has zero special characters/punctuation
    expect(/[^a-zA-Z0-9\s]/.test(initialPassage.text)).toBe(false);

    const initialState = createInitialState(initialPassage, 60, 'time');
    const extendedState = appendPassageContent(initialState, 80);

    const appendedSubstring = extendedState.passage.text.slice(initialPassage.text.length);

    expect(appendedSubstring.length).toBeGreaterThan(0);
    // Appended substring must NOT contain any punctuation or non-alphanumeric characters (except space)
    expect(/[^a-zA-Z0-9\s]/.test(appendedSubstring)).toBe(false);
  });

  it('TEST 3 — SPECIAL CHARACTERS ENABLED: appended content preserves punctuation when specialCharacters=true', () => {
    const initialPassage = generateTestPassage({
      language: 'en',
      difficulty: 'medium',
      testType: 'time',
      textSource: 'paragraph',
      includeCapitalLetters: true,
      includeSpecialCharacters: true,
    });

    const initialState = createInitialState(initialPassage, 60, 'time');
    const extendedState = appendPassageContent(initialState, 80);

    const appendedSubstring = extendedState.passage.text.slice(initialPassage.text.length);

    expect(appendedSubstring.length).toBeGreaterThan(0);
    // Appended paragraph content should preserve natural punctuation (e.g. commas or periods)
    expect(/[,.]/.test(appendedSubstring)).toBe(true);
  });

  it('TEST 4 — ENGLISH: appended English content matches initial formatting pipeline consistency', () => {
    const initialPassage = generateTestPassage({
      language: 'en',
      difficulty: 'easy',
      testType: 'time',
      includeCapitalLetters: false,
      includeSpecialCharacters: false,
    });

    const state = createInitialState(initialPassage, 60, 'time');
    const extended = appendPassageContent(state, 50);

    const addedText = extended.passage.text.slice(initialPassage.text.length).trim();
    const reformattedAdded = formatPassageText(addedText, 'en', false, false);

    // The appended text must already be completely identical to its canonical formatPassageText output
    expect(addedText).toBe(reformattedAdded);
    expect(extended.characters.length).toBe(extended.passage.text.length);
  });

  it('TEST 5 — HINDI: appended Hindi content respects specialCharacters and danda filtering', () => {
    // 5a. Hindi with specialCharacters = false (danda stripped)
    const initialHindiPassage = generateTestPassage({
      language: 'hi',
      difficulty: 'medium',
      testType: 'time',
      includeSpecialCharacters: false,
    });

    expect(/[।,;\-:—"'"!?()[\]{}.॥]/.test(initialHindiPassage.text)).toBe(false);

    const hindiState = createInitialState(initialHindiPassage, 60, 'time');
    const extendedHindiState = appendPassageContent(hindiState, 60);

    const appendedHindi = extendedHindiState.passage.text.slice(initialHindiPassage.text.length);
    expect(appendedHindi.length).toBeGreaterThan(0);
    expect(/[।,;\-:—"'"!?()[\]{}.॥]/.test(appendedHindi)).toBe(false);

    // 5b. Hindi with specialCharacters = true (danda preserved)
    const initialHindiWithPunct = generateTestPassage({
      language: 'hi',
      difficulty: 'medium',
      testType: 'time',
      includeSpecialCharacters: true,
    });

    const hindiStatePunct = createInitialState(initialHindiWithPunct, 60, 'time');
    const extendedHindiPunct = appendPassageContent(hindiStatePunct, 60);

    const appendedHindiPunct = extendedHindiPunct.passage.text.slice(initialHindiWithPunct.text.length);
    expect(appendedHindiPunct.length).toBeGreaterThan(0);
    expect(/[।,]/.test(appendedHindiPunct)).toBe(true);
  });

  it('TEST 6 — LONG TIMED TEST: triggers appendPassageContent via processKeystroke and formats dynamically appended content', () => {
    const rawPassage: Passage = {
      id: 'gen-time-test',
      title: 'Time Test',
      // Text with 320 characters of lowercase letters and spaces
      text: 'the modern world of digital communication relies upon swift typing and steady keyboard habits '.repeat(4).trim().toLowerCase(),
      language: 'en',
      difficulty: 'medium',
      includeCapitalLetters: false,
      includeSpecialCharacters: false,
    };

    let state = createInitialState(rawPassage, 60, 'time');
    expect(state.characters.length).toBeGreaterThanOrEqual(300);

    // Advance currentIndex until distance to end < 150
    const targetIndex = state.characters.length - 149;
    state = {
      ...state,
      currentIndex: targetIndex,
      status: 'running',
      startTime: 1000,
    };

    const initialLength = state.characters.length;

    // Type the next expected key
    const expectedChar = state.characters[state.currentIndex].char;
    const nextState = processKeystroke(state, expectedChar, 1050);

    // Content should have been dynamically appended
    expect(nextState.characters.length).toBeGreaterThan(initialLength);

    // Verify all dynamically appended characters obey lowercase and no-special-characters
    const appendedPart = nextState.passage.text.slice(initialLength);
    expect(appendedPart.length).toBeGreaterThan(0);
    expect(/[A-Z]/.test(appendedPart)).toBe(false);
    expect(/[^a-zA-Z0-9\s]/.test(appendedPart)).toBe(false);
  });
});
