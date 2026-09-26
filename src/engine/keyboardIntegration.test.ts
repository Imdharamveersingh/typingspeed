import { describe, it, expect } from 'vitest';
import { createInitialState, processKeystroke } from './typingEngine';
import { getKeyboardHighlightState } from './keyboardUtils';
import { DEFAULT_PASSAGE } from '@/data/passages';
import { getDefaultExamProfile } from './examEngine';
import { PASSAGES } from '@/data/passages';
import { generatePracticePlan } from './practiceEngine';
import { analyzeTypingResult } from './analytics';

describe('Keyboard Integration with Typing Engine', () => {
  it('updates next-key highlighting dynamically through an English typing flow', () => {
    let state = createInitialState(DEFAULT_PASSAGE, 60);

    // Initial state
    const char0 = state.characters[0].char;
    let highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
    });
    expect(highlight.expectedDisplayGrapheme).toBe(char0);
    expect(highlight.nextKeyCodes.length).toBeGreaterThan(0);

    // Type the first character correctly
    const now1 = 1000;
    state = processKeystroke(state, char0, now1);
    expect(state.currentIndex).toBe(1);

    // Next key highlight should now point to character 1
    const char1 = state.characters[1].char;
    highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
      recentKey: { code: 'Key' + char0.toUpperCase(), status: 'correct' },
    });
    expect(highlight.expectedDisplayGrapheme).toBe(char1);
    expect(highlight.lastCorrectCode).toBe('Key' + char0.toUpperCase());

    // Type a wrong character
    const wrongKey = char1 === 'x' ? 'y' : 'x';
    const now2 = 1200;
    state = processKeystroke(state, wrongKey, now2);
    expect(state.characters[1].state).toBe('incorrect');
    expect(state.currentIndex).toBe(2);

    // Highlighting advances to character 2
    const char2 = state.characters[2].char;
    highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
      recentKey: { code: 'Key' + wrongKey.toUpperCase(), status: 'incorrect' },
    });
    expect(highlight.expectedDisplayGrapheme).toBe(char2);
    expect(highlight.lastIncorrectCode).toBe('Key' + wrongKey.toUpperCase());

    // Backspace to fix error
    const now3 = 1300;
    state = processKeystroke(state, 'Backspace', now3);
    expect(state.currentIndex).toBe(1);

    // Highlighting points back to character 1
    highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
      recentKey: { code: 'Backspace', status: 'correct' },
    });
    expect(highlight.expectedDisplayGrapheme).toBe(char1);
  });

  it('coordinates InScript multi-keystroke decomposition across engine state', () => {
    // Custom Hindi passage starting with compound grapheme 'भा'
    const hindiCustom = {
      id: 'custom-hi',
      title: 'Test',
      text: 'भारत',
      language: 'hi' as const,
      difficulty: 'easy' as const,
    };
    let state = createInitialState(hindiCustom, 60);

    // Before typing: expected grapheme is 'भा', no composition pending
    let highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'hi',
    });
    expect(highlight.expectedDisplayGrapheme).toBe('भा');
    expect(highlight.nextKeyCodes).toContain('ShiftLeft');
    expect(highlight.nextKeyCodes).toContain('KeyY'); // 'भ' is on Shift+KeyY in InScript

    // Typist enters consonant 'भ'
    state = processKeystroke(state, 'भ', 1000);
    expect(state.characters[0].pendingComposition).toBe('भ');
    expect(state.currentIndex).toBe(0); // Still at index 0 waiting for matra

    // Highlighting dynamically adapts: now highlights matra 'ा' (KeyE)
    highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'hi',
      recentKey: { code: 'KeyY', status: 'correct' },
    });
    expect(highlight.nextKeyCodes).toEqual(['KeyE']);
    expect(highlight.isShiftRequired).toBe(false);

    // Typist enters matra 'ा'
    state = processKeystroke(state, 'ा', 1100);
    expect(state.characters[0].state).toBe('correct');
    expect(state.currentIndex).toBe(1); // Successfully advanced to 'र'

    // Highlighting now points to 'र' (KeyJ)
    highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'hi',
      recentKey: { code: 'KeyE', status: 'correct' },
    });
    expect(highlight.expectedDisplayGrapheme).toBe('र');
    expect(highlight.nextKeyCodes).toEqual(['KeyJ']);
  });

  it('integrates seamlessly with Exam Practice profiles without disrupting rules', () => {
    const profile = getDefaultExamProfile();
    const passage = PASSAGES.find((p) => p.id === profile.passageId) || DEFAULT_PASSAGE;
    const state = createInitialState(passage, profile.duration);

    const highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
    });

    expect(highlight.expectedDisplayGrapheme).toBe(passage.text[0]);
    expect(highlight.nextKeyCodes.length).toBeGreaterThan(0);
  });

  it('highlights targeted practice focus keys from Practice Engine plan', () => {
    // Simulate test state with mistakes on 'e' and 't'
    let state = createInitialState(DEFAULT_PASSAGE, 60);
    state = processKeystroke(state, 'x', 1000); // wrong character
    state = processKeystroke(state, 'y', 1100); // wrong character

    const analytics = analyzeTypingResult(state);
    const plan = generatePracticePlan(state, analytics, 'characters');

    const highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
      focusKeys: plan.targetKeys,
      mistakes: analytics.mostMistypedCharacters,
    });

    // Verify focus keys and mistake frequencies are populated
    expect(highlight.focusKeyCodes.length).toBeGreaterThan(0);
    expect(highlight.mistakeFrequencies.size).toBeGreaterThan(0);
  });

  it('accurately resolves recentKey status for correct, incorrect, and rapid keystrokes without side effects', () => {
    let current = createInitialState(DEFAULT_PASSAGE, 60);
    const text = DEFAULT_PASSAGE.text;

    // 1. Correct key press
    const key0 = text[0];
    const next1 = processKeystroke(current, key0, 1000);
    const status1 = next1.correctStrokes > current.correctStrokes ? 'correct' : 'incorrect';
    expect(status1).toBe('correct');
    expect(next1.correctStrokes).toBe(1);
    expect(next1.incorrectStrokes).toBe(0);
    current = next1;

    // 2. Incorrect key press
    const wrongKey = text[1] === 'z' ? 'q' : 'z';
    const next2 = processKeystroke(current, wrongKey, 1100);
    const status2 = next2.correctStrokes > current.correctStrokes ? 'correct' : 'incorrect';
    expect(status2).toBe('incorrect');
    expect(next2.correctStrokes).toBe(1);
    expect(next2.incorrectStrokes).toBe(1);
    current = next2;

    // 3. Backspace
    const next3 = processKeystroke(current, 'Backspace', 1200);
    expect(next3.currentIndex).toBe(1);
    current = next3;

    // 4. Correct key again after backspace
    const next4 = processKeystroke(current, text[1], 1300);
    const status4 = next4.correctStrokes > current.correctStrokes ? 'correct' : 'incorrect';
    expect(status4).toBe('correct');
    expect(next4.correctStrokes).toBe(2);
    current = next4;

    // 5. Rapid typing simulation (multiple keys in succession)
    for (let i = 2; i < 10; i++) {
      const char = text[i];
      const next = processKeystroke(current, char, 1300 + i * 50);
      const status = next.correctStrokes > current.correctStrokes ? 'correct' : 'incorrect';
      expect(status).toBe('correct');
      current = next;
    }
    expect(current.currentIndex).toBe(10);
    expect(current.correctStrokes).toBe(10);
  });
});
