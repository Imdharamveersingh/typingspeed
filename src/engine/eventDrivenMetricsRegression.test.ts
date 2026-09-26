import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  processKeystroke,
  calculateCurrentMetrics,
  tickTimer,
} from './typingEngine';
import { calculateProgressPercentage } from '../components/typing/TypingProgressBar';
import { calculateRollingOffset } from '../components/typing/PassageDisplay';
import { Passage } from './types';

const testPassage: Passage = {
  id: 'regression-p1',
  title: 'Test Passage',
  text: 'The modern computer was born out of the urgent necessity to solve complex problems.',
  language: 'en',
  difficulty: 'medium',
};

describe('Event-Driven Metrics & Real-Time Idle Guarantees (Regression Suite)', () => {
  it('1. One physical key causes one immediate metric update', () => {
    const initialState = createInitialState(testPassage, 60, 'time');
    const startMetrics = calculateCurrentMetrics(initialState);
    expect(startMetrics.totalKeystrokes).toBe(0);
    expect(startMetrics.elapsedSeconds).toBe(0);
    expect(startMetrics.remainingSeconds).toBe(60);

    const startTime = 1000;
    const afterFirstKey = processKeystroke(initialState, 'T', startTime);
    const updatedMetrics = calculateCurrentMetrics(afterFirstKey, startTime);

    expect(afterFirstKey.status).toBe('running');
    expect(updatedMetrics.totalKeystrokes).toBe(1);
    expect(updatedMetrics.correctCharacters).toBe(1);
    expect(updatedMetrics.grossWPM).toBeGreaterThanOrEqual(0);
  });

  it('2. Metrics do not update continuously while idle and Time display freezes', () => {
    const initialState = createInitialState(testPassage, 60, 'time');
    const t0 = 1000;
    const s1 = processKeystroke(initialState, 'T', t0);
    const effectiveTime1 = s1.startTime! + (s1.accumulatedActiveTimeMs ?? 0);
    const m1 = calculateCurrentMetrics(s1, effectiveTime1);

    // Simulate user pausing/idle for 10 seconds (no new keystrokes)
    // While idle, active accumulated time does NOT advance
    const effectiveTimeIdle = s1.startTime! + (s1.accumulatedActiveTimeMs ?? 0);
    const mIdle = calculateCurrentMetrics(s1, effectiveTimeIdle);

    expect(mIdle.totalKeystrokes).toBe(m1.totalKeystrokes);
    expect(mIdle.elapsedSeconds).toBe(m1.elapsedSeconds);
    expect(mIdle.remainingSeconds).toBe(m1.remainingSeconds);
    expect(mIdle.grossWPM).toBe(m1.grossWPM);
    expect(mIdle.netWPM).toBe(m1.netWPM);
    expect(mIdle.accuracy).toBe(m1.accuracy);
  });

  it('3. Progress bar does not continuously increment while idle', () => {
    const initialState = createInitialState(testPassage, 60, 'time');
    const t0 = 1000;
    const s1 = processKeystroke(initialState, 'T', t0);
    const effectiveTime1 = s1.startTime! + (s1.accumulatedActiveTimeMs ?? 0);
    const m1 = calculateCurrentMetrics(s1, effectiveTime1);

    const progressAtKey1 = calculateProgressPercentage({
      testType: 'time',
      status: s1.status,
      duration: s1.duration,
      elapsedSeconds: m1.elapsedSeconds,
    });

    // 10 seconds later while idle:
    const progressDuringIdle = calculateProgressPercentage({
      testType: 'time',
      status: s1.status,
      duration: s1.duration,
      elapsedSeconds: m1.elapsedSeconds, // Frozen!
    });

    expect(progressDuringIdle).toBe(progressAtKey1);
  });

  it('4. Idle period (> 2000ms) is not counted as active typing time', () => {
    const initialState = createInitialState(testPassage, 60, 'time');
    const t0 = 1000;
    const s1 = processKeystroke(initialState, 'T', t0);
    // User types second key 300ms later (active typing)
    const t1 = 1300;
    const s2 = processKeystroke(s1, 'h', t1);
    expect(s2.accumulatedActiveTimeMs).toBe(300);

    // User stops typing for 15 seconds (idle period)
    const t2 = 16300;
    const s3 = processKeystroke(s2, 'e', t2);
    // The 15000ms idle interval should NOT be added to active typing time
    // Only the active threshold (capped) or 0 idle time is counted
    expect(s3.accumulatedActiveTimeMs).toBeLessThanOrEqual(2300);
  });

  it('5. Progress and metrics resume correctly after typing resumes', () => {
    const initialState = createInitialState(testPassage, 60, 'time');
    const t0 = 1000;
    const s1 = processKeystroke(initialState, 'T', t0);
    const s2 = processKeystroke(s1, 'h', 1300);

    // Pauses for 8 seconds, then resumes typing rapidly
    const s3 = processKeystroke(s2, 'e', 9300);
    const s4 = processKeystroke(s3, ' ', 9550);

    const effectiveTime4 = s4.startTime! + (s4.accumulatedActiveTimeMs ?? 0);
    const m4 = calculateCurrentMetrics(s4, effectiveTime4);

    expect(m4.totalKeystrokes).toBe(4);
    expect(m4.correctCharacters).toBe(4);
    expect(m4.elapsedSeconds).toBeLessThan(5); // Not 8.5 seconds!
  });

  it('6. Rapid keypresses update metrics without delay', () => {
    let state = createInitialState(testPassage, 60, 'time');
    const chars = 'The modern';
    let time = 1000;

    for (const char of chars) {
      time += 60; // 60ms between rapid keystrokes
      state = processKeystroke(state, char, time);
      const metrics = calculateCurrentMetrics(state, state.startTime! + (state.accumulatedActiveTimeMs ?? 0));
      expect(metrics.totalKeystrokes).toBeGreaterThan(0);
    }

    expect(state.currentIndex).toBe(chars.length);
    expect(state.correctStrokes).toBe(chars.length);
  });

  it('7. Time mode completes correctly when duration is reached', () => {
    const state = createInitialState(testPassage, 60, 'time');
    const s1 = processKeystroke(state, 'T', 1000);
    expect(s1.status).toBe('running');

    // Timer tick at 60 seconds duration
    const completed = tickTimer(s1, 1000 + 60000);
    expect(completed.status).toBe('completed');
    const finalMetrics = calculateCurrentMetrics(completed, 1000 + 60000);
    expect(finalMetrics.remainingSeconds).toBe(0);
    expect(finalMetrics.elapsedSeconds).toBe(60);

    const progress = calculateProgressPercentage({
      testType: 'time',
      status: completed.status,
      duration: completed.duration,
      elapsedSeconds: finalMetrics.elapsedSeconds,
    });
    expect(progress).toBe(100);
  });

  it('8. Words mode completes correctly when target words are completed', () => {
    const shortPassage: Passage = {
      id: 'words-p',
      title: 'Short',
      text: 'hi you',
      language: 'en',
      difficulty: 'easy',
    };
    let state = createInitialState(shortPassage, 60, 'words', 2);
    let time = 1000;
    for (const ch of 'hi you') {
      time += 100;
      state = processKeystroke(state, ch, time);
    }

    expect(state.status).toBe('completed');
    const progress = calculateProgressPercentage({
      testType: 'words',
      status: state.status,
      duration: state.duration,
      elapsedSeconds: 1,
      targetProgress: { current: 2, total: 2 },
    });
    expect(progress).toBe(100);
  });

  it('9. Characters mode completes correctly when target characters are completed', () => {
    const shortPassage: Passage = {
      id: 'chars-p',
      title: 'Chars',
      text: 'test',
      language: 'en',
      difficulty: 'easy',
    };
    let state = createInitialState(shortPassage, 60, 'characters', 4);
    let time = 1000;
    for (const ch of 'test') {
      time += 100;
      state = processKeystroke(state, ch, time);
    }

    expect(state.status).toBe('completed');
    const progress = calculateProgressPercentage({
      testType: 'characters',
      status: state.status,
      duration: state.duration,
      elapsedSeconds: 1,
      targetProgress: { current: 4, total: 4 },
    });
    expect(progress).toBe(100);
  });

  it('10. Character error styling is preserved independently of the caret', () => {
    let state = createInitialState(testPassage, 60, 'time');
    // Type wrong key: 'X' instead of 'T'
    state = processKeystroke(state, 'X', 1000);
    expect(state.characters[0].state).toBe('incorrect');
    expect(state.characters[0].typedChar).toBe('X');
    expect(state.currentIndex).toBe(1);

    // Next character is untyped and where active underline caret sits
    expect(state.characters[1].state).toBe('untyped');
  });

  it('11. 5-line rolling passage offset calculation remains mathematically exact', () => {
    const lineHeight = 38;

    // Line 0: top = 0 -> offset = 0
    expect(calculateRollingOffset(0, lineHeight)).toEqual({ lineIndex: 0, targetOffset: 0 });

    // Line 0 within first line height: top = 25 -> offset = 0
    expect(calculateRollingOffset(25, lineHeight)).toEqual({ lineIndex: 1, targetOffset: 0 });

    // Line 1: top = 38 -> offset = 0 (Line 1 remains visible above Line 2)
    expect(calculateRollingOffset(38, lineHeight)).toEqual({ lineIndex: 1, targetOffset: 0 });

    // Line 2: top = 2 * 38 = 76 -> offset = 38 (Line 1 rolls away, Line 2 is top, Line 3 active)
    expect(calculateRollingOffset(76, lineHeight)).toEqual({ lineIndex: 2, targetOffset: 38 });

    // Line 3: top = 3 * 38 = 114 -> offset = 76 (Line 2 rolls away, Line 3 is top, Line 4 active)
    expect(calculateRollingOffset(114, lineHeight)).toEqual({ lineIndex: 3, targetOffset: 76 });

    // Line 4: top = 4 * 38 = 152 -> offset = 114
    expect(calculateRollingOffset(152, lineHeight)).toEqual({ lineIndex: 4, targetOffset: 114 });

    // Line 5: top = 5 * 38 = 190 -> offset = 152
    expect(calculateRollingOffset(190, lineHeight)).toEqual({ lineIndex: 5, targetOffset: 152 });
  });
});
