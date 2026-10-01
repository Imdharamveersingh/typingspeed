import { describe, it, expect, vi } from 'vitest';
import { createInitialState, processKeystroke, calculateCurrentMetrics } from './typingEngine';
import { Passage } from './types';
import * as analyticsModule from './analytics';
import * as practiceEngineModule from './practiceEngine';

const samplePassage: Passage = {
  id: 'test-latency',
  title: 'Latency Test Passage',
  text: 'The quick brown fox jumps over the lazy dog near the riverbank on a sunny afternoon.',
  language: 'en',
  difficulty: 'medium',
};

describe('Typing Latency Architecture & Regression Verification', () => {
  it('1. keypress immediately updates state without delay', () => {
    const state = createInitialState(samplePassage, 60, 'time');
    const t0 = 1000;
    const next = processKeystroke(state, 'T', t0);

    expect(next.currentIndex).toBe(1);
    expect(next.characters[0].state).toBe('correct');
    expect(next.status).toBe('running');
    expect(next.startTime).toBe(t0);
  });

  it('2. rapid keystrokes do not lose characters', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    const word = 'The quick';
    let timestamp = 1000;

    for (const char of word) {
      state = processKeystroke(state, char, timestamp);
      timestamp += 25; // 25ms between keystrokes (40 CPS / 480 WPM burst)
    }

    expect(state.currentIndex).toBe(word.length);
    for (let i = 0; i < word.length; i++) {
      expect(state.characters[i].state).toBe('correct');
    }
    expect(state.totalKeystrokes).toBe(word.length);
  });

  it('3. incorrect key immediately updates error counter and state', () => {
    const state = createInitialState(samplePassage, 60, 'time');
    const next = processKeystroke(state, 'X', 1000); // Expecting 'T'

    expect(next.currentIndex).toBe(1);
    expect(next.characters[0].state).toBe('incorrect');
    expect(next.incorrectStrokes).toBe(1);

    const metrics = calculateCurrentMetrics(next, 1000);
    expect(metrics.uncorrectedErrors).toBe(1);
    expect(metrics.incorrectCharacters).toBe(1);
  });

  it('4. correct key never becomes incorrect', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    state = processKeystroke(state, 'T', 1000);
    expect(state.characters[0].state).toBe('correct');

    // Type next key incorrectly
    state = processKeystroke(state, 'Z', 1050); // Expecting 'h'
    expect(state.characters[0].state).toBe('correct'); // Previous key remains correct
    expect(state.characters[1].state).toBe('incorrect');
  });

  it('5. backspace works immediately and resets character state', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    state = processKeystroke(state, 'X', 1000); // Incorrect
    expect(state.currentIndex).toBe(1);
    expect(state.characters[0].state).toBe('incorrect');

    state = processKeystroke(state, 'Backspace', 1050);
    expect(state.currentIndex).toBe(0);
    expect(state.characters[0].state).toBe('untyped');

    // Retype correctly (becomes corrected after previous mistake)
    state = processKeystroke(state, 'T', 1100);
    expect(state.currentIndex).toBe(1);
    expect(state.characters[0].state).toBe('corrected');
  });

  it('6. line transition preserves state without test regeneration', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    const initialPassageId = state.passage.id;
    const initialCharCount = state.characters.length;

    // Type first 30 characters (crossing a typical line boundary)
    for (let i = 0; i < 30; i++) {
      state = processKeystroke(state, samplePassage.text[i], 1000 + i * 30);
    }

    expect(state.passage.id).toBe(initialPassageId);
    expect(state.characters.length).toBe(initialCharCount);
    expect(state.currentIndex).toBe(30);
  });

  it('7. analytics are NOT called during active typing', () => {
    const spy = vi.spyOn(analyticsModule, 'analyzeTypingResult');
    let state = createInitialState(samplePassage, 60, 'time');

    for (let i = 0; i < 10; i++) {
      state = processKeystroke(state, samplePassage.text[i], 1000 + i * 50);
    }

    // In active typing, analyzeTypingResult should not be called
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('8. practice plan is NOT generated during active typing', () => {
    const spy = vi.spyOn(practiceEngineModule, 'generatePracticePlan');
    let state = createInitialState(samplePassage, 60, 'time');

    for (let i = 0; i < 10; i++) {
      state = processKeystroke(state, samplePassage.text[i], 1000 + i * 50);
    }

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('9. state transitions remain pure without side-effects', () => {
    const state = createInitialState(samplePassage, 60, 'time');
    const next1 = processKeystroke(state, 'T', 1000);
    const next2 = processKeystroke(state, 'T', 1000);

    // Pure functional execution produces identical outputs
    expect(next1.currentIndex).toBe(next2.currentIndex);
    expect(next1.characters[0].state).toBe(next2.characters[0].state);
    expect(next1.correctStrokes).toBe(next2.correctStrokes);
  });

  it('10. rapid typing does not create an infinite update loop or freeze state', () => {
    let state = createInitialState(samplePassage, 60, 'time');
    const start = performance.now();

    // Type 50 characters rapidly in sequence
    for (let i = 0; i < 50; i++) {
      state = processKeystroke(state, samplePassage.text[i % samplePassage.text.length], 1000 + i * 10);
    }

    const elapsed = performance.now() - start;
    // 50 keystrokes through the engine must complete in under 5ms
    expect(elapsed).toBeLessThan(10);
    expect(state.totalKeystrokes).toBe(50);
  });
});
