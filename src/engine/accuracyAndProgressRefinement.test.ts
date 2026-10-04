import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  processKeystroke,
  calculateCurrentMetrics,
} from './typingEngine';
import { analyzeTypingResult } from './analytics';
import { calculateProgressPercentage } from '../components/typing/TypingProgressBar';
import { Passage } from './types';
import fs from 'fs';
import path from 'path';

const testPassage: Passage = {
  id: 'accuracy-progress-test-passage',
  title: 'Accuracy and Progress Test Passage',
  text: 'abcdefghij klmnopqrst uvwxyz 1234567890',
  language: 'en',
  difficulty: 'easy',
};

describe('Focused Refinement Pass: Accuracy and Progress Bar', () => {
  // TEST 1: 0 mistakes → Accuracy 100%.
  it('TEST 1: 0 mistakes → Accuracy 100%', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type 10 correct characters: 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'
    const correctChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    for (let i = 0; i < correctChars.length; i++) {
      state = processKeystroke(state, correctChars[i], 1000 + i * 100, { stopOnError: true });
    }

    const metrics = calculateCurrentMetrics(state);
    expect(metrics.errors).toBe(0);
    expect(metrics.accuracy).toBe(100);
    expect(metrics.correctCharacters).toBe(10);
    expect(metrics.incorrectCharacters).toBe(0);
  });

  // TEST 2: A real wrong character lowers Accuracy.
  it('TEST 2: A real wrong character lowers Accuracy', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type 9 correct characters: 'a' through 'i'
    const correctChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    for (let i = 0; i < correctChars.length; i++) {
      state = processKeystroke(state, correctChars[i], 1000 + i * 100, { stopOnError: true });
    }
    // 10th character: expected 'j', type wrong key 'x'
    state = processKeystroke(state, 'x', 2000, { stopOnError: true });

    const metrics = calculateCurrentMetrics(state);
    expect(metrics.errors).toBe(1);
    // 9 correct out of 10 attempted = 90%
    expect(metrics.accuracy).toBe(90);
  });

  // TEST 3: Correcting a previously wrong character does not restore Accuracy to 100%.
  it('TEST 3: Correcting a previously wrong character does not restore Accuracy to 100%', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type 9 correct characters
    const correctChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    for (let i = 0; i < correctChars.length; i++) {
      state = processKeystroke(state, correctChars[i], 1000 + i * 100, { stopOnError: true });
    }

    // 10th character mistake
    state = processKeystroke(state, 'x', 2000, { stopOnError: true });
    const errorMetrics = calculateCurrentMetrics(state);
    expect(errorMetrics.errors).toBe(1);
    expect(errorMetrics.accuracy).toBe(90);

    // Correct the 10th character to 'j'
    state = processKeystroke(state, 'j', 2200, { stopOnError: true });
    expect(state.characters[9].state).toBe('corrected');
    expect(state.characters[9].hadMistake).toBe(true);

    const correctedMetrics = calculateCurrentMetrics(state);
    // The historical mistake is NOT erased: errors remains 1, accuracy remains 90%
    expect(correctedMetrics.errors).toBe(1);
    expect(correctedMetrics.accuracy).toBe(90);
    expect(correctedMetrics.accuracy).toBeLessThan(100);
  });

  // TEST 4: Stop on Error wrong key immediately affects Accuracy.
  it('TEST 4: Stop on Error wrong key immediately affects Accuracy', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type 9 correct characters
    for (const c of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) {
      state = processKeystroke(state, c, 1000, { stopOnError: true });
    }
    expect(calculateCurrentMetrics(state).accuracy).toBe(100);

    // Press wrong key with stopOnError: true
    state = processKeystroke(state, 'z', 1100, { stopOnError: true });
    const blockedMetrics = calculateCurrentMetrics(state);

    // Cursor is frozen at index 9, character is marked incorrect
    expect(state.currentIndex).toBe(9);
    expect(state.characters[9].state).toBe('incorrect');
    expect(blockedMetrics.errors).toBe(1);
    expect(blockedMetrics.accuracy).toBe(90);
  });

  // TEST 5: Forgive Errors ON + wrong key immediately affects Accuracy.
  it('TEST 5: Forgive Errors ON + wrong key immediately affects Accuracy', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type 9 correct characters
    for (const c of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) {
      state = processKeystroke(state, c, 1000, { stopOnError: false, forgiveErrors: true });
    }
    expect(calculateCurrentMetrics(state).accuracy).toBe(100);

    // Press wrong key with forgiveErrors: true
    state = processKeystroke(state, 'z', 1100, { stopOnError: false, forgiveErrors: true });
    const forgivenMetrics = calculateCurrentMetrics(state);

    // Cursor advances to index 10, character 9 marked incorrect
    expect(state.currentIndex).toBe(10);
    expect(state.characters[9].state).toBe('incorrect');
    expect(forgivenMetrics.errors).toBe(1);
    expect(forgivenMetrics.accuracy).toBe(90);
  });

  // TEST 6: Repeated wrong keys on a frozen character follow the canonical error-per-character model.
  it('TEST 6: Repeated wrong keys on a frozen character follow the canonical error-per-character model', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type 9 correct characters
    for (const c of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) {
      state = processKeystroke(state, c, 1000, { stopOnError: true });
    }

    // First wrong key on character 9 ('j')
    state = processKeystroke(state, 'x', 1100, { stopOnError: true });
    expect(calculateCurrentMetrics(state).errors).toBe(1);
    expect(calculateCurrentMetrics(state).accuracy).toBe(90);

    // Repeated wrong keys on the frozen character
    state = processKeystroke(state, 'z', 1200, { stopOnError: true });
    state = processKeystroke(state, 'q', 1300, { stopOnError: true });
    state = processKeystroke(state, 'y', 1400, { stopOnError: true });

    const repeatedBlockedMetrics = calculateCurrentMetrics(state);
    // Under canonical error model, repeated blocked strokes do not create extra character errors
    expect(repeatedBlockedMetrics.errors).toBe(1);
    expect(repeatedBlockedMetrics.accuracy).toBe(90);
    expect(state.currentIndex).toBe(9);
  });

  // TEST 7: Live Accuracy and final Accuracy use the same metric.
  it('TEST 7: Live Accuracy and final Accuracy use the same metric', () => {
    const shortPassage: Passage = {
      id: 'short-test',
      title: 'Short Test',
      text: 'abcdefghij',
      language: 'en',
      difficulty: 'easy',
    };
    let state = createInitialState(shortPassage, 60, 'characters', 10);
    // Type 9 correct characters and 1 corrected character
    for (const c of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) {
      state = processKeystroke(state, c, 1000, { stopOnError: true });
    }
    state = processKeystroke(state, 'x', 1100, { stopOnError: true }); // mistake
    state = processKeystroke(state, 'j', 1200, { stopOnError: true }); // corrected and completes target

    expect(state.status).toBe('completed');
    const liveMetrics = calculateCurrentMetrics(state);
    const analytics = analyzeTypingResult(state);

    expect(liveMetrics.accuracy).toBe(90);
    expect(analytics.accuracy).toBe(90);
    expect(analytics.accuracy).toBe(liveMetrics.accuracy);
  });

  // TEST 8: Test Type dropdown is wide enough and content is not clipped.
  it('TEST 8: Test Type dropdown is wide enough and content is not clipped', () => {
    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // Test Type dropdown uses .toolbar-dropdown-wide with ample min-width
    expect(css).toMatch(/\.toolbar-dropdown-wide\s*\{[^}]*min-width:\s*320px/s);
    expect(css).toMatch(/\.toolbar-dropdown-wide\s*\{[^}]*width:\s*max-content/s);

    // Option items have gap between text and radio indicator
    expect(css).toMatch(/\.toolbar-dropdown-item\s*\{[^}]*gap:\s*12px/s);
  });

  // TEST 9: Test Type dropdown remains vertically scrollable when needed.
  it('TEST 9: Test Type dropdown remains vertically scrollable when needed', () => {
    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toMatch(/\.toolbar-dropdown-wide\s*\{[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.toolbar-dropdown-wide\s*\{[^}]*max-height:\s*360px/s);
  });

  // TEST 10: Time/Language/Difficulty dropdown dimensions are not unintentionally changed.
  it('TEST 10: Time/Language/Difficulty dropdown dimensions are not unintentionally changed', () => {
    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // Standard .toolbar-dropdown retains its original compact min-width
    expect(css).toMatch(/\.toolbar-dropdown\s*\{[^}]*min-width:\s*170px/s);
  });

  // TEST 11: Progress bar remains correctly mapped to typing progress.
  it('TEST 11: Progress bar remains correctly mapped to typing progress', () => {
    expect(calculateProgressPercentage({
      testType: 'time',
      status: 'idle',
      duration: 60,
      elapsedSeconds: 0,
    })).toBe(0);

    expect(calculateProgressPercentage({
      testType: 'time',
      status: 'running',
      duration: 60,
      elapsedSeconds: 30,
    })).toBe(50);

    expect(calculateProgressPercentage({
      testType: 'words',
      status: 'running',
      duration: 60,
      elapsedSeconds: 15,
      targetProgress: { current: 25, total: 50 },
    })).toBe(50);

    expect(calculateProgressPercentage({
      testType: 'time',
      status: 'completed',
      duration: 60,
      elapsedSeconds: 60,
    })).toBe(100);
  });

  // TEST 12: Progress wave remains clipped to the actual progress width and track is 5-6px.
  it('TEST 12: Progress wave remains clipped to the actual progress width and track is 5-6px', () => {
    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // Progress bar track is refined to 6px (5-6px target direction)
    expect(css).toMatch(/\.typing-progress-bar-track\s*\{[^}]*height:\s*6px/s);

    // Progress bar fill clips wave layer
    expect(css).toMatch(/\.typing-progress-bar-fill\s*\{[^}]*overflow:\s*hidden/s);

    // JSX in TypingProgressBar verifies wave layer is inside fill
    const componentPath = path.resolve(__dirname, '../components/typing/TypingProgressBar.tsx');
    const componentCode = fs.readFileSync(componentPath, 'utf-8');
    expect(componentCode).toContain('typing-progress-bar-fill');
    expect(componentCode).toContain('typing-progress-wave-layer');
  });
});
