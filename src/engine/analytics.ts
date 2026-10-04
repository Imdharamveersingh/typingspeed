import { PerformanceSample, TypingMetrics, TypingState } from './types';
import { calculateCurrentMetrics } from './typingEngine';

export interface MistypedCharacter {
  character: string;
  displayLabel: string;
  count: number;
}

export interface CharacterMismatch {
  expected: string;
  typed: string;
  index: number;
  status?: 'incorrect' | 'corrected';
}

export interface PerformanceInsights {
  speedRating: string;
  speedDescription: string;
  accuracyRating: string;
  accuracyDescription: string;
  consistencyRating: string;
  consistencyDescription: string;
  errorRating: string;
  errorDescription: string;
}

export interface TypingAnalytics {
  metrics: TypingMetrics;
  testDuration: number;
  totalProcessedCharacters: number;
  correctCharacters: number;
  incorrectCharacters: number;
  extraCharacters: number;
  accuracy: number;
  mostMistypedCharacters: MistypedCharacter[];
  mistakeDetails: CharacterMismatch[];
  hasMistakes: boolean;
  correctedCharacters?: number;
  totalMistakes?: number;
  correctedMistakes?: number;
  uncorrectedMistakes?: number;
  performanceSnapshots?: PerformanceSample[];
}

/**
 * Returns a user-friendly label for a character (e.g. 'Space' for ' ').
 */
export function getCharacterDisplayLabel(char: string): string {
  if (char === ' ') return 'Space';
  if (char === '\n') return 'Enter';
  if (char === '\t') return 'Tab';
  return char;
}

/**
 * Pure, deterministic analysis function computing mistake diagnostics, breakdown,
 * and performance snapshots from a completed or running typing state.
 */
export function analyzeTypingResult(
  state: TypingState,
  explicitMetrics?: TypingMetrics
): TypingAnalytics {
  const metrics = explicitMetrics ?? calculateCurrentMetrics(state);

  const mistypedFreq = new Map<string, { label: string; count: number }>();
  const mistakeDetails: CharacterMismatch[] = [];

  let correctCharacters = 0;
  let incorrectCharacters = 0;
  let correctedCharacters = 0;

  // Analyze characters in the passage traversed by user
  for (let i = 0; i < state.currentIndex; i++) {
    const item = state.characters[i];
    if (item.state === 'correct') {
      if (item.hadMistake) {
        correctCharacters++;
        correctedCharacters++;
        const expected = item.char;
        const typed = item.mistypedChar || '(corrected)';
        mistakeDetails.push({
          expected,
          typed,
          index: i,
          status: 'corrected',
        });
        const label = getCharacterDisplayLabel(expected);
        const existing = mistypedFreq.get(expected);
        if (existing) {
          existing.count += 1;
        } else {
          mistypedFreq.set(expected, { label, count: 1 });
        }
      } else {
        correctCharacters++;
      }
    } else if (item.state === 'corrected') {
      correctCharacters++;
      correctedCharacters++;
      const expected = item.char;
      const typed = item.mistypedChar || '(corrected)';
      mistakeDetails.push({
        expected,
        typed,
        index: i,
        status: 'corrected',
      });
      const label = getCharacterDisplayLabel(expected);
      const existing = mistypedFreq.get(expected);
      if (existing) {
        existing.count += 1;
      } else {
        mistypedFreq.set(expected, { label, count: 1 });
      }
    } else if (item.state === 'incorrect') {
      incorrectCharacters++;

      const expected = item.char;
      const typed = item.typedChar || item.mistypedChar || '';

      mistakeDetails.push({
        expected,
        typed,
        index: i,
        status: 'incorrect',
      });

      const label = getCharacterDisplayLabel(expected);
      const existing = mistypedFreq.get(expected);
      if (existing) {
        existing.count += 1;
      } else {
        mistypedFreq.set(expected, { label, count: 1 });
      }
    }
  }

  // Also check if current character is blocked in incorrect state (Stop on Error mode)
  const isBlocked =
    state.currentIndex < state.characters.length &&
    state.characters[state.currentIndex]?.state === 'incorrect';
  if (isBlocked) {
    const blockedItem = state.characters[state.currentIndex];
    incorrectCharacters++;
    const expected = blockedItem.char;
    const typed = blockedItem.typedChar || blockedItem.mistypedChar || '';
    mistakeDetails.push({
      expected,
      typed,
      index: state.currentIndex,
      status: 'incorrect',
    });
    const label = getCharacterDisplayLabel(expected);
    const existing = mistypedFreq.get(expected);
    if (existing) {
      existing.count += 1;
    } else {
      mistypedFreq.set(expected, { label, count: 1 });
    }
  }

  // Handle extra characters typed beyond passage
  const extraCount = state.extraCharacters.length;
  if (extraCount > 0) {
    state.extraCharacters.forEach((extra, idx) => {
      mistakeDetails.push({
        expected: '(none)',
        typed: extra.char,
        index: state.characters.length + idx,
        status: 'incorrect',
      });

      const label = `Extra '${getCharacterDisplayLabel(extra.char)}'`;
      const key = `extra_${extra.char}`;
      const existing = mistypedFreq.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        mistypedFreq.set(key, { label, count: 1 });
      }
    });
  }

  // Sort most mistyped characters descending by frequency
  const mostMistypedCharacters: MistypedCharacter[] = Array.from(mistypedFreq.entries())
    .map(([char, data]) => ({
      character: char,
      displayLabel: data.label,
      count: data.count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.displayLabel.localeCompare(b.displayLabel, state.passage.language);
    });

  const totalMistakes = correctedCharacters + incorrectCharacters + extraCount;
  const correctedMistakes = correctedCharacters;
  const uncorrectedMistakes = incorrectCharacters + extraCount;
  const totalProcessed = correctCharacters + incorrectCharacters + extraCount;
  const hasMistakes = totalMistakes > 0;

  // Ensure performanceSnapshots has at least a start and end point if test has elapsed
  let performanceSnapshots = state.performanceSnapshots ? [...state.performanceSnapshots] : [];
  if (performanceSnapshots.length === 0 && metrics.elapsedSeconds > 0) {
    performanceSnapshots = [
      {
        timestamp: state.startTime ?? Date.now() - metrics.elapsedSeconds * 1000,
        elapsedSeconds: 0,
        grossWpm: 0,
        netWpm: 0,
        accuracy: 100,
        errors: 0,
      },
      {
        timestamp: state.endTime ?? Date.now(),
        elapsedSeconds: Math.round(metrics.elapsedSeconds * 10) / 10,
        grossWpm: metrics.grossWPM,
        netWpm: metrics.netWPM,
        accuracy: metrics.accuracy,
        errors: metrics.errors ?? totalMistakes,
      },
    ];
  }

  return {
    metrics,
    testDuration: state.duration,
    totalProcessedCharacters: totalProcessed,
    correctCharacters,
    incorrectCharacters,
    extraCharacters: extraCount,
    accuracy: metrics.accuracy,
    mostMistypedCharacters,
    mistakeDetails,
    hasMistakes,
    correctedCharacters,
    totalMistakes,
    correctedMistakes,
    uncorrectedMistakes,
    performanceSnapshots,
  };
}

/**
 * Calculates deterministic performance insights based on documented criteria.
 */
export function calculatePerformanceInsights(
  metrics: TypingMetrics,
  totalMistakes: number,
  correctedMistakes: number,
  snapshots?: PerformanceSample[]
): PerformanceInsights {
  // Speed Tier (Net WPM)
  // >= 80: Elite, 60-79: Fast, 40-59: Moderate, 25-39: Developing, < 25: Beginner
  let speedRating = 'Beginner';
  let speedDescription = 'Building foundation and finger positioning';
  if (metrics.netWPM >= 80) {
    speedRating = 'Elite';
    speedDescription = 'Top tier typing speed suitable for advanced professional work';
  } else if (metrics.netWPM >= 60) {
    speedRating = 'Fast';
    speedDescription = 'Above average speed with smooth key progression';
  } else if (metrics.netWPM >= 40) {
    speedRating = 'Moderate';
    speedDescription = 'Solid everyday speed with clear room for growth';
  } else if (metrics.netWPM >= 25) {
    speedRating = 'Developing';
    speedDescription = 'Steady progress, continuing to build keyboard familiarity';
  }

  // Accuracy Tier
  // >= 98%: Excellent, 95-97.9%: Very Good, 90-94.9%: Good, 85-89.9%: Fair, < 85%: Needs Focus
  let accuracyRating = 'Needs Focus';
  let accuracyDescription = 'Prioritize precision over speed to build muscle memory';
  if (metrics.accuracy >= 98) {
    accuracyRating = 'Excellent';
    accuracyDescription = 'Outstanding precision with near-zero error penalty';
  } else if (metrics.accuracy >= 95) {
    accuracyRating = 'Very Good';
    accuracyDescription = 'High accuracy supporting efficient typing flow';
  } else if (metrics.accuracy >= 90) {
    accuracyRating = 'Good';
    accuracyDescription = 'Dependable accuracy with occasional miskeys';
  } else if (metrics.accuracy >= 85) {
    accuracyRating = 'Fair';
    accuracyDescription = 'Noticeable errors affecting net typing pace';
  }

  // Consistency Tier
  let consistencyRating = 'Good';
  let consistencyDescription = 'Maintained a stable pace across the test';
  if (snapshots && snapshots.length >= 3) {
    const wpms = snapshots.slice(1).map((s) => s.netWpm);
    const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
    if (mean > 0) {
      const variance = wpms.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / wpms.length;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / mean) * 100;
      if (cv < 12) {
        consistencyRating = 'Exceptional';
        consistencyDescription = 'Very steady typing cadence with minimal speed fluctuations';
      } else if (cv < 25) {
        consistencyRating = 'Consistent';
        consistencyDescription = 'Balanced pace throughout the test duration';
      } else {
        consistencyRating = 'Variable';
        consistencyDescription = 'Pace fluctuated; steadying your rhythm will boost speed';
      }
    }
  }

  // Error Management Tier
  let errorRating = 'Flawless';
  let errorDescription = 'Zero mistakes made across the entire test';
  if (totalMistakes > 0) {
    const correctionRate = (correctedMistakes / totalMistakes) * 100;
    if (correctionRate === 100) {
      errorRating = 'Diligent';
      errorDescription = 'All mistakes were caught and cleanly corrected';
    } else if (correctionRate >= 50) {
      errorRating = 'Controlled';
      errorDescription = `Corrected ${correctedMistakes} of ${totalMistakes} mistakes`;
    } else {
      errorRating = 'Speed-Focused';
      errorDescription = `${totalMistakes - correctedMistakes} uncorrected mistakes remained`;
    }
  }

  return {
    speedRating,
    speedDescription,
    accuracyRating,
    accuracyDescription,
    consistencyRating,
    consistencyDescription,
    errorRating,
    errorDescription,
  };
}
