import { describe, it, expect } from 'vitest';
import { analyzeTypingResult } from './analytics';
import { createInitialState, processKeystroke, tickTimer } from './typingEngine';
import { Passage } from './types';

const testPassage: Passage = {
  id: 'analytics-test',
  title: 'Analytics Test',
  language: 'en',
  difficulty: 'easy',
  text: 'The quick brown fox.',
};

describe('Typing Analytics & Mistake Analysis', () => {
  it('1. Zero errors: reports 100% accuracy and empty mistyped list', () => {
    let state = createInitialState(testPassage, 60);
    const chars = Array.from('The quick');
    chars.forEach((c, idx) => {
      state = processKeystroke(state, c, 1000 + idx * 100);
    });

    const analytics = analyzeTypingResult(state);

    expect(analytics.hasMistakes).toBe(false);
    expect(analytics.incorrectCharacters).toBe(0);
    expect(analytics.extraCharacters).toBe(0);
    expect(analytics.correctCharacters).toBe(chars.length);
    expect(analytics.accuracy).toBe(100);
    expect(analytics.mostMistypedCharacters).toEqual([]);
    expect(analytics.mistakeDetails).toEqual([]);
  });

  it('2. Multiple incorrect characters: tallies distinct mistake frequencies', () => {
    let state = createInitialState(testPassage, 60);
    // Expected: 'T', 'h', 'e', ' '
    // Typed:    'x', 'h', 'z', ' '
    state = processKeystroke(state, 'x', 1000); // Mismatched 'T'
    state = processKeystroke(state, 'h', 1100); // Correct 'h'
    state = processKeystroke(state, 'z', 1200); // Mismatched 'e'
    state = processKeystroke(state, ' ', 1300); // Correct ' '

    const analytics = analyzeTypingResult(state);

    expect(analytics.hasMistakes).toBe(true);
    expect(analytics.correctCharacters).toBe(2);
    expect(analytics.incorrectCharacters).toBe(2);
    expect(analytics.mostMistypedCharacters.length).toBe(2);

    const labels = analytics.mostMistypedCharacters.map((m) => m.displayLabel);
    expect(labels).toContain('T');
    expect(labels).toContain('e');
  });

  it('3. Repeated incorrect character: correctly aggregates count frequency', () => {
    // Passage with repeated characters: 'banana'
    const bananaPassage: Passage = {
      id: 'banana',
      title: 'Banana',
      language: 'en',
      difficulty: 'easy',
      text: 'banana',
    };
    let state = createInitialState(bananaPassage, 60);

    // Expected: b, a, n, a, n, a
    // Typed:    b, x, n, x, n, x  -> 'a' missed 3 times
    state = processKeystroke(state, 'b', 1000);
    state = processKeystroke(state, 'x', 1100); // missed 'a' (1)
    state = processKeystroke(state, 'n', 1200);
    state = processKeystroke(state, 'x', 1300); // missed 'a' (2)
    state = processKeystroke(state, 'n', 1400);
    state = processKeystroke(state, 'x', 1500); // missed 'a' (3)

    const analytics = analyzeTypingResult(state);

    expect(analytics.incorrectCharacters).toBe(3);
    expect(analytics.mostMistypedCharacters.length).toBe(1);
    expect(analytics.mostMistypedCharacters[0].displayLabel).toBe('a');
    expect(analytics.mostMistypedCharacters[0].count).toBe(3);
  });

  it('4. Incorrect spaces: labels space mistakes clearly as Space', () => {
    let state = createInitialState(testPassage, 60);
    // 'The '
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'h', 1100);
    state = processKeystroke(state, 'e', 1200);
    state = processKeystroke(state, 'x', 1300); // Typed 'x' instead of Space

    const analytics = analyzeTypingResult(state);

    expect(analytics.incorrectCharacters).toBe(1);
    expect(analytics.mostMistypedCharacters[0].displayLabel).toBe('Space');
    expect(analytics.mostMistypedCharacters[0].count).toBe(1);
  });

  it('5. Extra characters: counts and categorizes extra keystrokes beyond text', () => {
    const short: Passage = { ...testPassage, text: 'Hi' };
    let state = createInitialState(short, 60);
    state = processKeystroke(state, 'H', 1000);
    state = processKeystroke(state, 'i', 1100);
    state = processKeystroke(state, '!', 1200); // extra character

    const analytics = analyzeTypingResult(state);

    expect(analytics.correctCharacters).toBe(2);
    expect(analytics.extraCharacters).toBe(1);
    expect(analytics.hasMistakes).toBe(true);
    expect(analytics.mostMistypedCharacters[0].displayLabel).toBe("Extra '!'");
  });

  it('6. Correct/incorrect totals and accuracy calculation integration', () => {
    let state = createInitialState(testPassage, 60);
    // 8 correct, 2 incorrect -> 10 total -> 80% accuracy
    const word = 'The quick ';
    Array.from(word).forEach((c, idx) => {
      const charToType = idx === 1 || idx === 4 ? '?' : c;
      state = processKeystroke(state, charToType, 1000 + idx * 100);
    });

    const analytics = analyzeTypingResult(state);

    expect(analytics.correctCharacters).toBe(8);
    expect(analytics.incorrectCharacters).toBe(2);
    expect(analytics.totalProcessedCharacters).toBe(10);
    expect(analytics.accuracy).toBe(80);
  });

  it('7. Empty / Edge cases: idle state with zero keystrokes', () => {
    const state = createInitialState(testPassage, 60);
    const analytics = analyzeTypingResult(state);

    expect(analytics.totalProcessedCharacters).toBe(0);
    expect(analytics.correctCharacters).toBe(0);
    expect(analytics.incorrectCharacters).toBe(0);
    expect(analytics.accuracy).toBe(100);
    expect(analytics.hasMistakes).toBe(false);
    expect(analytics.mostMistypedCharacters).toEqual([]);
    expect(analytics.mistakeDetails).toEqual([]);
  });

  it('8. Consistency with core typing engine state after timer completion', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'h', 1100);
    state = processKeystroke(state, 'x', 1200); // incorrect
    state = tickTimer(state, 1000 + 60000); // test completes

    const analytics = analyzeTypingResult(state);

    expect(analytics.metrics.grossWPM).toBeGreaterThan(0);
    expect(analytics.metrics.netWPM).toBeLessThanOrEqual(analytics.metrics.grossWPM);
    expect(analytics.testDuration).toBe(60);
    expect(analytics.hasMistakes).toBe(true);
    expect(analytics.incorrectCharacters).toBe(1);
    expect(analytics.mistakeDetails[0].expected).toBe('e');
    expect(analytics.mistakeDetails[0].typed).toBe('x');
  });
});
