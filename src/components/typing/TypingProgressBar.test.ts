import { describe, it, expect } from 'vitest';
import { calculateProgressPercentage } from './TypingProgressBar';

describe('TypingProgressBar Percentage Calculation', () => {
  describe('Time Mode', () => {
    it('returns 0% progress when idle before test starts', () => {
      const pct = calculateProgressPercentage({
        testType: 'time',
        status: 'idle',
        duration: 60,
        elapsedSeconds: 0,
      });
      expect(pct).toBe(0);
    });

    it('advances percentage proportionately to elapsed active time', () => {
      const pct = calculateProgressPercentage({
        testType: 'time',
        status: 'running',
        duration: 60,
        elapsedSeconds: 30,
      });
      expect(pct).toBe(50);
    });

    it('caps progress at 100% when completed', () => {
      const pct = calculateProgressPercentage({
        testType: 'time',
        status: 'completed',
        duration: 60,
        elapsedSeconds: 60,
      });
      expect(pct).toBe(100);
    });

    it('calculates correctly for 180s (3m) and 300s (5m) durations', () => {
      expect(
        calculateProgressPercentage({
          testType: 'time',
          status: 'running',
          duration: 300,
          elapsedSeconds: 75,
        })
      ).toBe(25);
    });
  });

  describe('Words Mode', () => {
    it('returns 0% when idle with 0 completed words', () => {
      const pct = calculateProgressPercentage({
        testType: 'words',
        status: 'idle',
        duration: 60,
        elapsedSeconds: 0,
        targetProgress: { current: 0, total: 100 },
      });
      expect(pct).toBe(0);
    });

    it('calculates progress accurately for completed words', () => {
      const pct = calculateProgressPercentage({
        testType: 'words',
        status: 'running',
        duration: 60,
        elapsedSeconds: 15,
        targetProgress: { current: 25, total: 100 },
      });
      expect(pct).toBe(25);
    });

    it('shows 100% at finish when word target is reached', () => {
      const pct = calculateProgressPercentage({
        testType: 'words',
        status: 'completed',
        duration: 60,
        elapsedSeconds: 40,
        targetProgress: { current: 100, total: 100 },
      });
      expect(pct).toBe(100);
    });
  });

  describe('Characters Mode', () => {
    it('returns 0% when idle with 0 completed characters', () => {
      const pct = calculateProgressPercentage({
        testType: 'characters',
        status: 'idle',
        duration: 60,
        elapsedSeconds: 0,
        targetProgress: { current: 0, total: 500 },
      });
      expect(pct).toBe(0);
    });

    it('calculates progress accurately for typed characters', () => {
      const pct = calculateProgressPercentage({
        testType: 'characters',
        status: 'running',
        duration: 60,
        elapsedSeconds: 20,
        targetProgress: { current: 250, total: 500 },
      });
      expect(pct).toBe(50);
    });

    it('shows 100% at finish when character target is reached', () => {
      const pct = calculateProgressPercentage({
        testType: 'characters',
        status: 'completed',
        duration: 60,
        elapsedSeconds: 45,
        targetProgress: { current: 500, total: 500 },
      });
      expect(pct).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('handles duration <= 0 gracefully', () => {
      const pct = calculateProgressPercentage({
        testType: 'time',
        status: 'running',
        duration: 0,
        elapsedSeconds: 10,
      });
      expect(pct).toBeCloseTo(16.67, 1);
    });

    it('handles total <= 0 gracefully', () => {
      const pct = calculateProgressPercentage({
        testType: 'words',
        status: 'running',
        duration: 60,
        elapsedSeconds: 10,
        targetProgress: { current: 0, total: 0 },
      });
      expect(pct).toBe(0);
    });
  });
});
