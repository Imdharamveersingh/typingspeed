import { describe, it, expect } from 'vitest';
import {
  cleanWordToken,
  compareGraphemes,
  isControlKey,
  isGraphemePrefix,
  normalizeNFC,
  segmentGraphemes,
} from './textUtils';

describe('textUtils — Unicode & Devanagari Processing', () => {
  describe('segmentGraphemes', () => {
    it('returns empty array for empty or falsy string', () => {
      expect(segmentGraphemes('')).toEqual([]);
    });

    it('segments standard English strings correctly', () => {
      const result = segmentGraphemes('Hello world');
      expect(result).toEqual(['H', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd']);
      expect(result.length).toBe(11);
    });

    it('segments Hindi words with combining matras as single grapheme clusters', () => {
      // 'भारत' -> 'भा', 'र', 'त'
      const bharat = segmentGraphemes('भारत', 'hi');
      expect(bharat).toEqual(['भा', 'र', 'त']);
      expect(bharat.length).toBe(3);

      // 'कि' -> single cluster: consonant 'क' + short i matra 'ि'
      const ki = segmentGraphemes('कि', 'hi');
      expect(ki).toEqual(['कि']);
      expect(ki.length).toBe(1);
    });

    it('segments Hindi conjuncts with virama (halant) accurately', () => {
      // 'नमस्ते' -> 'न', 'म', 'स्ते'
      const namaste = segmentGraphemes('नमस्ते', 'hi');
      expect(namaste).toEqual(['न', 'म', 'स्ते']);
      expect(namaste.length).toBe(3);

      // 'शिक्षा' -> 'शि', 'क्षा'
      const shiksha = segmentGraphemes('शिक्षा', 'hi');
      expect(shiksha).toEqual(['शि', 'क्षा']);
      expect(shiksha.length).toBe(2);

      // 'दिल्ली' -> 'दि', 'ल्ली'
      const delhi = segmentGraphemes('दिल्ली', 'hi');
      expect(delhi).toEqual(['दि', 'ल्ली']);
      expect(delhi.length).toBe(2);
    });

    it('preserves spaces, numbers, and Devanagari punctuation (danda ।)', () => {
      const sentence = 'भारत एक महान देश है।';
      const clusters = segmentGraphemes(sentence, 'hi');
      expect(clusters[clusters.length - 1]).toBe('।');
      expect(clusters.includes(' ')).toBe(true);
    });
  });

  describe('normalizeNFC & compareGraphemes', () => {
    it('handles empty strings gracefully', () => {
      expect(normalizeNFC('')).toBe('');
      expect(compareGraphemes('', '')).toBe(true);
      expect(compareGraphemes('a', '')).toBe(false);
    });

    it('matches identical English characters', () => {
      expect(compareGraphemes('a', 'a')).toBe(true);
      expect(compareGraphemes('A', 'a')).toBe(false);
    });

    it('matches precomposed vs decomposed nukhta characters under NFC', () => {
      // Devanagari Qa: precomposed U+0958 vs decomposed U+0915 (Ka) + U+093C (Nukhta)
      const precomposed = '\u0958';
      const decomposed = '\u0915\u093C';

      expect((precomposed as string) === (decomposed as string)).toBe(false);
      expect(compareGraphemes(precomposed, decomposed)).toBe(true);
    });

    it('matches complex Devanagari combinations under NFC', () => {
      const s1 = 'शांति';
      const s2 = 'शा\u0902ति'; // anusvara
      expect(compareGraphemes(s1, s2)).toBe(true);
    });
  });

  describe('isGraphemePrefix', () => {
    it('detects when a consonant is a prefix of a consonant+matra grapheme', () => {
      expect(isGraphemePrefix('भ', 'भा')).toBe(true);
      expect(isGraphemePrefix('क', 'कि')).toBe(true);
      expect(isGraphemePrefix('श', 'शी')).toBe(true);
    });

    it('returns false for exact matches or non-matching characters', () => {
      expect(isGraphemePrefix('भा', 'भा')).toBe(false); // Exact match is not a strict prefix
      expect(isGraphemePrefix('र', 'भा')).toBe(false);
      expect(isGraphemePrefix('', 'भा')).toBe(false);
    });
  });

  describe('isControlKey', () => {
    it('identifies modifier and navigation keys as control keys', () => {
      expect(isControlKey('Shift')).toBe(true);
      expect(isControlKey('Control')).toBe(true);
      expect(isControlKey('Alt')).toBe(true);
      expect(isControlKey('Meta')).toBe(true);
      expect(isControlKey('CapsLock')).toBe(true);
      expect(isControlKey('ArrowLeft')).toBe(true);
      expect(isControlKey('Process')).toBe(true);
    });

    it('identifies printable Latin and Devanagari characters as non-control keys', () => {
      expect(isControlKey('a')).toBe(false);
      expect(isControlKey(' ')).toBe(false);
      expect(isControlKey('क')).toBe(false);
      expect(isControlKey('भा')).toBe(false);
      expect(isControlKey('।')).toBe(false);
    });
  });

  describe('cleanWordToken', () => {
    it('strips ASCII punctuation from English words', () => {
      expect(cleanWordToken('"hello,"')).toBe('hello');
      expect(cleanWordToken('(world)!')).toBe('world');
    });

    it('strips Devanagari and Unicode punctuation while preserving Devanagari characters', () => {
      expect(cleanWordToken('भारत,')).toBe('भारत');
      expect(cleanWordToken('देश।')).toBe('देश');
      expect(cleanWordToken('«शिक्षा»')).toBe('शिक्षा');
      expect(cleanWordToken('“प्रौद्योगिकी”')).toBe('प्रौद्योगिकी');
    });

    it('handles empty or whitespace tokens cleanly', () => {
      expect(cleanWordToken('')).toBe('');
      expect(cleanWordToken('   ')).toBe('');
      expect(cleanWordToken('.,;')).toBe('');
    });
  });
});
