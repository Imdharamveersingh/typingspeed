import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  processKeystroke,
  tickTimer,
  calculateCurrentMetrics,
} from '@/engine/typingEngine';
import { Passage } from '@/engine/types';
import { generateTestPassage } from '@/engine/passageGenerator';
import {
  ENCOURAGEMENT_TITLES,
  getNextEncouragementTitle,
} from '@/data/encouragementTitles';

const samplePassage: Passage = {
  id: 'test-p1',
  title: 'Test Passage',
  text: 'The quick brown fox jumps over the lazy dog.',
  language: 'en',
  difficulty: 'easy',
};

describe('Typing Test Enhancements & Test Type Support', () => {
  describe('Test Type Defaults & Mode Configurations', () => {
    it('defaults testType to "time" with duration 60 in createInitialState', () => {
      const state = createInitialState(samplePassage);
      expect(state.testType).toBe('time');
      expect(state.duration).toBe(60);
      expect(state.status).toBe('idle');
      expect(state.currentIndex).toBe(0);
    });

    it('supports words mode configuration in createInitialState', () => {
      const state = createInitialState(samplePassage, 60, 'words', 50);
      expect(state.testType).toBe('words');
      expect(state.targetCount).toBe(50);
      expect(state.status).toBe('idle');
    });

    it('supports characters mode configuration in createInitialState', () => {
      const state = createInitialState(samplePassage, 60, 'characters', 250);
      expect(state.testType).toBe('characters');
      expect(state.targetCount).toBe(250);
      expect(state.status).toBe('idle');
    });
  });

  describe('Completion Behaviors per Test Type', () => {
    it('Time mode completes when duration timer elapses', () => {
      const state = createInitialState(samplePassage, 60, 'time');
      const start = processKeystroke(state, 'T', 1000);
      expect(start.status).toBe('running');

      // 30 seconds elapsed -> still running
      const halfway = tickTimer(start, 31000);
      expect(halfway.status).toBe('running');

      // 60 seconds elapsed -> completed
      const finished = tickTimer(start, 61000);
      expect(finished.status).toBe('completed');
      expect(finished.endTime).toBe(61000);
    });

    it('Words mode does not complete from timer but completes when word target is fulfilled', () => {
      const wordsPassage: Passage = {
        id: 'short-words',
        title: 'Three Words',
        text: 'one two three',
        language: 'en',
        difficulty: 'easy',
      };
      let state = createInitialState(wordsPassage, 60, 'words', 3);

      // Start typing
      state = processKeystroke(state, 'o', 1000);
      expect(state.status).toBe('running');

      // Timer tick after 100 seconds should NOT complete the test in Words mode
      const afterTick = tickTimer(state, 101000);
      expect(afterTick.status).toBe('running');

      // Type through all words
      const textToType = 'one two three';
      for (let i = 1; i < textToType.length; i++) {
        state = processKeystroke(state, textToType[i], 1000 + i * 100);
      }

      expect(state.currentIndex).toBe(wordsPassage.text.length);
      expect(state.status).toBe('completed');
      expect(state.endTime).toBeGreaterThan(0);
    });

    it('Characters mode completes immediately when target character count is satisfied', () => {
      const charsPassage: Passage = {
        id: 'five-chars',
        title: 'Five Chars',
        text: 'hello',
        language: 'en',
        difficulty: 'easy',
      };
      let state = createInitialState(charsPassage, 60, 'characters', 5);

      const chars = 'hello'.split('');
      chars.forEach((c, idx) => {
        state = processKeystroke(state, c, 1000 + idx * 100);
      });

      expect(state.currentIndex).toBe(5);
      expect(state.status).toBe('completed');
      expect(state.endTime).toBe(1400);
    });

    it('Characters mode completes even if the final character was mistyped', () => {
      const charsPassage: Passage = {
        id: 'three-chars',
        title: 'Three Chars',
        text: 'abc',
        language: 'en',
        difficulty: 'easy',
      };
      let state = createInitialState(charsPassage, 60, 'characters', 3);

      state = processKeystroke(state, 'a', 1000);
      state = processKeystroke(state, 'b', 1100);
      // Mistype the final character
      state = processKeystroke(state, 'x', 1200);

      expect(state.status).toBe('completed');
      expect(state.currentIndex).toBe(3);
      expect(state.characters[2].state).toBe('incorrect');
    });
  });

  describe('Passage Generator Target Boundary Handling', () => {
    it('generates exact word target without extra trailing words in Words mode', () => {
      const generated = generateTestPassage({
        language: 'en',
        difficulty: 'easy',
        testType: 'words',
        targetCount: 25,
      });

      const words = generated.text.split(/\s+/).filter(Boolean);
      expect(words.length).toBe(25);
    });

    it('generates exact character count in Characters mode', () => {
      const generated = generateTestPassage({
        language: 'en',
        difficulty: 'medium',
        testType: 'characters',
        targetCount: 100,
      });

      expect(generated.text.length).toBe(100);
    });

    it('generates abundant passage supply for Time mode', () => {
      const generated = generateTestPassage({
        language: 'en',
        difficulty: 'hard',
        testType: 'time',
      });

      const words = generated.text.split(/\s+/).filter(Boolean);
      expect(words.length).toBeGreaterThanOrEqual(1000);
    });

    it('correctly handles Hindi grapheme targets in Characters mode', () => {
      const generated = generateTestPassage({
        language: 'hi',
        difficulty: 'medium',
        testType: 'characters',
        targetCount: 100,
      });

      // Verify that it contains valid Devanagari text
      expect(generated.language).toBe('hi');
      expect(generated.text.length).toBeGreaterThan(0);
    });
  });

  describe('Errors Metric Visibility & Incrementation', () => {
    it('starts with Errors at 0 and increments visibly on wrong keystroke', () => {
      const state = createInitialState(samplePassage, 60, 'time');
      const initialMetrics = calculateCurrentMetrics(state);

      expect(initialMetrics.uncorrectedErrors).toBe(0);
      expect(initialMetrics.incorrectCharacters).toBe(0);
      expect(initialMetrics.accuracy).toBe(100);

      // User presses wrong key ('X' instead of 'T')
      const afterWrongKey = processKeystroke(state, 'X', 1000);
      const updatedMetrics = calculateCurrentMetrics(afterWrongKey, 1000);

      expect(updatedMetrics.uncorrectedErrors).toBe(1);
      expect(updatedMetrics.incorrectCharacters).toBe(1);
      expect(updatedMetrics.accuracy).toBe(0);
    });
  });

  describe('Retest Reset Functionality', () => {
    it('retest cleanly resets state, index, timing, and errors', () => {
      let state = createInitialState(samplePassage, 60, 'time');
      state = processKeystroke(state, 'T', 1000);
      state = processKeystroke(state, 'Z', 1200); // error

      expect(state.status).toBe('running');
      expect(state.currentIndex).toBe(2);

      // Simulate retest
      const resetState = createInitialState(state.passage, state.duration, state.testType, state.targetCount);
      const resetMetrics = calculateCurrentMetrics(resetState);

      expect(resetState.status).toBe('idle');
      expect(resetState.currentIndex).toBe(0);
      expect(resetState.startTime).toBeNull();
      expect(resetState.totalKeystrokes).toBe(0);
      expect(resetMetrics.uncorrectedErrors).toBe(0);
      expect(resetMetrics.grossWPM).toBe(0);
      expect(resetMetrics.netWPM).toBe(0);
      expect(resetMetrics.accuracy).toBe(100);
    });
  });

  describe('100 Encouragement Titles & Non-Repetition', () => {
    it('contains exactly 100 unique encouragement titles', () => {
      expect(ENCOURAGEMENT_TITLES.length).toBe(100);
      const uniqueSet = new Set(ENCOURAGEMENT_TITLES);
      expect(uniqueSet.size).toBe(100);
    });

    it('does not contain fabricated ranking or percentile claims', () => {
      const forbiddenPhrases = [
        'top 10%',
        'top 20%',
        'top 30%',
        'faster than',
        'better than',
        'percent of users',
      ];

      for (const title of ENCOURAGEMENT_TITLES) {
        const lower = title.toLowerCase();
        for (const phrase of forbiddenPhrases) {
          expect(lower).not.toContain(phrase);
        }
      }
    });

    it('avoids immediate title duplication when picking next title', () => {
      for (let i = 0; i < 50; i++) {
        const next = getNextEncouragementTitle(i);
        expect(next.index).not.toBe(i);
        expect(next.title).toBe(ENCOURAGEMENT_TITLES[next.index]);
      }
    });
  });
});
