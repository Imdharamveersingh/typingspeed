import { describe, it, expect } from 'vitest';
import { Passage, TypingState } from '@/engine/types';
import {
  createInitialState,
  processKeystroke,
  calculateCurrentMetrics,
} from '@/engine/typingEngine';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResultCard } from '@/components/typing/ResultCard';

const mockPassage: Passage = {
  id: 'test-corrected-mistakes',
  title: 'Test Passage',
  text: 'The computer test.',
  language: 'en',
  difficulty: 'easy',
};

describe('Corrected Typing Mistake Visual State + Result Legend', () => {
  // 1. First-attempt correct character -> normal correct state
  it('1. First-attempt correct character becomes normal correct state', () => {
    let state = createInitialState(mockPassage, 60);
    state = processKeystroke(state, 'T', 1000);

    expect(state.characters[0].state).toBe('correct');
    expect(state.characters[0].hadMistake).toBeFalsy();
  });

  // 2. Wrong character -> incorrect/red state
  it('2. Wrong character becomes incorrect state and marks hadMistake', () => {
    let state = createInitialState(mockPassage, 60);
    // Expected 'T', user types 'x'
    state = processKeystroke(state, 'x', 1000);

    expect(state.characters[0].state).toBe('incorrect');
    expect(state.characters[0].hadMistake).toBe(true);
  });

  // 3. Wrong -> Backspace -> Correct -> corrected/amber state
  it('3. Wrong -> Backspace -> Correct becomes corrected state', () => {
    let state = createInitialState(mockPassage, 60);
    // User types 'T', 'h' correctly, then 'x' (wrong for 'e')
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'h', 1100);
    state = processKeystroke(state, 'x', 1200);

    expect(state.characters[2].state).toBe('incorrect');
    expect(state.characters[2].hadMistake).toBe(true);

    // User presses Backspace
    state = processKeystroke(state, 'Backspace', 1300);
    expect(state.currentIndex).toBe(2);
    expect(state.characters[2].state).toBe('untyped');
    expect(state.characters[2].hadMistake).toBe(true);

    // User types 'e' (correct)
    state = processKeystroke(state, 'e', 1400);
    expect(state.currentIndex).toBe(3);
    expect(state.characters[2].state).toBe('corrected');
    expect(state.characters[2].hadMistake).toBe(true);

    // First two characters remain normal 'correct'
    expect(state.characters[0].state).toBe('correct');
    expect(state.characters[1].state).toBe('correct');
  });

  // 4. Multiple corrected mistakes -> all corrected positions remain amber
  it('4. Multiple corrected mistakes all remain in corrected state', () => {
    const passage: Passage = {
      id: 'computer-passage',
      title: 'Computer',
      text: 'computer',
      language: 'en',
      difficulty: 'easy',
    };

    let state = createInitialState(passage, 60);
    // User types 'c', 'o', 'm' correctly
    state = processKeystroke(state, 'c', 1000);
    state = processKeystroke(state, 'o', 1100);
    state = processKeystroke(state, 'm', 1200);

    // User types 'x' instead of 'p'
    state = processKeystroke(state, 'x', 1300);
    expect(state.characters[3].state).toBe('incorrect');

    // Backspace and fix x -> p
    state = processKeystroke(state, 'Backspace', 1400);
    state = processKeystroke(state, 'p', 1500);
    expect(state.characters[3].state).toBe('corrected');

    // Continue typing 'u', 't', 'e' correctly
    state = processKeystroke(state, 'u', 1600);
    state = processKeystroke(state, 't', 1700);
    state = processKeystroke(state, 'e', 1800);

    // First corrected position still remains 'corrected'
    expect(state.characters[3].state).toBe('corrected');

    // Another mistake at 'r' (index 7): types 'z'
    state = processKeystroke(state, 'z', 1900);
    expect(state.characters[7].state).toBe('incorrect');

    // Backspace and fix z -> r
    state = processKeystroke(state, 'Backspace', 2000);
    state = processKeystroke(state, 'r', 2100);
    expect(state.characters[7].state).toBe('corrected');

    // Both corrected positions remain 'corrected'
    expect(state.characters[3].state).toBe('corrected');
    expect(state.characters[7].state).toBe('corrected');

    // Uncorrected characters that were never mistyped remain 'correct'
    expect(state.characters[0].state).toBe('correct');
    expect(state.characters[1].state).toBe('correct');
    expect(state.characters[2].state).toBe('correct');
    expect(state.characters[4].state).toBe('correct');
    expect(state.characters[5].state).toBe('correct');
    expect(state.characters[6].state).toBe('correct');
  });

  // 5. Wrong character without correction -> remains red
  it('5. Wrong character without correction remains incorrect (red)', () => {
    let state = createInitialState(mockPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'x', 1100); // wrong for 'h'
    state = processKeystroke(state, 'e', 1200); // continuing without backspacing

    expect(state.characters[1].state).toBe('incorrect');
  });

  // 6. Backspace alone -> does not create amber state
  it('6. Backspace alone does not create amber state', () => {
    let state = createInitialState(mockPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    expect(state.characters[0].state).toBe('correct');

    // User backspaces over 'T'
    state = processKeystroke(state, 'Backspace', 1100);
    expect(state.currentIndex).toBe(0);
    expect(state.characters[0].state).toBe('untyped');
    expect(state.characters[0].state).not.toBe('corrected');

    // User types 'T' again correctly without ever having made a mistake on it
    state = processKeystroke(state, 'T', 1200);
    expect(state.characters[0].state).toBe('correct');
    expect(state.characters[0].state).not.toBe('corrected');
  });

  // 7. Correct character without previous mistake -> never becomes amber
  it('7. Correct character without previous mistake never becomes amber', () => {
    let state = createInitialState(mockPassage, 60);
    const chars = ['T', 'h', 'e', ' '];
    chars.forEach((c, i) => {
      state = processKeystroke(state, c, 1000 + i * 100);
      expect(state.characters[i].state).toBe('correct');
    });
  });

  // 8. Result screen contains the "Corrected" legend
  it('8. Result screen renders the Typing Accuracy Legend with "Corrected" text', () => {
    let state = createInitialState(mockPassage, 60);
    // Type 'T', 'x', backspace, 'h', 'e'
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'x', 1100);
    state = processKeystroke(state, 'Backspace', 1200);
    state = processKeystroke(state, 'h', 1300);
    state = processKeystroke(state, 'e', 1400);

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 1000 + 60000,
    };

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    // Must contain legend box and "Corrected" indicator
    expect(html).toContain('typing-accuracy-legend');
    expect(html).toContain('Typing Accuracy Legend');
    expect(html).toContain('Corrected');
    expect(html).toContain('Incorrect');
    expect(html).toContain('Correct');
    expect(html).toContain('legend-dot-corrected');
    expect(html).toContain('legend-dot-incorrect');
    expect(html).toContain('legend-dot-correct');
  });

  // 9. Existing keyboard heatmap tests continue passing & mistake recording
  it('9. Corrected mistakes count towards keystrokes and analytics seamlessly', () => {
    let state = createInitialState(mockPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'x', 1100);
    state = processKeystroke(state, 'Backspace', 1200);
    state = processKeystroke(state, 'h', 1300);

    const metrics = calculateCurrentMetrics(state, 2000);
    expect(metrics.totalKeystrokes).toBe(3);
    expect(metrics.correctCharacters).toBe(2);
    expect(metrics.incorrectCharacters).toBe(0);
    expect(metrics.uncorrectedErrors).toBe(0);
    expect(metrics.grossWPM).toBeGreaterThan(0);
  });

  // 10. Existing metrics/accuracy tests continue passing
  it('10. Accuracy computation handles corrected characters without NaN or inflation', () => {
    let state = createInitialState(mockPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'h', 1100);
    state = processKeystroke(state, 'x', 1200); // error
    state = processKeystroke(state, 'Backspace', 1300);
    state = processKeystroke(state, 'e', 1400); // corrected

    const metrics = calculateCurrentMetrics(state, 2000);
    expect(metrics.accuracy).toBe(100); // uncorrected errors is 0, all processed characters are now correct
    expect(metrics.correctCharacters).toBe(3);
    expect(state.incorrectStrokes).toBe(1); // raw keystroke mistake was preserved
  });
});
