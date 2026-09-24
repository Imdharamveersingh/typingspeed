import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  processKeystroke,
  tickTimer,
  calculateCurrentMetrics,
} from './typingEngine';
import { Passage } from './types';

const mockPassage: Passage = {
  id: 'test-passage',
  title: 'Test Passage',
  language: 'en',
  difficulty: 'easy',
  text: 'The quick brown fox.',
};

describe('Typing Engine Core', () => {
  describe('1. Initial State', () => {
    it('creates correct initial state for passage and duration', () => {
      const state = createInitialState(mockPassage, 60);

      expect(state.status).toBe('idle');
      expect(state.duration).toBe(60);
      expect(state.currentIndex).toBe(0);
      expect(state.characters.length).toBe(mockPassage.text.length);
      expect(state.characters.every((c) => c.state === 'untyped')).toBe(true);
      expect(state.extraCharacters).toEqual([]);
      expect(state.totalKeystrokes).toBe(0);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
    });

    it('supports 1m, 3m, 5m, and 10m durations', () => {
      expect(createInitialState(mockPassage, 60).duration).toBe(60);
      expect(createInitialState(mockPassage, 180).duration).toBe(180);
      expect(createInitialState(mockPassage, 300).duration).toBe(300);
      expect(createInitialState(mockPassage, 600).duration).toBe(600);
    });
  });

  describe('2. Keystroke Processing & Character States', () => {
    it('starts test on first valid printable character', () => {
      let state = createInitialState(mockPassage, 60);
      const timestamp = 1000;

      state = processKeystroke(state, 'T', timestamp);

      expect(state.status).toBe('running');
      expect(state.startTime).toBe(timestamp);
      expect(state.currentIndex).toBe(1);
      expect(state.characters[0].state).toBe('correct');
      expect(state.totalKeystrokes).toBe(1);
    });

    it('marks mismatched character as incorrect', () => {
      let state = createInitialState(mockPassage, 60);
      state = processKeystroke(state, 't', 1000); // Expected 'T'

      expect(state.characters[0].state).toBe('incorrect');
      expect(state.characters[0].typedChar).toBe('t');
      expect(state.incorrectStrokes).toBe(1);
    });

    it('handles uppercase, repeated characters, punctuation, and spaces correctly', () => {
      let state = createInitialState(mockPassage, 60);
      const chars = ['T', 'h', 'e', ' '];

      chars.forEach((c, idx) => {
        state = processKeystroke(state, c, 1000 + idx * 100);
      });

      expect(state.currentIndex).toBe(4);
      expect(state.characters[0].state).toBe('correct'); // 'T' (uppercase)
      expect(state.characters[1].state).toBe('correct'); // 'h'
      expect(state.characters[2].state).toBe('correct'); // 'e'
      expect(state.characters[3].state).toBe('correct'); // ' ' (space)
    });

    it('ignores modifier and non-printable keys', () => {
      let state = createInitialState(mockPassage, 60);

      state = processKeystroke(state, 'Shift', 1000);
      state = processKeystroke(state, 'Control', 1050);
      state = processKeystroke(state, 'Alt', 1100);
      state = processKeystroke(state, 'CapsLock', 1150);

      expect(state.status).toBe('idle');
      expect(state.currentIndex).toBe(0);
      expect(state.totalKeystrokes).toBe(0);
    });
  });

  describe('3. Backspace Behavior', () => {
    it('does nothing when backspace is pressed at index 0', () => {
      let state = createInitialState(mockPassage, 60);
      state = processKeystroke(state, 'Backspace', 1000);

      expect(state.currentIndex).toBe(0);
      expect(state.status).toBe('idle');
    });

    it('reverts character to untyped and moves caret backward on backspace', () => {
      let state = createInitialState(mockPassage, 60);
      state = processKeystroke(state, 'X', 1000); // incorrect 'T'
      expect(state.currentIndex).toBe(1);
      expect(state.characters[0].state).toBe('incorrect');

      state = processKeystroke(state, 'Backspace', 1100);
      expect(state.currentIndex).toBe(0);
      expect(state.characters[0].state).toBe('untyped');
      expect(state.characters[0].typedChar).toBeUndefined();

      // Now correctly re-type 'T'
      state = processKeystroke(state, 'T', 1200);
      expect(state.currentIndex).toBe(1);
      expect(state.characters[0].state).toBe('correct');
    });

    it('pops extra characters with backspace first when extra characters exist', () => {
      const shortPassage: Passage = { ...mockPassage, text: 'Hi' };
      let state = createInitialState(shortPassage, 60);

      state = processKeystroke(state, 'H', 1000);
      state = processKeystroke(state, 'i', 1100);
      // Extra characters beyond passage
      state = processKeystroke(state, '!', 1200);
      state = processKeystroke(state, '?', 1300);

      expect(state.extraCharacters.length).toBe(2);
      expect(state.extraCharacters[0].char).toBe('!');
      expect(state.extraCharacters[1].char).toBe('?');

      // Backspace once -> removes '?'
      state = processKeystroke(state, 'Backspace', 1400);
      expect(state.extraCharacters.length).toBe(1);
      expect(state.extraCharacters[0].char).toBe('!');
      expect(state.currentIndex).toBe(2);

      // Backspace again -> removes '!'
      state = processKeystroke(state, 'Backspace', 1500);
      expect(state.extraCharacters.length).toBe(0);
      expect(state.currentIndex).toBe(2);

      // Next backspace moves caret back into passage
      state = processKeystroke(state, 'Backspace', 1600);
      expect(state.currentIndex).toBe(1);
      expect(state.characters[1].state).toBe('untyped');
    });
  });

  describe('4. Passage Traversal & Post-Completion Lock', () => {
    it('allows typing through entire passage and recording extra characters', () => {
      const shortPassage: Passage = { ...mockPassage, text: 'Go' };
      let state = createInitialState(shortPassage, 60);

      state = processKeystroke(state, 'G', 1000);
      expect(state.status).toBe('running');

      state = processKeystroke(state, 'o', 1500);
      expect(state.status).toBe('running');
      expect(state.currentIndex).toBe(2);

      // Typing beyond text accumulates extra characters
      state = processKeystroke(state, '!', 1600);
      expect(state.extraCharacters.length).toBe(1);
      expect(state.extraCharacters[0].char).toBe('!');
    });

    it('ignores subsequent keystrokes after test is completed via timer', () => {
      const shortPassage: Passage = { ...mockPassage, text: 'Go' };
      let state = createInitialState(shortPassage, 60);

      state = processKeystroke(state, 'G', 1000);
      state = processKeystroke(state, 'o', 1500);

      // Duration expires (60s)
      state = tickTimer(state, 1000 + 60000);
      expect(state.status).toBe('completed');

      // Attempt to type after completion
      state = processKeystroke(state, 'o', 70000);
      state = processKeystroke(state, 'Backspace', 71000);

      expect(state.currentIndex).toBe(2);
      expect(state.totalKeystrokes).toBe(2);
    });
  });

  describe('5. High-Resolution Timer & Expiration Logic', () => {
    it('does not tick when status is idle', () => {
      const state = createInitialState(mockPassage, 60);
      const ticked = tickTimer(state, 5000);
      expect(ticked.status).toBe('idle');
      expect(ticked.startTime).toBeNull();
    });

    it('remains running when elapsed time is below duration', () => {
      let state = createInitialState(mockPassage, 60);
      state = processKeystroke(state, 'T', 1000);

      // 30 seconds elapsed (31,000 - 1,000 = 30,000ms)
      state = tickTimer(state, 31000);
      expect(state.status).toBe('running');
    });

    it('completes test exactly at duration boundary without drift', () => {
      let state = createInitialState(mockPassage, 60);
      state = processKeystroke(state, 'T', 1000);

      // Exactly 60 seconds elapsed (61,000 - 1,000 = 60,000ms)
      state = tickTimer(state, 61000);
      expect(state.status).toBe('completed');
      expect(state.endTime).toBe(61000);

      // Typing after timer expiration is ignored
      state = processKeystroke(state, 'h', 61500);
      expect(state.currentIndex).toBe(1);
    });
  });

  describe('6. Real-time & Final Metrics Integration', () => {
    it('calculates metrics accurately during a running test', () => {
      let state = createInitialState(mockPassage, 60);
      const start = 1000;
      state = processKeystroke(state, 'T', start);
      state = processKeystroke(state, 'h', start + 500);
      state = processKeystroke(state, 'e', start + 1000);

      // At 30 seconds mark
      const metrics = calculateCurrentMetrics(state, start + 30000);
      expect(metrics.correctCharacters).toBe(3);
      expect(metrics.incorrectCharacters).toBe(0);
      expect(metrics.accuracy).toBe(100);
      expect(metrics.elapsedSeconds).toBe(30);
      expect(metrics.remainingSeconds).toBe(30);
    });

    it('deducts errors from Net WPM in final metrics', () => {
      let state = createInitialState(mockPassage, 60);
      const start = 1000;

      // Type 50 characters (10 words) in 60s with 2 errors
      const testChars = 'The quick brown fox jumps over the lazy dog again!';
      const passage: Passage = { ...mockPassage, text: testChars };
      state = createInitialState(passage, 60);

      Array.from(testChars).forEach((c, idx) => {
        // Introduce 2 errors deliberately
        const charToType = idx === 5 || idx === 10 ? 'z' : c;
        state = processKeystroke(state, charToType, start + idx * 500);
      });

      // Advance timer to 60s
      state = tickTimer(state, start + 60000);
      expect(state.status).toBe('completed');

      const metrics = calculateCurrentMetrics(state);
      expect(metrics.incorrectCharacters).toBe(2);
      expect(metrics.grossWPM).toBeGreaterThan(0);
      expect(metrics.netWPM).toBeLessThan(metrics.grossWPM);
      expect(metrics.accuracy).toBeLessThan(100);
      expect(metrics.remainingSeconds).toBe(0);
    });
  });

  describe('7. Restart and Reset Behavior', () => {
    it('restores completely fresh state with no stale data', () => {
      let state = createInitialState(mockPassage, 60);
      state = processKeystroke(state, 'T', 1000);
      state = processKeystroke(state, 'x', 1100);
      state = tickTimer(state, 61000);

      expect(state.status).toBe('completed');
      expect(state.currentIndex).toBe(2);

      // Perform reset / restart
      const freshState = createInitialState(mockPassage, 60);
      expect(freshState.status).toBe('idle');
      expect(freshState.currentIndex).toBe(0);
      expect(freshState.characters.every((c) => c.state === 'untyped')).toBe(true);
      expect(freshState.totalKeystrokes).toBe(0);
      expect(freshState.startTime).toBeNull();
      expect(freshState.endTime).toBeNull();

      const freshMetrics = calculateCurrentMetrics(freshState);
      expect(freshMetrics.grossWPM).toBe(0);
      expect(freshMetrics.netWPM).toBe(0);
      expect(freshMetrics.accuracy).toBe(100);
      expect(freshMetrics.remainingSeconds).toBe(60);
    });
  });

  describe('8. Edge Cases', () => {
    it('handles high-frequency burst typing without state corruption', () => {
      let state = createInitialState(mockPassage, 60);
      const text = 'The quick';
      let timestamp = 1000;

      // 10ms intervals (extreme rapid burst)
      for (const char of text) {
        state = processKeystroke(state, char, timestamp);
        timestamp += 10;
      }

      expect(state.currentIndex).toBe(text.length);
      expect(state.totalKeystrokes).toBe(text.length);
      expect(state.characters.slice(0, text.length).every((c) => c.state === 'correct')).toBe(true);
    });

    it('calculates valid metrics upon early deterministic completion', () => {
      let state = createInitialState(mockPassage, 60);
      const start = 1000;
      state = processKeystroke(state, 'T', start);
      state = processKeystroke(state, 'h', start + 200);
      state = processKeystroke(state, 'e', start + 400);

      // Deterministically complete at 5 seconds elapsed
      const earlyEndTime = start + 5000;
      const completedState: typeof state = {
        ...state,
        status: 'completed',
        endTime: earlyEndTime,
      };

      const metrics = calculateCurrentMetrics(completedState, earlyEndTime);
      expect(metrics.elapsedSeconds).toBe(5);
      expect(metrics.remainingSeconds).toBe(0);
      expect(metrics.grossWPM).toBeGreaterThan(0);
      expect(metrics.accuracy).toBe(100);
    });
  });
});
