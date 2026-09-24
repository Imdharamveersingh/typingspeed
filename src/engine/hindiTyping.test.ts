import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  processKeystroke,
  processInputText,
  calculateCurrentMetrics,
  tickTimer,
} from './typingEngine';
import { Passage } from './types';
import { DEFAULT_HINDI_PASSAGE, HINDI_PASSAGES } from '@/data/hindiPassages';

const mockHindiPassage: Passage = {
  id: 'hindi-test-01',
  title: 'परीक्षण गद्यांश',
  language: 'hi',
  difficulty: 'easy',
  text: 'भारत एक महान देश है।',
};

describe('Hindi Typing Engine Integration', () => {
  describe('1. Hindi Passages & Initial State', () => {
    it('provides valid curated Hindi passages', () => {
      expect(HINDI_PASSAGES.length).toBeGreaterThanOrEqual(5);
      expect(DEFAULT_HINDI_PASSAGE.language).toBe('hi');
      HINDI_PASSAGES.forEach((p) => {
        expect(p.language).toBe('hi');
        expect(p.text.length).toBeGreaterThan(50);
      });
    });

    it('initializes Hindi typing state with grapheme clusters', () => {
      const state = createInitialState(mockHindiPassage, 60);

      expect(state.status).toBe('idle');
      expect(state.passage.language).toBe('hi');
      expect(state.currentIndex).toBe(0);
      expect(state.characters.every((c) => c.state === 'untyped')).toBe(true);

      // Verify grapheme clusters for 'भारत एक महान देश है।'
      // Expected clusters: ['भा', 'र', 'त', ' ', 'ए', 'क', ' ', 'म', 'हा', 'न', ' ', 'दे', 'श', ' ', 'है', '।']
      const chars = state.characters.map((c) => c.char);
      expect(chars).toEqual([
        'भा', 'र', 'त', ' ',
        'ए', 'क', ' ',
        'म', 'हा', 'न', ' ',
        'दे', 'श', ' ',
        'है', '।'
      ]);
      expect(state.characters.length).toBe(16);
    });
  });

  describe('2. Direct Grapheme Typing (IME / Virtual Keyboard)', () => {
    it('records correct keystroke for Devanagari grapheme cluster', () => {
      let state = createInitialState(mockHindiPassage, 60);
      state = processKeystroke(state, 'भा', 1000);

      expect(state.status).toBe('running');
      expect(state.startTime).toBe(1000);
      expect(state.currentIndex).toBe(1);
      expect(state.characters[0].state).toBe('correct');
      expect(state.characters[0].typedChar).toBe('भा');
      expect(state.correctStrokes).toBe(1);
      expect(state.incorrectStrokes).toBe(0);
    });

    it('records incorrect state when typed grapheme does not match', () => {
      let state = createInitialState(mockHindiPassage, 60);
      state = processKeystroke(state, 'क', 1000); // Expected 'भा'

      expect(state.currentIndex).toBe(1);
      expect(state.characters[0].state).toBe('incorrect');
      expect(state.characters[0].typedChar).toBe('क');
      expect(state.incorrectStrokes).toBe(1);
      expect(state.correctStrokes).toBe(0);
    });

    it('handles typing full words and spaces sequentially', () => {
      let state = createInitialState(mockHindiPassage, 60);
      const graphemes = ['भा', 'र', 'त', ' '];

      graphemes.forEach((g, idx) => {
        state = processKeystroke(state, g, 1000 + idx * 100);
      });

      expect(state.currentIndex).toBe(4);
      expect(state.characters[0].state).toBe('correct');
      expect(state.characters[1].state).toBe('correct');
      expect(state.characters[2].state).toBe('correct');
      expect(state.characters[3].state).toBe('correct'); // Space
    });
  });

  describe('3. InScript Multi-Keystroke Composition (Consonant + Matra)', () => {
    it('holds pending composition when consonant prefix is typed, then completes on matra', () => {
      let state = createInitialState(mockHindiPassage, 60);

      // Expected first character is 'भा' (U+092D U+093E)
      // Step 1: User types base consonant 'भ' (Shift+y on InScript)
      state = processKeystroke(state, 'भ', 1000);

      expect(state.status).toBe('running');
      expect(state.currentIndex).toBe(0); // Caret stays on current character waiting for matra
      expect(state.characters[0].pendingComposition).toBe('भ');
      expect(state.characters[0].state).toBe('untyped');

      // Step 2: User types matra 'ा' ('k' on InScript)
      state = processKeystroke(state, 'ा', 1100);

      expect(state.currentIndex).toBe(1); // Now completes and advances!
      expect(state.characters[0].state).toBe('correct');
      expect(state.characters[0].typedChar).toBe('भा');
      expect(state.characters[0].pendingComposition).toBeUndefined();
    });

    it('resolves pending prefix as incorrect if next keystroke starts the next expected character', () => {
      // Passage: 'भारत' -> ['भा', 'र', 'त']
      let state = createInitialState(mockHindiPassage, 60);

      // User types 'भ' (forgot 'ा')
      state = processKeystroke(state, 'भ', 1000);
      expect(state.currentIndex).toBe(0);

      // User then types 'र' (matches next expected character at index 1)
      state = processKeystroke(state, 'र', 1100);

      // Index 0 should be marked incorrect ('भा' was typed as 'भ')
      expect(state.characters[0].state).toBe('incorrect');
      expect(state.characters[0].typedChar).toBe('भ');

      // Index 1 should be marked correct ('र') and advanced to 2
      expect(state.characters[1].state).toBe('correct');
      expect(state.characters[1].typedChar).toBe('र');
      expect(state.currentIndex).toBe(2);
    });

    it('clears pending composition on Backspace without moving caret backward', () => {
      let state = createInitialState(mockHindiPassage, 60);
      state = processKeystroke(state, 'भ', 1000);
      expect(state.characters[0].pendingComposition).toBe('भ');

      // Press Backspace
      state = processKeystroke(state, 'Backspace', 1050);

      expect(state.currentIndex).toBe(0);
      expect(state.characters[0].pendingComposition).toBeUndefined();
      expect(state.characters[0].state).toBe('untyped');
    });
  });

  describe('4. Batch IME Text Processing (processInputText)', () => {
    it('processes full committed Hindi words from IME composition', () => {
      let state = createInitialState(mockHindiPassage, 60);

      // IME commits 'भारत ' at once
      state = processInputText(state, 'भारत ', 1000);

      expect(state.currentIndex).toBe(4);
      expect(state.characters[0].state).toBe('correct');
      expect(state.characters[1].state).toBe('correct');
      expect(state.characters[2].state).toBe('correct');
      expect(state.characters[3].state).toBe('correct');
      expect(state.totalKeystrokes).toBe(4);
    });

    it('processes sentence with conjuncts and punctuation via processInputText', () => {
      let state = createInitialState(mockHindiPassage, 60);

      state = processInputText(state, 'भारत एक महान देश है।', 1000);

      expect(state.currentIndex).toBe(16);
      expect(state.characters.every((c) => c.state === 'correct')).toBe(true);
    });
  });

  describe('5. Hindi Metrics & Completion', () => {
    it('computes Gross WPM, Net WPM, and Accuracy for Hindi test accurately', () => {
      let state = createInitialState(mockHindiPassage, 60);

      // Type first 15 characters correctly in 30 seconds
      const fullText = 'भारत एक महान देश है।';
      state = processInputText(state, fullText, 1000);

      // Simulate 30 seconds elapsed
      const metrics = calculateCurrentMetrics(state, 1000 + 30000);

      expect(metrics.totalKeystrokes).toBe(16);
      expect(metrics.correctCharacters).toBe(16);
      expect(metrics.incorrectCharacters).toBe(0);
      expect(metrics.accuracy).toBe(100);
      expect(metrics.elapsedSeconds).toBe(30);

      // (16 / 5) / 0.5 minutes = 3.2 / 0.5 = 6.4 -> 6 WPM
      expect(metrics.grossWPM).toBe(6);
      expect(metrics.netWPM).toBe(6);
    });

    it('computes error penalties and reduced accuracy on mistyped Hindi characters', () => {
      let state = createInitialState(mockHindiPassage, 60);

      // Expected 'भारत ', user types 'भरत ' (1 mistake: 'भा' vs 'भ')
      state = processKeystroke(state, 'भ', 1000);
      state = processKeystroke(state, 'र', 1100);
      state = processKeystroke(state, 'त', 1200);
      state = processKeystroke(state, ' ', 1300);

      const metrics = calculateCurrentMetrics(state, 1000 + 60000);

      expect(metrics.totalKeystrokes).toBe(4);
      expect(metrics.correctCharacters).toBe(3);
      expect(metrics.incorrectCharacters).toBe(1);
      expect(metrics.accuracy).toBe(75); // 3 / 4 = 75%
      expect(metrics.uncorrectedErrors).toBe(1);
    });

    it('handles test completion via timer duration', () => {
      let state = createInitialState(mockHindiPassage, 60);
      state = processKeystroke(state, 'भा', 1000);
      expect(state.status).toBe('running');

      // Tick 60s
      state = tickTimer(state, 1000 + 60000);
      expect(state.status).toBe('completed');
      expect(state.endTime).toBe(61000);
    });
  });
});
