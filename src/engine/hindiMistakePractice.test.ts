import { describe, it, expect } from 'vitest';
import { createInitialState, processKeystroke, processInputText } from './typingEngine';
import { analyzeTypingResult } from './analytics';
import {
  extractMissedWords,
  generateBigramPractice,
  generateCharacterPractice,
  generateMissedWordsPractice,
  generatePracticePlan,
} from './practiceEngine';
import { Passage } from './types';
import { HINDI_COMMON_BIGRAMS, HINDI_PRACTICE_WORDS } from '@/data/hindiPracticeWords';

const mockHindiPassage: Passage = {
  id: 'hindi-mistake-test',
  title: 'भारत और पर्यावरण',
  language: 'hi',
  difficulty: 'medium',
  text: 'भारत एक महान देश है, जहां प्रकृति का सम्मान होता है।',
};

describe('Hindi Mistake Analysis & Practice Engine Integration', () => {
  describe('1. Hindi Mistake Analysis (analyzeTypingResult)', () => {
    it('isolates Devanagari grapheme mismatches cleanly without broken combining marks', () => {
      let state = createInitialState(mockHindiPassage, 60);

      // Expected 'भारत ', typed 'भरत ' ('भा' typed as 'भ')
      state = processKeystroke(state, 'भ', 1000);
      state = processKeystroke(state, 'र', 1100);
      state = processKeystroke(state, 'त', 1200);
      state = processKeystroke(state, ' ', 1300);

      const analytics = analyzeTypingResult(state);

      expect(analytics.hasMistakes).toBe(true);
      expect(analytics.incorrectCharacters).toBe(1);
      expect(analytics.correctCharacters).toBe(3);

      // Verify most mistyped character: 'भा' (not broken matra 'ा')
      expect(analytics.mostMistypedCharacters.length).toBe(1);
      expect(analytics.mostMistypedCharacters[0].character).toBe('भा');
      expect(analytics.mostMistypedCharacters[0].displayLabel).toBe('भा');
      expect(analytics.mostMistypedCharacters[0].count).toBe(1);

      // Verify mistakeDetails
      expect(analytics.mistakeDetails.length).toBe(1);
      expect(analytics.mistakeDetails[0].expected).toBe('भा');
      expect(analytics.mistakeDetails[0].typed).toBe('भ');
      expect(analytics.mistakeDetails[0].index).toBe(0);
    });

    it('reports zero mistakes for flawless Hindi typing', () => {
      let state = createInitialState(mockHindiPassage, 60);
      state = processInputText(state, 'भारत ', 1000);

      const analytics = analyzeTypingResult(state);
      expect(analytics.hasMistakes).toBe(false);
      expect(analytics.incorrectCharacters).toBe(0);
      expect(analytics.mostMistypedCharacters).toEqual([]);
      expect(analytics.mistakeDetails).toEqual([]);
    });
  });

  describe('2. Hindi Missed Words Extraction', () => {
    it('extracts missed Hindi words accurately using grapheme boundary mapping', () => {
      // 'भारत एक महान देश है, जहां प्रकृति का सम्मान होता है।'
      let state = createInitialState(mockHindiPassage, 60);

      // Mistake in 'भारत' (index 0) and mistake in 'महान' (e.g. index 7 'म')
      // Type 'भरत एक नहान '
      state = processKeystroke(state, 'भ', 1000);
      state = processKeystroke(state, 'र', 1100);
      state = processKeystroke(state, 'त', 1200);
      state = processKeystroke(state, ' ', 1300); // end of 'भारत '

      state = processInputText(state, 'एक ', 1400); // correct 'एक '

      state = processKeystroke(state, 'न', 1500); // incorrect for 'म'
      state = processKeystroke(state, 'हा', 1600);
      state = processKeystroke(state, 'न', 1700);
      state = processKeystroke(state, ' ', 1800); // end of 'महान '

      const analytics = analyzeTypingResult(state);
      const missedWords = extractMissedWords(state.passage.text, analytics.mistakeDetails, 'hi');

      expect(missedWords).toContain('भारत');
      expect(missedWords).toContain('महान');
      expect(missedWords).not.toContain('एक');
    });

    it('strips Devanagari danda and commas from extracted missed words', () => {
      const text = 'सफलता, प्रगति और शांति।';
      // Fake mistake inside 'सफलता' and 'शांति'
      const mistakes = [
        { expected: 'स', typed: 'क', index: 0 },
        { expected: 'ति', typed: 'त', index: 14 },
      ];

      const missed = extractMissedWords(text, mistakes, 'hi');
      expect(missed).toContain('सफलता');
      expect(missed).toContain('शांति');
      // Must not contain trailing comma or danda
      expect(missed).not.toContain('सफलता,');
      expect(missed).not.toContain('शांति।');
    });
  });

  describe('3. Hindi Practice Plan Generation', () => {
    it('generates Hindi Character Practice Plan with Devanagari words', () => {
      const targetChars = ['भा', 'श', 'त'];
      const plan = generateCharacterPractice(targetChars, HINDI_PRACTICE_WORDS, 'hi');

      expect(plan.type).toBe('characters');
      expect(plan.hasContent).toBe(true);
      expect(plan.passage.language).toBe('hi');
      expect(plan.targetKeys).toEqual(['भा', 'श', 'त']);
      expect(plan.practiceText.length).toBeGreaterThan(0);
      expect(plan.title).toContain('विशेष वर्ण अभ्यास');

      // Verify practice words are from Hindi word pool and contain target characters
      const words = plan.practiceText.split(' ');
      expect(words.length).toBeGreaterThanOrEqual(1);
      words.forEach((w) => {
        expect(targetChars.some((c) => w.includes(c))).toBe(true);
      });
    });

    it('generates Hindi Missed Words Practice Plan with 3x repetition', () => {
      const missedWords = ['भारत', 'प्रगति', 'विकास'];
      const plan = generateMissedWordsPractice(missedWords, 'hi');

      expect(plan.type).toBe('words');
      expect(plan.hasContent).toBe(true);
      expect(plan.passage.language).toBe('hi');
      expect(plan.targetItems).toEqual(['भारत', 'प्रगति', 'विकास']);

      // 3 rounds of repetition: 3 words * 3 = 9 words
      const words = plan.practiceText.split(' ');
      expect(words.length).toBe(9);
      expect(words.slice(0, 3)).toEqual(['भारत', 'प्रगति', 'विकास']);
      expect(words.slice(3, 6)).toEqual(['भारत', 'प्रगति', 'विकास']);
      expect(words.slice(6, 9)).toEqual(['भारत', 'प्रगति', 'विकास']);
    });

    it('generates Hindi Bigram Practice Plan with Devanagari transitions', () => {
      const targetChars = ['क', 'र'];
      const plan = generateBigramPractice(targetChars, HINDI_PRACTICE_WORDS, 'hi', HINDI_COMMON_BIGRAMS);

      expect(plan.type).toBe('bigrams');
      expect(plan.hasContent).toBe(true);
      expect(plan.passage.language).toBe('hi');
      expect(plan.practiceText.length).toBeGreaterThan(0);
    });

    it('integrates with master generatePracticePlan for completed Hindi test', () => {
      let state = createInitialState(mockHindiPassage, 60);

      // Make a mistake
      state = processKeystroke(state, 'भ', 1000);
      state = processKeystroke(state, 'र', 1100);
      state = processKeystroke(state, 'त', 1200);
      state = processKeystroke(state, ' ', 1300);

      const analytics = analyzeTypingResult(state);

      // Generate words practice
      const wordPlan = generatePracticePlan(state, analytics, 'words');
      expect(wordPlan.type).toBe('words');
      expect(wordPlan.passage.language).toBe('hi');
      expect(wordPlan.hasContent).toBe(true);

      // Generate characters practice
      const charPlan = generatePracticePlan(state, analytics, 'characters');
      expect(charPlan.type).toBe('characters');
      expect(charPlan.passage.language).toBe('hi');
      expect(charPlan.hasContent).toBe(true);
    });

    it('returns empty fallback plan gracefully when no Hindi mistake occurred', () => {
      let state = createInitialState(mockHindiPassage, 60);
      state = processInputText(state, 'भारत ', 1000);

      const analytics = analyzeTypingResult(state);
      const plan = generatePracticePlan(state, analytics, 'characters');

      expect(plan.hasContent).toBe(false);
      expect(plan.description).toBe('Not enough mistake data for targeted practice yet.');
      expect(plan.passage.language).toBe('hi');
    });
  });
});
