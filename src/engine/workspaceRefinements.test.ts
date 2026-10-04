import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  processKeystroke,
  calculateCurrentMetrics,
} from './typingEngine';
import { calculateProgressPercentage } from '../components/typing/TypingProgressBar';
import { calculateRollingOffset } from '../components/typing/PassageDisplay';
import { Passage } from './types';
import fs from 'fs';
import path from 'path';

const samplePassage: Passage = {
  id: 'refinement-test-passage',
  title: 'Refinement Test Passage',
  text: 'the quick brown fox jumps over the lazy dog and runs through the forest with great speed and boundless energy',
  language: 'en',
  difficulty: 'medium',
};

const hindiPassage: Passage = {
  id: 'hindi-test-passage',
  title: 'Hindi Test Passage',
  text: 'यह एक हिंदी टाइपिंग टेस्ट है जो गति और सटीकता मापता है',
  language: 'hi',
  difficulty: 'medium',
};

describe('Focused Refinement Pass: Active TypingSpeed Test Workspace', () => {
  // TEST 1: Toolbar control spacing/rendering remains valid with label-above-button structure.
  it('TEST 1: Toolbar control spacing/rendering remains valid with label-above-button structure', () => {
    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // 1. Toolbar has desktop horizontal layout with gap
    expect(css).toMatch(/\.test-compact-toolbar\s*\{[^}]*gap:\s*12px/s);
    expect(css).toMatch(/\.test-compact-toolbar\s*\{[^}]*flex-wrap:\s*nowrap/s);

    // 2. Toolbar groups stack vertically (label above button)
    expect(css).toMatch(/\.toolbar-group\s*\{[^}]*flex-direction:\s*column/s);

    // 3. Control label has subtle distinct color and spacing
    expect(css).toMatch(/\.control-label\s*\{[^}]*color:\s*var\(--text-muted\)/s);

    // 4. Spacer exists for baseline alignment of action buttons
    expect(css).toMatch(/\.control-label-spacer\s*\{/);

    // 5. Verify Toolbar structure in TypingTest.tsx
    const typingTestPath = path.resolve(__dirname, '../components/typing/TypingTest.tsx');
    const typingTestContent = fs.readFileSync(typingTestPath, 'utf-8');
    expect(typingTestContent).toContain('Test Type');
    expect(typingTestContent).toContain('toolbar-group');
    expect(typingTestContent).toContain('control-label-spacer');
    expect(typingTestContent).toContain('toolbar-pill-settings');
    expect(typingTestContent).toContain('toolbar-pill-reset');
  });

  // TEST 2: Changing Test Type resets the active test.
  it('TEST 2: Changing Test Type resets the active test', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    // Start typing and introduce progress & mistake
    state = processKeystroke(state, 't', 1000, { stopOnError: true });
    state = processKeystroke(state, 'h', 1200, { stopOnError: true });
    state = processKeystroke(state, 'x', 1400, { stopOnError: true }); // wrong key on 'e'

    expect(state.status).toBe('running');
    expect(state.currentIndex).toBe(2);
    expect(calculateCurrentMetrics(state).errors).toBe(1);

    // Change Test Type to 'words'
    const resetState = createInitialState(samplePassage, 60, 'words', 50);

    expect(resetState.status).toBe('idle');
    expect(resetState.testType).toBe('words');
    expect(resetState.targetCount).toBe(50);
    expect(resetState.currentIndex).toBe(0);
    expect(calculateCurrentMetrics(resetState).errors).toBe(0);
    expect(resetState.characters[2].state).toBe('untyped');
    expect(resetState.startTime).toBeNull();
  });

  // TEST 3: Changing Time resets the active test.
  it('TEST 3: Changing Time resets the active test', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    state = processKeystroke(state, 't', 1000, { stopOnError: true });
    state = processKeystroke(state, 'h', 1300, { stopOnError: true });

    expect(state.status).toBe('running');
    expect(state.currentIndex).toBe(2);
    expect(state.duration).toBe(60);

    // Change duration to 30s
    const resetState = createInitialState(samplePassage, 30, 'time');

    expect(resetState.status).toBe('idle');
    expect(resetState.duration).toBe(30);
    expect(resetState.currentIndex).toBe(0);
    expect(resetState.accumulatedActiveTimeMs ?? 0).toBe(0);
    expect(resetState.startTime).toBeNull();
  });

  // TEST 4: Changing Language resets the active test.
  it('TEST 4: Changing Language resets the active test', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    state = processKeystroke(state, 't', 1000, { stopOnError: true });
    expect(state.status).toBe('running');

    // Change language to Hindi with a new Hindi passage
    const resetState = createInitialState(hindiPassage, 60, 'time');

    expect(resetState.status).toBe('idle');
    expect(resetState.passage.language).toBe('hi');
    expect(resetState.currentIndex).toBe(0);
    expect(resetState.characters[0].char).toBe('य');
    expect(resetState.characters[0].state).toBe('untyped');
    expect(calculateCurrentMetrics(resetState).errors).toBe(0);
  });

  // TEST 5: Changing Difficulty resets the active test.
  it('TEST 5: Changing Difficulty resets the active test', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    state = processKeystroke(state, 't', 1000, { stopOnError: true });
    expect(state.status).toBe('running');

    const hardPassage: Passage = { ...samplePassage, difficulty: 'hard' };
    const resetState = createInitialState(hardPassage, 60, 'time');

    expect(resetState.status).toBe('idle');
    expect(resetState.passage.difficulty).toBe('hard');
    expect(resetState.currentIndex).toBe(0);
    expect(calculateCurrentMetrics(resetState).errors).toBe(0);
  });

  // TEST 6: Configuration change resets progress to 0.
  it('TEST 6: Configuration change resets progress to 0', () => {
    const state = createInitialState(samplePassage, 60, 'time');
    const runningElapsedSeconds = 25.2; // 42% progress

    const runningPct = calculateProgressPercentage({
      testType: 'time',
      status: 'running',
      duration: state.duration,
      elapsedSeconds: runningElapsedSeconds,
    });
    expect(runningPct).toBeCloseTo(42, 0);

    // Reset via config change
    const resetState = createInitialState(samplePassage, 30, 'time');
    const resetElapsedSeconds = calculateCurrentMetrics(resetState).elapsedSeconds;
    const resetPct = calculateProgressPercentage({
      testType: 'time',
      status: resetState.status,
      duration: resetState.duration,
      elapsedSeconds: resetElapsedSeconds,
    });

    expect(resetPct).toBe(0);
  });

  // TEST 7: Configuration change resets Errors.
  it('TEST 7: Configuration change resets Errors', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    // Error at index 0 ('x' instead of 't')
    state = processKeystroke(state, 'x', 1000, { stopOnError: true });
    // Correct it
    state = processKeystroke(state, 't', 1100, { stopOnError: true });
    // Error at index 1 ('x' instead of 'h')
    state = processKeystroke(state, 'x', 1200, { stopOnError: true });
    state = processKeystroke(state, 'h', 1300, { stopOnError: true });
    // Error at index 2 ('x' instead of 'e')
    state = processKeystroke(state, 'x', 1400, { stopOnError: true });

    const runningMetrics = calculateCurrentMetrics(state);
    expect(runningMetrics.errors).toBe(3);

    // Reset via config change
    const resetState = createInitialState(samplePassage, 30, 'time');
    const resetMetrics = calculateCurrentMetrics(resetState);

    expect(resetMetrics.errors).toBe(0);
    expect(resetState.incorrectStrokes).toBe(0);
  });

  // TEST 8: Configuration change resets timer/active typing state.
  it('TEST 8: Configuration change resets timer/active typing state', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    state = processKeystroke(state, 't', 1000, { stopOnError: true });
    state = processKeystroke(state, 'h', 2000, { stopOnError: true });
    expect(state.accumulatedActiveTimeMs).toBe(1000);
    expect(state.startTime).toBe(1000);

    // Reset state
    const resetState = createInitialState(samplePassage, 60, 'time');
    expect(resetState.accumulatedActiveTimeMs ?? 0).toBe(0);
    expect(resetState.startTime).toBeNull();
    expect(calculateCurrentMetrics(resetState).elapsedSeconds).toBe(0);
    expect(resetState.endTime).toBeNull();
  });

  // TEST 9: New configuration is actually applied after reset.
  it('TEST 9: New configuration is actually applied after reset', () => {
    // 60s -> 30s
    const state30s = createInitialState(samplePassage, 30, 'time');
    expect(state30s.duration).toBe(30);

    // time -> words
    const stateWords = createInitialState(samplePassage, 60, 'words', 100);
    expect(stateWords.testType).toBe('words');
    expect(stateWords.targetCount).toBe(100);

    // en -> hi
    const stateHindi = createInitialState(hindiPassage, 60, 'time');
    expect(stateHindi.passage.language).toBe('hi');
  });

  // TEST 10: Progress wave width follows actual typing progress.
  it('TEST 10: Progress wave width follows actual typing progress', () => {
    // 0%
    const p0 = calculateProgressPercentage({
      testType: 'time',
      status: 'idle',
      duration: 60,
      elapsedSeconds: 0,
    });
    expect(p0).toBe(0);

    // 20%
    const p20 = calculateProgressPercentage({
      testType: 'time',
      status: 'running',
      duration: 60,
      elapsedSeconds: 12,
    });
    expect(p20).toBeCloseTo(20, 1);

    // 50%
    const p50 = calculateProgressPercentage({
      testType: 'time',
      status: 'running',
      duration: 60,
      elapsedSeconds: 30,
    });
    expect(p50).toBeCloseTo(50, 1);

    // 80%
    const p80 = calculateProgressPercentage({
      testType: 'time',
      status: 'running',
      duration: 60,
      elapsedSeconds: 48,
    });
    expect(p80).toBeCloseTo(80, 1);

    // 100%
    const p100 = calculateProgressPercentage({
      testType: 'time',
      status: 'completed',
      duration: 60,
      elapsedSeconds: 60,
    });
    expect(p100).toBe(100);
  });

  // TEST 11: Wave does not affect underlying progress calculation.
  it('TEST 11: Wave does not affect underlying progress calculation', () => {
    // Progress calculation is purely mathematical and unpolluted by DOM/visual styling
    const targetProgressWords = { current: 25, total: 50 };
    const pctWords = calculateProgressPercentage({
      testType: 'words',
      status: 'running',
      duration: 60,
      elapsedSeconds: 15,
      targetProgress: targetProgressWords,
    });
    expect(pctWords).toBe(50);

    const targetProgressChars = { current: 150, total: 300 };
    const pctChars = calculateProgressPercentage({
      testType: 'characters',
      status: 'running',
      duration: 60,
      elapsedSeconds: 20,
      targetProgress: targetProgressChars,
    });
    expect(pctChars).toBe(50);
  });

  // TEST 12: Reduced-motion behavior does not break progress visibility.
  it('TEST 12: Reduced-motion behavior does not break progress visibility', () => {
    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // CSS contains prefers-reduced-motion media query that handles the wave animation
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
    // In reduced motion, progress fill remains visible, animation is none or reduced
    expect(css).toMatch(/\.typing-progress-bar-fill\.wave-active\s*\.typing-progress-wave-layer\s*\{[^}]*animation:\s*none;/s);
  });

  // TEST 13: Exactly 4 passage lines are visible in the active viewport.
  it('TEST 13: Exactly 4 passage lines are visible in the active viewport', () => {
    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // Desktop English: exactly calc(4 * 38px)
    expect(css).toMatch(/\.passage-scroll-viewport\s*\{[^}]*height:\s*calc\(4\s*\*\s*38px\);/s);
    expect(css).toMatch(/\.passage-scroll-viewport\s*\{[^}]*max-height:\s*calc\(4\s*\*\s*38px\);/s);

    // Desktop Hindi: exactly calc(4 * 46px)
    expect(css).toMatch(/\.passage-scroll-viewport\.lang-hi\s*\{[^}]*height:\s*calc\(4\s*\*\s*46px\);/s);

    // Mobile: exactly calc(4 * 32px) and calc(4 * 40px)
    expect(css).toMatch(/height:\s*calc\(4\s*\*\s*32px\);/);
    expect(css).toMatch(/height:\s*calc\(4\s*\*\s*40px\);/);

    // Viewport must hide overflow so 5th line is never visible
    expect(css).toMatch(/\.passage-scroll-viewport\s*\{[^}]*overflow:\s*hidden;/s);
  });

  // TEST 14: Underlying passage is NOT truncated when viewport is limited to 4 lines.
  it('TEST 14: Underlying passage is NOT truncated when viewport is limited to 4 lines', () => {
    const longPassage: Passage = {
      id: 'long-passage',
      title: 'Long Passage',
      text: 'Word '.repeat(60), // 300 characters, ~10 lines
      language: 'en',
      difficulty: 'medium',
    };

    const state = createInitialState(longPassage, 60, 'time');
    expect(state.characters.length).toBe(longPassage.text.length);

    // Rolling offset calculation handles line scrolling without truncating data
    const offsetLine0 = calculateRollingOffset(0, 38);
    expect(offsetLine0.targetOffset).toBe(0);

    const offsetLine1 = calculateRollingOffset(38, 38);
    expect(offsetLine1.targetOffset).toBe(0);

    const offsetLine2 = calculateRollingOffset(76, 38);
    expect(offsetLine2.targetOffset).toBe(38); // Rolls 1 line up, lines 2-5 visible (4 visible lines)

    const offsetLine5 = calculateRollingOffset(190, 38);
    expect(offsetLine5.targetOffset).toBe(152); // Rolls 4 lines up
  });

  // TEST 15: Existing wrong-key freeze behavior remains intact.
  it('TEST 15: Existing wrong-key freeze behavior remains intact', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    state = processKeystroke(state, 't', 1000, { stopOnError: true });
    state = processKeystroke(state, 'h', 1300, { stopOnError: true });
    expect(state.accumulatedActiveTimeMs).toBe(300);

    // Wrong key 'x' entered on 'e'
    state = processKeystroke(state, 'x', 1600, { stopOnError: true });
    expect(state.currentIndex).toBe(2);
    expect(state.characters[2].state).toBe('incorrect');
    expect(state.accumulatedActiveTimeMs).toBe(300); // FROZEN

    // Another wrong key
    state = processKeystroke(state, 'z', 2600, { stopOnError: true });
    expect(state.currentIndex).toBe(2);
    expect(state.accumulatedActiveTimeMs).toBe(300); // STILL FROZEN
  });

  // TEST 16: Existing error counting remains intact.
  it('TEST 16: Existing error counting remains intact', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    // Wrong key
    state = processKeystroke(state, 'x', 1000, { stopOnError: true });
    expect(state.incorrectStrokes).toBe(1);
    expect(calculateCurrentMetrics(state).errors).toBe(1);

    // Correct key resolves mistake
    state = processKeystroke(state, 't', 1500, { stopOnError: true });
    expect(state.incorrectStrokes).toBe(1); // Keystroke error count stays 1!
    expect(calculateCurrentMetrics(state).errors).toBe(1); // Error position stays 1!
  });

  // TEST 17: Existing corrected-character behavior remains intact.
  it('TEST 17: Existing corrected-character behavior remains intact', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    state = processKeystroke(state, 'x', 1000, { stopOnError: true });
    state = processKeystroke(state, 't', 1500, { stopOnError: true });

    expect(state.characters[0].state).toBe('corrected');
    expect(state.characters[0].hadMistake).toBe(true);

    const cssPath = path.resolve(__dirname, '../styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // No underline, no border-bottom on corrected characters
    expect(css).toMatch(/\.char-corrected\s*\{[^}]*border-bottom:\s*none;/s);
    expect(css).toMatch(/\.char-corrected\s*\{[^}]*text-decoration:\s*none;/s);
  });
});
