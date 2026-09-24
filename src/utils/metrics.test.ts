import { describe, it, expect } from 'vitest';
import {
  calculateGrossWPM,
  calculateNetWPM,
  calculateAccuracy,
  formatDuration,
} from './metrics';

describe('Typing Metrics Utility', () => {
  describe('calculateGrossWPM', () => {
    it('returns 0 when seconds or keystrokes are 0', () => {
      expect(calculateGrossWPM(0, 60)).toBe(0);
      expect(calculateGrossWPM(200, 0)).toBe(0);
    });

    it('accurately calculates 60 WPM for 300 keystrokes in 60 seconds', () => {
      // 300 strokes / 5 = 60 words. 60 words / 1 minute = 60 WPM.
      expect(calculateGrossWPM(300, 60)).toBe(60);
    });

    it('calculates gross WPM correctly for 30 seconds', () => {
      // 150 strokes in 30s -> (150/5) / 0.5 = 60 WPM.
      expect(calculateGrossWPM(150, 30)).toBe(60);
    });
  });

  describe('calculateNetWPM', () => {
    it('deducts errors from gross WPM', () => {
      // 300 strokes in 60s = 60 gross. 5 errors in 1 min = 5 penalty -> 55 net WPM.
      expect(calculateNetWPM(300, 5, 60)).toBe(55);
    });

    it('clamps net WPM to 0 when penalty exceeds gross speed', () => {
      expect(calculateNetWPM(100, 50, 60)).toBe(0);
    });
  });

  describe('calculateAccuracy', () => {
    it('returns 100% when total characters is 0', () => {
      expect(calculateAccuracy(0, 0)).toBe(100);
    });

    it('calculates exact accuracy percentage', () => {
      expect(calculateAccuracy(95, 100)).toBe(95);
      expect(calculateAccuracy(99, 100)).toBe(99);
      expect(calculateAccuracy(0, 50)).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('formats seconds into MM:SS correctly', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(9)).toBe('00:09');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(600)).toBe('10:00');
    });
  });
});
