import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  processKeystroke,
  calculateCurrentMetrics,
  tickTimer,
} from './typingEngine';
import { analyzeTypingResult } from './analytics';
import { Passage, TypingState } from './types';
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

describe('Critical Typing Error Pause, Error Counting & Settings Behavior', () => {
  // TEST 1: Wrong key increments the error count.
  it('TEST 1: Wrong key increments the error count', () => {
    let state = createInitialState(testPassage, 60, 'time');
    const initialMetrics = calculateCurrentMetrics(state);
    expect(initialMetrics.errors).toBe(0);
    expect(initialMetrics.uncorrectedErrors).toBe(0);

    // Expected 'i', user enters 'x'
    state = processKeystroke(state, 'x', 1000, { stopOnError: true });
    const errorMetrics = calculateCurrentMetrics(state);

    expect(errorMetrics.errors).toBe(1);
    expect(errorMetrics.uncorrectedErrors).toBe(1);
    expect(state.characters[0].state).toBe('incorrect');
    expect(state.characters[0].hadMistake).toBe(true);
    expect(state.incorrectStrokes).toBe(1);
  });

  // TEST 2: Wrong key does not advance the cursor in Stop on Error mode.
  it('TEST 2: Wrong key does not advance the cursor in Stop on Error mode', () => {
    let state = createInitialState(testPassage, 60, 'time');
    state = processKeystroke(state, 'x', 1000, { stopOnError: true });

    // Cursor must remain on index 0
    expect(state.currentIndex).toBe(0);

    // Repeated wrong keys also do not advance
    const wrongKeys = ['z', 'q', 'a', 'p', 'w'];
    wrongKeys.forEach((key, idx) => {
      state = processKeystroke(state, key, 1100 + idx * 100, { stopOnError: true });
      expect(state.currentIndex).toBe(0);
      expect(state.characters[0].state).toBe('incorrect');
    });

    expect(state.currentIndex).toBe(0);
  });

  // TEST 3: Wrong key freezes productive timing in Stop on Error mode.
  it('TEST 3: Wrong key freezes productive timing in Stop on Error mode', () => {
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
    expect(metricsDuring.grossWPM).toBe(metricsBefore.grossWPM);
    expect(metricsDuring.netWPM).toBe(metricsBefore.netWPM);

    // Repeated wrong keys or time elapsing while blocked
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

  // TEST 4: Correct key after wrong key resumes progression.
  it('TEST 4: Correct key after wrong key resumes progression', () => {
    let state = createInitialState(testPassage, 60, 'time');
    state = processKeystroke(state, 'i', 1000, { stopOnError: true });
    state = processKeystroke(state, 'n', 1200, { stopOnError: true });

    // Wrong key 'x' on 't' (index 2)
    state = processKeystroke(state, 'x', 1400, { stopOnError: true });
    expect(state.currentIndex).toBe(2);
    expect(state.characters[2].state).toBe('incorrect');
    expect(calculateCurrentMetrics(state).errors).toBe(1);

    // Repeated wrong key 'z'
    state = processKeystroke(state, 'z', 1600, { stopOnError: true });
    expect(state.currentIndex).toBe(2);
    expect(calculateCurrentMetrics(state).errors).toBe(1);

    // Correct key 't' entered!
    state = processKeystroke(state, 't', 3000, { stopOnError: true });
    expect(state.currentIndex).toBe(3); // Advances!
    expect(state.characters[2].state).toBe('corrected'); // Resolved to corrected!
    expect(state.correctStrokes).toBe(3);

    // Error count remains recorded after the mistake is resolved!
    const metricsAfterFix = calculateCurrentMetrics(state);
    expect(metricsAfterFix.errors).toBe(1);
    expect(metricsAfterFix.uncorrectedErrors).toBe(0);

    // Resuming: next keystroke 'e' accumulates delta from resume timestamp (3000ms)
    state = processKeystroke(state, 'e', 3200, { stopOnError: true });
    expect(state.currentIndex).toBe(4);
    expect(state.accumulatedActiveTimeMs).toBe(200 + 200); // 200ms ('i'->'n') + 200ms ('t'->'e')
    expect(calculateCurrentMetrics(state).errors).toBe(1);
  });

  // TEST 5: Corrected character remains amber/orange.
  it('TEST 5: Corrected character remains amber/orange', () => {
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

  // TEST 6: Forgive Errors ON still records the incorrect key as an error.
  it('TEST 6: Forgive Errors ON still records the incorrect key as an error', () => {
    let state = createInitialState(testPassage, 60, 'time');
    expect(calculateCurrentMetrics(state).errors).toBe(0);

    // Expected 'i', user enters 'x' with forgiveErrors: true, stopOnError: false
    state = processKeystroke(state, 'x', 1000, { forgiveErrors: true, stopOnError: false });
    const metrics = calculateCurrentMetrics(state);

    expect(metrics.errors).toBe(1);
    expect(state.characters[0].hadMistake).toBe(true);
    expect(state.characters[0].state).toBe('incorrect');
  });

  // TEST 7: Forgive Errors ON preserves its intended progression behavior.
  it('TEST 7: Forgive Errors ON preserves its intended progression behavior', () => {
    let state = createInitialState(testPassage, 60, 'time');

    // Expected 'i', user types 'x'
    state = processKeystroke(state, 'x', 1000, { forgiveErrors: true, stopOnError: false });
    // Cursor advances past the error in Forgive Errors mode
    expect(state.currentIndex).toBe(1);
    expect(state.characters[0].state).toBe('incorrect');

    // User types next expected character 'n'
    state = processKeystroke(state, 'n', 1200, { forgiveErrors: true, stopOnError: false });
    expect(state.currentIndex).toBe(2);
    expect(state.characters[1].state).toBe('correct');

    // Total errors remains 1
    const metrics = calculateCurrentMetrics(state);
    expect(metrics.errors).toBe(1);
  });

  // TEST 8: Live Errors metric updates immediately after an error.
  it('TEST 8: Live Errors metric updates immediately after an error', () => {
    let state = createInitialState(testPassage, 60, 'time');
    expect(calculateCurrentMetrics(state).errors).toBe(0);

    // Error 1
    state = processKeystroke(state, 'x', 1000, { stopOnError: true });
    expect(calculateCurrentMetrics(state).errors).toBe(1);

    // Repeated wrong key on same character does not falsely inflate
    state = processKeystroke(state, 'z', 1100, { stopOnError: true });
    expect(calculateCurrentMetrics(state).errors).toBe(1);

    // Resolve Error 1
    state = processKeystroke(state, 'i', 1200, { stopOnError: true });
    expect(calculateCurrentMetrics(state).errors).toBe(1);

    // Correct character
    state = processKeystroke(state, 'n', 1300, { stopOnError: true });
    expect(calculateCurrentMetrics(state).errors).toBe(1);

    // Error 2 on 't'
    state = processKeystroke(state, 'w', 1400, { stopOnError: true });
    expect(calculateCurrentMetrics(state).errors).toBe(2);
  });

  // TEST 9: Final result error count remains consistent with the live error model.
  it('TEST 9: Final result error count remains consistent with the live error model', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type 'i' (wrong 'x' then fixed 'i'), 'n' (correct), 't' (wrong 'y' then fixed 't')
    state = processKeystroke(state, 'x', 1000, { stopOnError: true });
    state = processKeystroke(state, 'i', 1100, { stopOnError: true });
    state = processKeystroke(state, 'n', 1200, { stopOnError: true });
    state = processKeystroke(state, 'y', 1300, { stopOnError: true });
    state = processKeystroke(state, 't', 1400, { stopOnError: true });

    const liveMetrics = calculateCurrentMetrics(state);
    expect(liveMetrics.errors).toBe(2);

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 1000 + 60000,
    };

    const finalMetrics = calculateCurrentMetrics(completedState);
    expect(finalMetrics.errors).toBe(liveMetrics.errors);

    const analytics = analyzeTypingResult(completedState);
    expect(analytics.metrics.errors).toBe(finalMetrics.errors);
  });

  // TEST 10: Incorrect/corrected characters have no underline.
  it('TEST 10: Incorrect/corrected characters have no underline in CSS', () => {
    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // .char-incorrect must exist with border-bottom: none and text-decoration: none
    expect(cssContent).toMatch(/\.char-incorrect\s*\{/);
    expect(cssContent).toMatch(/\.char-incorrect\s*\{[^}]*border-bottom:\s*none;/s);
    expect(cssContent).not.toMatch(/\.char-incorrect\s*\{[^}]*border-bottom:\s*2px solid/s);
    expect(cssContent).toMatch(/\.char-incorrect\s*\{[^}]*text-decoration:\s*none;/s);

    // .char-corrected must exist with border-bottom: none and text-decoration: none
    expect(cssContent).toMatch(/\.char-corrected\s*\{/);
    expect(cssContent).toMatch(/\.char-corrected\s*\{[^}]*border-bottom:\s*none;/s);
    expect(cssContent).not.toMatch(/\.char-corrected\s*\{[^}]*border-bottom:\s*2px solid/s);
    expect(cssContent).toMatch(/\.char-corrected\s*\{[^}]*text-decoration:\s*none;/s);

    // .char-extra must also have no border-bottom
    expect(cssContent).toMatch(/\.char-extra\s*\{[^}]*border-bottom:\s*none;/s);
  });

  // TEST 11: Existing Backspace behavior remains intact.
  it('TEST 11: Existing Backspace behavior remains intact', () => {
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

  // TEST 12: Existing settings behavior remains intact.
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

    // Radio indicators present in dropdown items
    expect(typingTestContent).toContain('item-radio');
  });
});
