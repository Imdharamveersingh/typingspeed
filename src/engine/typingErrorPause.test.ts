import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  processKeystroke,
  calculateCurrentMetrics,
  tickTimer,
} from './typingEngine';
import { Passage } from './types';
import { DEFAULT_TYPING_SETTINGS } from './settingsTypes';
import fs from 'fs';
import path from 'path';

const testPassage: Passage = {
  id: 'test-error-passage',
  title: 'Test Passage',
  text: 'internet typing test',
  language: 'en',
  difficulty: 'easy',
};

describe('Critical Typing Error Pause & Settings Behavior (Section G)', () => {
  // TEST 1: Correct key advances normally
  it('TEST 1: Correct key advances normally', () => {
    let state = createInitialState(testPassage, 60, 'time');
    expect(state.currentIndex).toBe(0);

    state = processKeystroke(state, 'i', 1000, { stopOnError: true });
    expect(state.currentIndex).toBe(1);
    expect(state.characters[0].state).toBe('correct');
    expect(state.characters[0].hadMistake).toBeFalsy();
    expect(state.correctStrokes).toBe(1);
    expect(state.status).toBe('running');
  });

  // TEST 2: Wrong key marks the current character incorrect
  it('TEST 2: Wrong key marks the current character incorrect', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Expected 'i', user enters 'x'
    state = processKeystroke(state, 'x', 1000, { stopOnError: true });

    expect(state.characters[0].state).toBe('incorrect');
    expect(state.characters[0].hadMistake).toBe(true);
    expect(state.characters[0].typedChar).toBe('x');
    expect(state.incorrectStrokes).toBe(1);
  });

  // TEST 3: Wrong key does NOT advance the cursor
  it('TEST 3: Wrong key does NOT advance the cursor', () => {
    let state = createInitialState(testPassage, 60, 'time');
    state = processKeystroke(state, 'x', 1000, { stopOnError: true });

    // Cursor must remain on index 0
    expect(state.currentIndex).toBe(0);
  });

  // TEST 4: Repeated wrong keys do NOT advance the cursor
  it('TEST 4: Repeated wrong keys do NOT advance the cursor', () => {
    let state = createInitialState(testPassage, 60, 'time');
    const wrongKeys = ['x', 'z', 'q', 'a', 'p', 'w', 'm'];

    wrongKeys.forEach((key, idx) => {
      state = processKeystroke(state, key, 1000 + idx * 100, { stopOnError: true });
      expect(state.currentIndex).toBe(0);
      expect(state.characters[0].state).toBe('incorrect');
    });

    expect(state.currentIndex).toBe(0);
    expect(state.incorrectStrokes).toBe(wrongKeys.length);
  });

  // TEST 5: Repeated wrong keys do NOT create productive progress
  it('TEST 5: Repeated wrong keys do NOT create productive progress', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type 2 correct letters: 'i', 'n'
    state = processKeystroke(state, 'i', 1000, { stopOnError: true });
    state = processKeystroke(state, 'n', 1200, { stopOnError: true });
    expect(state.currentIndex).toBe(2);
    expect(state.correctStrokes).toBe(2);

    const mBefore = calculateCurrentMetrics(state);

    // Press 5 repeated wrong keys on the 3rd letter (expected 't')
    const wrongKeys = ['x', 'z', 'q', 'a', 'p'];
    wrongKeys.forEach((key, idx) => {
      state = processKeystroke(state, key, 1400 + idx * 100, { stopOnError: true });
      const mDuring = calculateCurrentMetrics(state);

      // Cursor remains frozen
      expect(state.currentIndex).toBe(2);
      // Productive keystrokes do not advance
      expect(state.correctStrokes).toBe(2);
      // GWPM remains completely frozen
      expect(mDuring.grossWPM).toBe(mBefore.grossWPM);
      // Net WPM remains completely frozen
      expect(mDuring.netWPM).toBe(mBefore.netWPM);
      // Active elapsed time remains completely frozen
      expect(mDuring.elapsedSeconds).toBe(mBefore.elapsedSeconds);
      expect(mDuring.remainingSeconds).toBe(mBefore.remainingSeconds);
    });
  });

  // TEST 6: Timer/progression is frozen while blocked on an incorrect character
  it('TEST 6: Timer/progression is frozen while blocked on an incorrect character', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type 'i' at 1000, 'n' at 1300
    state = processKeystroke(state, 'i', 1000, { stopOnError: true });
    state = processKeystroke(state, 'n', 1300, { stopOnError: true });
    expect(state.accumulatedActiveTimeMs).toBe(300);

    const metricsBefore = calculateCurrentMetrics(state);
    expect(metricsBefore.elapsedSeconds).toBe(0.3);
    expect(metricsBefore.remainingSeconds).toBe(59.7);

    // Wrong key 'x' entered at 1600ms
    state = processKeystroke(state, 'x', 1600, { stopOnError: true });
    expect(state.accumulatedActiveTimeMs).toBe(300); // FROZEN!

    const metricsDuring = calculateCurrentMetrics(state);
    expect(metricsDuring.elapsedSeconds).toBe(0.3);
    expect(metricsDuring.remainingSeconds).toBe(59.7);

    // User is blocked for 10 seconds and presses keys or time elapses
    state = processKeystroke(state, 'z', 11600, { stopOnError: true });
    expect(state.accumulatedActiveTimeMs).toBe(300); // STILL FROZEN!

    const metricsAfterIdle = calculateCurrentMetrics(state);
    expect(metricsAfterIdle.elapsedSeconds).toBe(0.3);
    expect(metricsAfterIdle.remainingSeconds).toBe(59.7);

    // tickTimer must not complete or advance the test while blocked on an error
    const ticked = tickTimer(state, 1000 + 70000);
    expect(ticked.status).toBe('running');
    expect(ticked.endTime).toBeNull();
  });

  // TEST 7: Correct key after an error resolves the character and advances
  it('TEST 7: Correct key after an error resolves the character and advances', () => {
    let state = createInitialState(testPassage, 60, 'time');
    state = processKeystroke(state, 'i', 1000, { stopOnError: true });
    state = processKeystroke(state, 'n', 1200, { stopOnError: true });

    // Wrong key 'x' on 't'
    state = processKeystroke(state, 'x', 1400, { stopOnError: true });
    expect(state.currentIndex).toBe(2);
    expect(state.characters[2].state).toBe('incorrect');

    // Repeated wrong key 'z'
    state = processKeystroke(state, 'z', 1600, { stopOnError: true });
    expect(state.currentIndex).toBe(2);

    // Correct key 't' entered!
    state = processKeystroke(state, 't', 3000, { stopOnError: true });
    expect(state.currentIndex).toBe(3); // Advances!
    expect(state.characters[2].state).toBe('corrected'); // Resolved to corrected!
    expect(state.correctStrokes).toBe(3);

    // Resuming: next keystroke 'e' accumulates delta from resume timestamp (3000ms)
    state = processKeystroke(state, 'e', 3200, { stopOnError: true });
    expect(state.currentIndex).toBe(4);
    expect(state.accumulatedActiveTimeMs).toBe(200 + 200); // 200ms ('i'->'n') + 200ms ('t'->'e')
  });

  // TEST 8: Corrected character retains the corrected/amber state
  it('TEST 8: Corrected character retains the corrected/amber state', () => {
    let state = createInitialState(testPassage, 60, 'time');
    state = processKeystroke(state, 'x', 1000, { stopOnError: true }); // wrong 'i'
    expect(state.characters[0].hadMistake).toBe(true);

    // Correct key
    state = processKeystroke(state, 'i', 1500, { stopOnError: true });
    expect(state.characters[0].state).toBe('corrected');
    expect(state.characters[0].hadMistake).toBe(true);

    // Type subsequent characters
    state = processKeystroke(state, 'n', 1700, { stopOnError: true });
    state = processKeystroke(state, 't', 1900, { stopOnError: true });

    // Character 0 MUST still be in 'corrected' state
    expect(state.characters[0].state).toBe('corrected');
    expect(state.characters[0].hadMistake).toBe(true);
    expect(state.characters[1].state).toBe('correct');
    expect(state.characters[2].state).toBe('correct');
  });

  // TEST 9: Incorrect character has no red underline
  it('TEST 9: Incorrect character has no red underline in CSS', () => {
    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // .char-incorrect must exist
    expect(cssContent).toMatch(/\.char-incorrect\s*\{/);
    // .char-incorrect must have border-bottom: none (no red bottom border or underline)
    expect(cssContent).toMatch(/\.char-incorrect\s*\{[^}]*border-bottom:\s*none;/s);
    // .char-incorrect must not have red border-bottom
    expect(cssContent).not.toMatch(/\.char-incorrect\s*\{[^}]*border-bottom:\s*2px solid/s);
    // .char-incorrect must have text-decoration: none
    expect(cssContent).toMatch(/\.char-incorrect\s*\{[^}]*text-decoration:\s*none;/s);
  });

  // TEST 10: Existing Backspace behavior still works
  it('TEST 10: Existing Backspace behavior still works', () => {
    let state = createInitialState(testPassage, 60, 'time');
    state = processKeystroke(state, 'i', 1000, { stopOnError: true, allowBackspace: true });
    state = processKeystroke(state, 'n', 1100, { stopOnError: true, allowBackspace: true });

    // Mistake on 't'
    state = processKeystroke(state, 'x', 1200, { stopOnError: true, allowBackspace: true });
    expect(state.characters[2].state).toBe('incorrect');

    // Backspace clears the incorrect character
    state = processKeystroke(state, 'Backspace', 1300, { stopOnError: true, allowBackspace: true });
    expect(state.currentIndex).toBe(2);
    expect(state.characters[2].state).toBe('untyped');
    expect(state.characters[2].hadMistake).toBe(true);

    // Another backspace moves back to index 1
    state = processKeystroke(state, 'Backspace', 1400, { stopOnError: true, allowBackspace: true });
    expect(state.currentIndex).toBe(1);
    expect(state.characters[1].state).toBe('untyped');
  });

  // TEST 11: Existing Stop on Error setting still works
  it('TEST 11: Existing Stop on Error setting still works', () => {
    const passage: Passage = { ...testPassage, text: 'abc' };

    // With stopOnError: true -> cursor stops at error
    let stateStop = createInitialState(passage, 60, 'time');
    stateStop = processKeystroke(stateStop, 'z', 1000, { stopOnError: true });
    expect(stateStop.currentIndex).toBe(0);
    expect(stateStop.characters[0].state).toBe('incorrect');

    // With forgiveErrors: true, stopOnError: false -> cursor advances past error
    let stateForgive = createInitialState(passage, 60, 'time');
    stateForgive = processKeystroke(stateForgive, 'z', 1000, { forgiveErrors: true, stopOnError: false });
    expect(stateForgive.currentIndex).toBe(1);
    expect(stateForgive.characters[0].state).toBe('incorrect');
  });

  // TEST 12: Existing settings behavior remains intact
  it('TEST 12: Existing settings behavior remains intact', () => {
    expect(DEFAULT_TYPING_SETTINGS.stopOnError).toBe(true);
    expect(DEFAULT_TYPING_SETTINGS.forgiveErrors).toBe(false);
    expect(DEFAULT_TYPING_SETTINGS.allowBackspace).toBe(false);
    expect(DEFAULT_TYPING_SETTINGS.spaceSkipsWord).toBe(false);
    expect(DEFAULT_TYPING_SETTINGS.keyboardVisible).toBe(true);

    const typingTestPath = path.resolve(__dirname, '../components/typing/TypingTest.tsx');
    const typingTestContent = fs.readFileSync(typingTestPath, 'utf-8');

    // Top configuration labels must be clear
    expect(typingTestContent).toContain('Test Type');
    expect(typingTestContent).not.toContain('>TYPE<');
    expect(typingTestContent).toContain('Language');
    expect(typingTestContent).not.toContain('>LANG<');
    expect(typingTestContent).toContain('Difficulty');
    expect(typingTestContent).not.toContain('>DIFFICULTY<');

    // Chevron SVG must be used
    expect(typingTestContent).toContain('DropdownChevron');
    expect(typingTestContent).toContain('pill-chevron');
  });
});
