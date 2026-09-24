import { describe, it, expect } from 'vitest';
import {
  evaluateExamResult,
  getAllExamProfiles,
  getDefaultExamProfile,
  getExamProfile,
} from './examEngine';
import { ExamProfile } from './examTypes';
import { TypingHistoryEntry } from './progressTypes';

describe('Exam Engine', () => {
  describe('Profile Discovery & Retrieval', () => {
    it('provides valid default exam profile (SSC Practice)', () => {
      const def = getDefaultExamProfile();
      expect(def).toBeDefined();
      expect(def.id).toBe('ssc-practice');
      expect(def.targetValue).toBe(35);
      expect(def.duration).toBe(600);
      expect(def.simulationDisclaimer).toContain('Practice simulation');
    });

    it('returns all enabled exam profiles', () => {
      const profiles = getAllExamProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(3);
      expect(profiles.some((p) => p.id === 'ssc-practice')).toBe(true);
      expect(profiles.some((p) => p.id === 'rrb-practice')).toBe(true);
      expect(profiles.some((p) => p.id === 'cpct-practice')).toBe(true);
    });

    it('retrieves profile by ID correctly', () => {
      const rrb = getExamProfile('rrb-practice');
      expect(rrb).toBeDefined();
      expect(rrb?.name).toContain('RRB');
      expect(rrb?.targetValue).toBe(30);

      const unknown = getExamProfile('unknown-id');
      expect(unknown).toBeUndefined();
    });

    it('ensures all profiles contain required configuration attributes', () => {
      const profiles = getAllExamProfiles();
      for (const p of profiles) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.shortName).toBeTruthy();
        expect(p.duration).toBeGreaterThanOrEqual(60);
        expect(p.targetValue).toBeGreaterThan(0);
        expect(p.instructions.length).toBeGreaterThanOrEqual(2);
        expect(p.simulationDisclaimer).toBeTruthy();
        expect(p.passageId).toBeTruthy();
        expect(p.language).toBe('en');
      }
    });
  });

  describe('Evaluation: Speed and Accuracy (SSC Practice)', () => {
    const sscProfile = getExamProfile('ssc-practice')!;

    it('evaluates target reached when speed and accuracy meet benchmarks', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 40, grossWpm: 42, accuracy: 96 },
        sscProfile
      );

      expect(evalResult.status).toBe('target_reached');
      expect(evalResult.isQualified).toBe(true);
      expect(evalResult.actualNetWpm).toBe(40);
      expect(evalResult.targetWpm).toBe(35);
      expect(evalResult.accuracy).toBe(96);
      expect(evalResult.headline).toBe('Target Benchmark Reached');
      expect(evalResult.disclaimer).toBe(sscProfile.simulationDisclaimer);
    });

    it('evaluates target reached on exact threshold boundaries', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 35, grossWpm: 36, accuracy: 95 },
        sscProfile
      );

      expect(evalResult.status).toBe('target_reached');
      expect(evalResult.isQualified).toBe(true);
    });

    it('evaluates target not reached when speed is below target benchmark', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 32, grossWpm: 33, accuracy: 97 },
        sscProfile
      );

      expect(evalResult.status).toBe('target_not_reached');
      expect(evalResult.isQualified).toBe(false);
      expect(evalResult.headline).toBe('Target Benchmark Not Reached');
      expect(evalResult.message).toContain('Speed fell below target');
    });

    it('evaluates target not reached when accuracy is below minimum benchmark', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 45, grossWpm: 50, accuracy: 92 },
        sscProfile
      );

      expect(evalResult.status).toBe('target_not_reached');
      expect(evalResult.isQualified).toBe(false);
      expect(evalResult.message).toContain('accuracy was below threshold');
    });

    it('evaluates target not reached when both speed and accuracy are below benchmarks', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 25, grossWpm: 30, accuracy: 88 },
        sscProfile
      );

      expect(evalResult.status).toBe('target_not_reached');
      expect(evalResult.isQualified).toBe(false);
      expect(evalResult.message).toContain('Both speed');
    });
  });

  describe('Evaluation: Speed-Only Evaluation Type', () => {
    const speedOnlyProfile: ExamProfile = {
      id: 'custom-speed-test',
      name: 'Custom Speed Test',
      shortName: 'SpeedTest',
      description: 'Speed test only',
      language: 'en',
      duration: 300,
      targetMetric: 'netWpm',
      targetValue: 40,
      evaluationType: 'speed_only',
      instructions: ['Type fast.'],
      passageId: 'tech-history-01',
      simulationDisclaimer: 'Test disclaimer',
      enabled: true,
    };

    it('qualifies on speed alone regardless of lower accuracy', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 45, grossWpm: 50, accuracy: 85 },
        speedOnlyProfile
      );

      expect(evalResult.status).toBe('target_reached');
      expect(evalResult.isQualified).toBe(true);
      expect(evalResult.headline).toBe('Target Speed Reached');
    });

    it('fails when speed is below target', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 35, grossWpm: 36, accuracy: 100 },
        speedOnlyProfile
      );

      expect(evalResult.status).toBe('target_not_reached');
      expect(evalResult.isQualified).toBe(false);
      expect(evalResult.headline).toBe('Below Target Speed');
    });
  });

  describe('Evaluation: Informational Evaluation Type', () => {
    const infoProfile: ExamProfile = {
      id: 'custom-info-test',
      name: 'Custom Informational Test',
      shortName: 'InfoTest',
      description: 'Informational simulation',
      language: 'en',
      duration: 300,
      targetMetric: 'netWpm',
      targetValue: 30,
      evaluationType: 'informational',
      instructions: ['Practice freely.'],
      passageId: 'tech-history-01',
      simulationDisclaimer: 'Informational disclaimer',
      enabled: true,
    };

    it('returns informational status without pass/fail judgment', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 20, grossWpm: 22, accuracy: 80 },
        infoProfile
      );

      expect(evalResult.status).toBe('informational');
      expect(evalResult.headline).toBe('Practice Session Recorded');
      expect(evalResult.message).toContain('Completed practice test at 20 Net WPM');
      expect(evalResult.disclaimer).toBe('Informational disclaimer');
    });
  });

  describe('Edge Cases', () => {
    const ssc = getExamProfile('ssc-practice')!;

    it('handles zero speed and zero accuracy cleanly', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 0, grossWpm: 0, accuracy: 0 },
        ssc
      );

      expect(evalResult.status).toBe('target_not_reached');
      expect(evalResult.actualNetWpm).toBe(0);
      expect(evalResult.accuracy).toBe(0);
    });

    it('handles rounding of fractional metrics accurately', () => {
      const evalResult = evaluateExamResult(
        { netWpm: 34.8, grossWpm: 36.2, accuracy: 94.9 },
        ssc
      );

      expect(evalResult.actualNetWpm).toBe(35);
      expect(evalResult.accuracy).toBe(95);
      expect(evalResult.status).toBe('target_reached');
    });
  });

  describe('Progress & History Integration', () => {
    it('supports backward-compatible loading of entries without testMode', () => {
      // Represents historical entry from Phase 5 without testMode or examProfileId
      const legacyEntry: TypingHistoryEntry = {
        id: 'legacy-1',
        timestamp: Date.now() - 10000,
        duration: 60,
        grossWpm: 45,
        netWpm: 42,
        accuracy: 96,
        totalKeystrokes: 220,
        correctChars: 215,
        incorrectChars: 2,
        extraChars: 0,
        mostMistypedCharacters: [],
      };

      // Represents new Phase 7 entry with testMode: 'exam'
      const examEntry: TypingHistoryEntry = {
        id: 'exam-1',
        timestamp: Date.now(),
        duration: 600,
        grossWpm: 40,
        netWpm: 38,
        accuracy: 97,
        totalKeystrokes: 1800,
        correctChars: 1750,
        incorrectChars: 10,
        extraChars: 0,
        mostMistypedCharacters: [],
        testMode: 'exam',
        examProfileId: 'ssc-practice',
      };

      const entries = [examEntry, legacyEntry];
      expect(entries).toHaveLength(2);
      expect(entries[0].testMode).toBe('exam');
      expect(entries[0].examProfileId).toBe('ssc-practice');
      expect(entries[1].testMode).toBeUndefined();
    });
  });

  describe('Gamification Integration with Exam Practice', () => {
    it('awards deterministic XP for an exam practice attempt', async () => {
      const { calculateTestXp, calculateDailyGoal } = await import('./gamificationEngine');

      const examEntry: TypingHistoryEntry = {
        id: 'exam-gamification-1',
        timestamp: new Date(2026, 4, 15, 12, 0).getTime(),
        duration: 600,
        grossWpm: 42,
        netWpm: 40, // 40 WPM gives +5 speed bonus
        accuracy: 98, // 98% gives +10 accuracy bonus
        totalKeystrokes: 2000,
        correctChars: 1950,
        incorrectChars: 10,
        extraChars: 0,
        mostMistypedCharacters: [],
        testMode: 'exam',
        examProfileId: 'ssc-practice',
      };

      const xp = calculateTestXp(examEntry);
      // Base 10 + Acc 10 + Speed 5 = 25 XP
      expect(xp.base).toBe(10);
      expect(xp.accuracyBonus).toBe(10);
      expect(xp.speedBonus).toBe(5);
      expect(xp.total).toBe(25);

      // Verify daily goal increments with the exam practice entry
      const goal = calculateDailyGoal([examEntry], new Date(2026, 4, 15));
      expect(goal.completedToday).toBe(1);
    });
  });
});
