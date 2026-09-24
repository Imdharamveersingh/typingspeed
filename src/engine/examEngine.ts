import { ExamEvaluation, ExamProfile } from './examTypes';
import { EXAM_PROFILES, DEFAULT_EXAM_PROFILE } from './examProfiles';

export interface PerformanceInput {
  netWpm: number;
  grossWpm: number;
  accuracy: number;
}

/**
 * Retrieves an exam profile by ID, or undefined if not found.
 */
export function getExamProfile(id: string): ExamProfile | undefined {
  return EXAM_PROFILES.find((p) => p.id === id);
}

/**
 * Returns all active exam practice profiles.
 */
export function getAllExamProfiles(): ExamProfile[] {
  return EXAM_PROFILES.filter((p) => p.enabled);
}

/**
 * Returns the default initial exam practice profile.
 */
export function getDefaultExamProfile(): ExamProfile {
  return DEFAULT_EXAM_PROFILE;
}

/**
 * Pure deterministic evaluation function comparing performance metrics
 * against an exam profile's benchmark criteria.
 */
export function evaluateExamResult(
  metrics: PerformanceInput,
  profile: ExamProfile
): ExamEvaluation {
  const actualNet = Math.max(0, Math.round(metrics.netWpm));
  const actualGross = Math.max(0, Math.round(metrics.grossWpm));
  const accuracy = Math.max(0, Math.round(metrics.accuracy));

  const targetWpm = profile.targetValue;
  const minimumAccuracy = profile.minimumAccuracy;

  // Informational evaluation (no strict pass/fail judgment)
  if (profile.evaluationType === 'informational') {
    return {
      profileId: profile.id,
      profileName: profile.name,
      shortName: profile.shortName,
      targetWpm,
      actualNetWpm: actualNet,
      actualGrossWpm: actualGross,
      accuracy,
      minimumAccuracy,
      status: 'informational',
      isQualified: true,
      headline: 'Practice Session Recorded',
      message: `Completed practice test at ${actualNet} Net WPM with ${accuracy}% accuracy.`,
      disclaimer: profile.simulationDisclaimer,
    };
  }

  // Speed-only evaluation
  if (profile.evaluationType === 'speed_only') {
    const isSpeedMet = actualNet >= targetWpm;
    return {
      profileId: profile.id,
      profileName: profile.name,
      shortName: profile.shortName,
      targetWpm,
      actualNetWpm: actualNet,
      actualGrossWpm: actualGross,
      accuracy,
      minimumAccuracy,
      status: isSpeedMet ? 'target_reached' : 'target_not_reached',
      isQualified: isSpeedMet,
      headline: isSpeedMet ? 'Target Speed Reached' : 'Below Target Speed',
      message: isSpeedMet
        ? `Achieved ${actualNet} Net WPM, meeting the target benchmark of ${targetWpm} WPM.`
        : `Achieved ${actualNet} Net WPM. Target is ${targetWpm} Net WPM (${targetWpm - actualNet} WPM needed).`,
      disclaimer: profile.simulationDisclaimer,
    };
  }

  // Speed and accuracy evaluation (standard simulation)
  const isSpeedMet = actualNet >= targetWpm;
  const isAccuracyMet = minimumAccuracy ? accuracy >= minimumAccuracy : true;
  const isQualified = isSpeedMet && isAccuracyMet;

  let headline = 'Target Benchmark Reached';
  let message = `Achieved ${actualNet} Net WPM with ${accuracy}% accuracy, meeting both speed (${targetWpm} WPM) and accuracy (${minimumAccuracy}%) targets.`;

  if (!isQualified) {
    headline = 'Target Benchmark Not Reached';
    if (!isSpeedMet && !isAccuracyMet) {
      message = `Both speed (${actualNet} / ${targetWpm} WPM) and accuracy (${accuracy}% / ${minimumAccuracy}%) fell below target benchmarks.`;
    } else if (!isSpeedMet) {
      message = `Speed fell below target (${actualNet} / ${targetWpm} Net WPM). Accuracy requirement met (${accuracy}%).`;
    } else {
      message = `Speed benchmark met (${actualNet} WPM), but accuracy was below threshold (${accuracy}% / ${minimumAccuracy}%).`;
    }
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    shortName: profile.shortName,
    targetWpm,
    actualNetWpm: actualNet,
    actualGrossWpm: actualGross,
    accuracy,
    minimumAccuracy,
    status: isQualified ? 'target_reached' : 'target_not_reached',
    isQualified,
    headline,
    message,
    disclaimer: profile.simulationDisclaimer,
  };
}
