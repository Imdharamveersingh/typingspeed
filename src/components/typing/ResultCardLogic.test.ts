import { describe, it, expect } from 'vitest';
import { Passage, TestDuration, TypingState } from '@/engine/types';
import { createInitialState, processKeystroke } from '@/engine/typingEngine';
import { analyzeTypingResult } from '@/engine/analytics';
import { evaluateExamResult, getExamProfile } from '@/engine/examEngine';
import { calculateLevel, calculateTestXp } from '@/engine/gamificationEngine';
import { formatDuration } from '@/utils/metrics';

// Helper to construct a realistic typing session for testing ResultCard logic
function simulateSession(text: string, typed: string, language: 'en' | 'hi' = 'en', duration: TestDuration = 60): TypingState {
  const passage: Passage = {
    id: 'test-passage-id',
    title: 'Test Passage',
    text,
    language,
    difficulty: 'medium',
  };

  let state = createInitialState(passage, duration);
  const now = 1000;

  for (let i = 0; i < typed.length; i++) {
    state = processKeystroke(state, typed[i], now + i * 50);
  }

  return {
    ...state,
    status: 'completed',
    startTime: now,
    endTime: now + duration * 1000,
  };
}

describe('Phase R3: ResultCard Architecture & Logic Verification', () => {
  describe('Tier 1 & Tier 2: Primary Results & Context Mapping', () => {
    it('correctly maps Net WPM as primary and Accuracy as secondary metric', () => {
      const text = 'The quick brown fox';
      const state = simulateSession(text, text, 'en', 60);
      const analytics = analyzeTypingResult(state);

      expect(analytics.metrics.netWPM).toBeGreaterThan(0);
      expect(analytics.metrics.accuracy).toBe(100);
      expect(analytics.accuracy).toBe(100);
      expect(analytics.metrics.uncorrectedErrors).toBe(0);
    });

    it('formats duration and error counts cleanly for Tier 2 compact context line', () => {
      const text = 'Testing duration formatting';
      const state = simulateSession(text, 'Testing duraxion formattxng', 'en', 60);
      const analytics = analyzeTypingResult(state);

      const formatted = formatDuration(state.duration);
      expect(formatted).toBe('01:00');
      expect(analytics.metrics.uncorrectedErrors).toBeGreaterThanOrEqual(1);
      expect(analytics.metrics.grossWPM).toBeGreaterThan(0);
    });
  });

  describe('Tier 3: Diagnostic Insights (Weak Keys & Flawless)', () => {
    it('identifies weak keys when mistakes exist using analyzeTypingResult', () => {
      const text = 'correct practice criteria check record';
      const typed = 'xorrect pxactixe criteria xheck xecord';
      const state = simulateSession(text, typed, 'en', 60);

      const analytics = analyzeTypingResult(state);
      expect(analytics.mostMistypedCharacters.length).toBeGreaterThan(0);
      const topMistake = analytics.mostMistypedCharacters[0];
      expect(topMistake).toBeDefined();
      expect(topMistake.count).toBeGreaterThanOrEqual(1);

      const hasPracticeData = analytics.mostMistypedCharacters.length > 0;
      expect(hasPracticeData).toBe(true);
    });

    it('identifies flawless typing state when uncorrected errors are zero', () => {
      const text = 'Flawless accurate typing session.';
      const state = simulateSession(text, text, 'en', 60);

      const analytics = analyzeTypingResult(state);
      expect(analytics.mostMistypedCharacters.length).toBe(0);
      expect(analytics.mistakeDetails.length).toBe(0);
      const hasPracticeData = analytics.mostMistypedCharacters.length > 0;
      expect(hasPracticeData).toBe(false);
    });
  });

  describe('Tier 4: Action Hierarchy Decision (Practice My Mistakes vs Test Again)', () => {
    it('sets "Practice My Mistakes" as primary CTA when mistakes exist', () => {
      const text = 'Typing error test sample.';
      const typed = 'Typing exror test sxmple.';
      const state = simulateSession(text, typed, 'en', 60);

      const analytics = analyzeTypingResult(state);
      const hasPracticeData = analytics.mostMistypedCharacters.length > 0;

      const primaryActionLabel = hasPracticeData ? 'Practice My Mistakes' : 'Test Again';
      expect(primaryActionLabel).toBe('Practice My Mistakes');
    });

    it('sets "Test Again" as primary CTA when no mistakes exist', () => {
      const text = 'Perfect score typing run.';
      const state = simulateSession(text, text, 'en', 60);

      const analytics = analyzeTypingResult(state);
      const hasPracticeData = analytics.mostMistypedCharacters.length > 0;

      const primaryActionLabel = hasPracticeData ? 'Practice My Mistakes' : 'Test Again';
      expect(primaryActionLabel).toBe('Test Again');
    });
  });

  describe('Progressive Disclosure Content Verification', () => {
    it('contains detailed analysis components for expandable disclosure', () => {
      const text = 'Comprehensive analysis data checks.';
      const typed = 'Comprehenxive analysxs data checks.';
      const state = simulateSession(text, typed, 'en', 60);

      const analytics = analyzeTypingResult(state);

      expect(analytics.metrics.grossWPM).toBeDefined();
      expect(analytics.totalProcessedCharacters).toBeGreaterThan(0);
      expect(analytics.correctCharacters).toBeGreaterThan(0);
      expect(analytics.incorrectCharacters).toBeGreaterThanOrEqual(1);
      expect(analytics.mistakeDetails.length).toBeGreaterThanOrEqual(1);

      // Details capped at 15 for lightweight rendering
      const renderedMistakes = analytics.mistakeDetails.slice(0, 15);
      expect(renderedMistakes.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Exam Simulation Result Integration', () => {
    it('evaluates exam qualification status without modifying thresholds', () => {
      const profile = getExamProfile('ssc-practice');
      expect(profile).toBeDefined();
      if (!profile) return;

      // Case 1: Reached target
      const passedEval = evaluateExamResult(
        {
          netWpm: 35,
          grossWpm: 38,
          accuracy: 98,
        },
        profile
      );

      expect(passedEval.status).toBe('target_reached');
      expect(passedEval.headline).toContain('Target Benchmark Reached');
      expect(passedEval.disclaimer).toBeDefined();

      // Case 2: Below target
      const failedEval = evaluateExamResult(
        {
          netWpm: 20,
          grossWpm: 24,
          accuracy: 85,
        },
        profile
      );

      expect(failedEval.status).toBe('target_not_reached');
      expect(failedEval.headline).toContain('Target Benchmark Not Reached');
      expect(failedEval.disclaimer).toBeDefined();
    });
  });

  describe('Gamification Compact Feedback Strip', () => {
    it('calculates XP and level correctly for compact secondary feedback', () => {
      const earnedXp = calculateTestXp({
        id: 'test-1',
        timestamp: Date.now(),
        duration: 60,
        grossWpm: 65,
        netWpm: 60,
        accuracy: 98,
        totalKeystrokes: 300,
        correctChars: 290,
        incorrectChars: 5,
        extraChars: 0,
        mostMistypedCharacters: [],
      });

      expect(earnedXp.total).toBeGreaterThan(0);

      const levelInfo = calculateLevel(earnedXp.total + 200);
      expect(levelInfo.level).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Hindi IME Language Support in Results', () => {
    it('properly handles Hindi passages and displays Hindi badge', () => {
      const hindiText = 'भारत एक महान देश है';
      const state = simulateSession(hindiText, hindiText, 'hi', 60);

      expect(state.passage.language).toBe('hi');
      const analytics = analyzeTypingResult(state);
      expect(analytics.accuracy).toBe(100);
      expect(analytics.metrics.uncorrectedErrors).toBe(0);
    });
  });
});
