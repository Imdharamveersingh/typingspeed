import { describe, it, expect } from 'vitest';
import {
  generateCharacterPractice,
  generateBigramPractice,
  generateMissedWordsPractice,
} from '@/engine/practiceEngine';
import { COMMON_PRACTICE_WORDS, COMMON_BIGRAMS } from '@/data/practiceWords';
import { HINDI_PRACTICE_WORDS, HINDI_COMMON_BIGRAMS } from '@/data/hindiPracticeWords';
import { aggregateWeakCharacters } from '@/engine/progressAnalytics';
import { TypingHistoryEntry } from '@/engine/progressTypes';

describe('Phase R4: Practice Hub & Smart Practice Architecture', () => {
  describe('1. Empty & Low-Data State Detection', () => {
    it('detects empty state when history contains no attempts', () => {
      const history: TypingHistoryEntry[] = [];
      const weakChars = aggregateWeakCharacters(history, 5);

      expect(history.length).toBe(0);
      expect(weakChars.length).toBe(0);
    });

    it('detects low-data / flawless state when attempts exist but uncorrected mistakes are zero', () => {
      const flawlessHistory: TypingHistoryEntry[] = [
        {
          id: 'attempt-1',
          timestamp: Date.now(),
          duration: 60,
          grossWpm: 75,
          netWpm: 75,
          accuracy: 100,
          totalKeystrokes: 350,
          correctChars: 350,
          incorrectChars: 0,
          extraChars: 0,
          mostMistypedCharacters: [],
        },
      ];

      const weakChars = aggregateWeakCharacters(flawlessHistory, 5);
      expect(flawlessHistory.length).toBeGreaterThan(0);
      expect(weakChars.length).toBe(0);
    });
  });

  describe('2. Recommended Practice Generation (Focus Keys Priority)', () => {
    it('aggregates weak keys from history and generates deterministic Focus Keys drill', () => {
      const historyWithErrors: TypingHistoryEntry[] = [
        {
          id: 'attempt-1',
          timestamp: Date.now() - 10000,
          duration: 60,
          grossWpm: 65,
          netWpm: 58,
          accuracy: 94,
          totalKeystrokes: 300,
          correctChars: 285,
          incorrectChars: 15,
          extraChars: 0,
          mostMistypedCharacters: [
            { character: 'r', displayLabel: 'R', count: 6 },
            { character: 't', displayLabel: 'T', count: 4 },
          ],
        },
        {
          id: 'attempt-2',
          timestamp: Date.now(),
          duration: 60,
          grossWpm: 70,
          netWpm: 64,
          accuracy: 96,
          totalKeystrokes: 320,
          correctChars: 305,
          incorrectChars: 10,
          extraChars: 0,
          mostMistypedCharacters: [
            { character: 'r', displayLabel: 'R', count: 3 },
            { character: 'c', displayLabel: 'C', count: 5 },
          ],
        },
      ];

      const aggregatedWeak = aggregateWeakCharacters(historyWithErrors, 5);
      expect(aggregatedWeak.length).toBe(3);
      // 'r' had 6 + 3 = 9 total mistakes; 'c' had 5; 't' had 4
      expect(aggregatedWeak[0].character).toBe('r');
      expect(aggregatedWeak[0].totalMistakes).toBe(9);

      // Generate Recommended Practice drill
      const targetChars = aggregatedWeak.map((w) => w.character);
      const plan = generateCharacterPractice(targetChars, COMMON_PRACTICE_WORDS, 'en');

      expect(plan.hasContent).toBe(true);
      expect(plan.type).toBe('characters');
      expect(plan.targetKeys).toContain('R');
      expect(plan.practiceText.length).toBeGreaterThan(0);
      expect(plan.passage.text).toBe(plan.practiceText);
    });
  });

  describe('3. Custom Practice Strategies', () => {
    const targetKeys = ['s', 't'];

    it('generates Focus Keys drill for custom targets', () => {
      const plan = generateCharacterPractice(targetKeys, COMMON_PRACTICE_WORDS, 'en');
      expect(plan.type).toBe('characters');
      expect(plan.hasContent).toBe(true);
      expect(plan.targetKeys).toContain('S');
      expect(plan.targetKeys).toContain('T');
    });

    it('generates Targeted Bigrams drill for custom targets', () => {
      const plan = generateBigramPractice(targetKeys, COMMON_PRACTICE_WORDS, 'en', COMMON_BIGRAMS);
      expect(plan.type).toBe('bigrams');
      expect(plan.hasContent).toBe(true);
      expect(plan.targetItems.length).toBeGreaterThan(0);
      // Bigrams like 'st' should be present
      expect(plan.targetItems.some((bg) => bg.includes('s') || bg.includes('t'))).toBe(true);
    });

    it('generates Missed Words repetition drill for custom targets', () => {
      const customWords = ['strength', 'system', 'target'];
      const plan = generateMissedWordsPractice(customWords, 'en');
      expect(plan.type).toBe('words');
      expect(plan.hasContent).toBe(true);
      expect(plan.targetItems).toEqual(customWords);
      // Words repeated 3 times in sets
      const wordCount = plan.practiceText.split(' ').length;
      expect(wordCount).toBe(customWords.length * 3);
    });
  });

  describe('4. Hindi Practice Support', () => {
    it('generates Hindi Focus Keys and Bigram drills without broken graphemes', () => {
      const hindiTargets = ['क', 'र'];
      const charPlan = generateCharacterPractice(hindiTargets, HINDI_PRACTICE_WORDS, 'hi');
      expect(charPlan.hasContent).toBe(true);
      expect(charPlan.passage.language).toBe('hi');
      expect(charPlan.targetKeys).toEqual(['क', 'र']);

      const bigramPlan = generateBigramPractice(
        hindiTargets,
        HINDI_PRACTICE_WORDS,
        'hi',
        HINDI_COMMON_BIGRAMS
      );
      expect(bigramPlan.hasContent).toBe(true);
      expect(bigramPlan.passage.language).toBe('hi');
    });
  });
});
