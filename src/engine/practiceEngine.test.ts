import { describe, it, expect } from 'vitest';
import {
  extractMissedWords,
  extractTargetBigrams,
  generateCharacterPractice,
  generateMissedWordsPractice,
  generateBigramPractice,
  generatePracticePlan,
} from './practiceEngine';
import { analyzeTypingResult } from './analytics';
import { createInitialState, processKeystroke, tickTimer } from './typingEngine';
import { Passage } from './types';

const mockPassage: Passage = {
  id: 'test-passage',
  title: 'Test Passage',
  language: 'en',
  difficulty: 'easy',
  text: 'The quick brown fox jumps over the lazy dog.',
};

describe('Practice Engine', () => {
  describe('1. Word Extraction', () => {
    it('extracts missed words from character mistake positions', () => {
      let state = createInitialState(mockPassage, 60);
      // 'The quick brown'
      // Introduce errors in 'quick' (index 4 to 8) and 'brown' (index 10 to 14)
      state = processKeystroke(state, 'T', 1000);
      state = processKeystroke(state, 'h', 1050);
      state = processKeystroke(state, 'e', 1100);
      state = processKeystroke(state, ' ', 1150);
      // 'quick' -> type 'q', 'u', 'i', 'x', 'k' (index 7 error)
      state = processKeystroke(state, 'q', 1200);
      state = processKeystroke(state, 'u', 1250);
      state = processKeystroke(state, 'i', 1300);
      state = processKeystroke(state, 'x', 1350); // error in 'quick'
      state = processKeystroke(state, 'k', 1400);
      state = processKeystroke(state, ' ', 1450);

      const analytics = analyzeTypingResult(state);
      const missed = extractMissedWords(mockPassage.text, analytics.mistakeDetails);

      expect(missed).toContain('quick');
      expect(missed).not.toContain('the');
    });

    it('handles empty mistake set gracefully', () => {
      expect(extractMissedWords(mockPassage.text, [])).toEqual([]);
      expect(extractMissedWords('', [])).toEqual([]);
    });

    it('deduplicates words and prioritizes words with more mistakes', () => {
      const passageText = 'apple banana apple cherry';
      // Mismatches in apple (twice) and banana (once)
      const mistakes = [
        { expected: 'p', typed: 'x', index: 1 }, // in first apple
        { expected: 'a', typed: 'x', index: 6 }, // in banana
        { expected: 'l', typed: 'x', index: 15 }, // in second apple
      ];

      const result = extractMissedWords(passageText, mistakes);
      expect(result).toEqual(['apple', 'banana']);
    });
  });

  describe('2. Bigram Extraction', () => {
    it('extracts relevant bigrams containing target characters', () => {
      const bigrams = extractTargetBigrams(['t', 'h']);
      expect(bigrams).toContain('th');
      expect(bigrams).toContain('he');
      expect(bigrams).toContain('te');
      expect(bigrams).toContain('st');
    });

    it('returns empty array when no target characters are provided', () => {
      expect(extractTargetBigrams([])).toEqual([]);
      expect(extractTargetBigrams([' '])).toEqual([]);
    });
  });

  describe('3. Character Practice Generation', () => {
    it('generates deterministic meaningful words containing target characters', () => {
      const plan = generateCharacterPractice(['r', 't']);

      expect(plan.hasContent).toBe(true);
      expect(plan.type).toBe('characters');
      expect(plan.targetKeys).toContain('R');
      expect(plan.targetKeys).toContain('T');
      expect(plan.practiceText.length).toBeGreaterThan(0);

      // Verify words contain either 'r' or 't'
      const words = plan.practiceText.split(' ');
      expect(words.length).toBeGreaterThanOrEqual(5);
      words.forEach((w) => {
        expect(w.includes('r') || w.includes('t')).toBe(true);
      });
    });

    it('prioritizes words containing multiple target characters', () => {
      const customPool = ['simple', 'water', 'great', 'target', 'zoo'];
      const plan = generateCharacterPractice(['r', 't'], customPool);

      // 'target' contains 2 t's and 1 r (3 matches), 'great' contains 1 r, 1 t (2 matches)
      const firstWord = plan.practiceText.split(' ')[0];
      expect(firstWord).toBe('target');
    });

    it('handles empty mistake set with clear notification', () => {
      const plan = generateCharacterPractice([]);
      expect(plan.hasContent).toBe(false);
      expect(plan.description).toContain('Not enough mistake data');
      expect(plan.practiceText).toBe('');
    });
  });

  describe('4. Missed Words Practice Generation', () => {
    it('creates repetition practice for missed words', () => {
      const missed = ['apple', 'banana'];
      const plan = generateMissedWordsPractice(missed);

      expect(plan.hasContent).toBe(true);
      expect(plan.type).toBe('words');
      expect(plan.targetItems).toEqual(['apple', 'banana']);
      // Should repeat the words in sets
      const words = plan.practiceText.split(' ');
      expect(words.filter((w) => w === 'apple').length).toBe(3);
      expect(words.filter((w) => w === 'banana').length).toBe(3);
    });

    it('handles empty missed words list', () => {
      const plan = generateMissedWordsPractice([]);
      expect(plan.hasContent).toBe(false);
      expect(plan.practiceText).toBe('');
    });
  });

  describe('5. Bigram Practice Generation', () => {
    it('creates practice targeting key transition bigrams', () => {
      const plan = generateBigramPractice(['t', 'h']);

      expect(plan.hasContent).toBe(true);
      expect(plan.type).toBe('bigrams');
      expect(plan.practiceText.length).toBeGreaterThan(0);
      expect(plan.passage.text).toBe(plan.practiceText);
    });

    it('handles empty bigram target characters', () => {
      const plan = generateBigramPractice([]);
      expect(plan.hasContent).toBe(false);
      expect(plan.practiceText).toBe('');
    });
  });

  describe('6. Master generatePracticePlan Integration', () => {
    it('produces valid PracticePlan from completed typing state', () => {
      let state = createInitialState(mockPassage, 60);
      // Introduce mistakes in 't', 'r'
      state = processKeystroke(state, 'x', 1000); // Expected 'T'
      state = processKeystroke(state, 'h', 1100);
      state = processKeystroke(state, 'e', 1200);
      state = processKeystroke(state, ' ', 1300);

      const analytics = analyzeTypingResult(state);

      const charPlan = generatePracticePlan(state, analytics, 'characters');
      expect(charPlan.type).toBe('characters');
      expect(charPlan.hasContent).toBe(true);

      const wordPlan = generatePracticePlan(state, analytics, 'words');
      expect(wordPlan.type).toBe('words');
      expect(wordPlan.hasContent).toBe(true);
      expect(wordPlan.targetItems).toContain('the');

      const bigramPlan = generatePracticePlan(state, analytics, 'bigrams');
      expect(bigramPlan.type).toBe('bigrams');
      expect(bigramPlan.hasContent).toBe(true);
    });

    it('handles zero mistake state without generating garbage text', () => {
      const state = createInitialState(mockPassage, 60);
      const analytics = analyzeTypingResult(state); // 0 mistakes

      const plan = generatePracticePlan(state, analytics, 'characters');
      expect(plan.hasContent).toBe(false);
      expect(plan.practiceText).toBe('');
    });
  });

  describe('7. Practice Session Typing Integration', () => {
    it('allows typing through a generated practice plan using the core engine', () => {
      const plan = generateCharacterPractice(['r']);
      expect(plan.hasContent).toBe(true);

      // Create typing engine state with the practice plan's passage!
      let practiceState = createInitialState(plan.passage, 60);
      expect(practiceState.characters.length).toBe(plan.practiceText.length);

      // Type the first character
      const firstChar = plan.practiceText[0];
      practiceState = processKeystroke(practiceState, firstChar, 1000);
      expect(practiceState.status).toBe('running');
      expect(practiceState.characters[0].state).toBe('correct');

      // Complete session via timer
      practiceState = tickTimer(practiceState, 61000);
      expect(practiceState.status).toBe('completed');
    });

    it('supports restarting practice session with completely clean state', () => {
      const plan = generateCharacterPractice(['r']);
      let practiceState = createInitialState(plan.passage, 60);
      practiceState = processKeystroke(practiceState, plan.practiceText[0], 1000);
      expect(practiceState.status).toBe('running');

      // Restart
      const restarted = createInitialState(plan.passage, 60);
      expect(restarted.status).toBe('idle');
      expect(restarted.currentIndex).toBe(0);
      expect(restarted.characters.every((c) => c.state === 'untyped')).toBe(true);
    });
  });
});
