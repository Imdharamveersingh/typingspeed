import {
  AggregatedWeakCharacter,
  ProgressSummary,
  ProgressTrendPoint,
  TypingHistoryEntry,
} from './progressTypes';

/**
 * Computes high-level aggregate summary statistics across historical typing tests.
 * Pure and deterministic.
 */
export function calculateProgressSummary(entries: TypingHistoryEntry[]): ProgressSummary {
  if (entries.length === 0) {
    return {
      totalTests: 0,
      averageNetWpm: 0,
      bestNetWpm: 0,
      averageAccuracy: 0,
      recentNetWpm: 0,
      recentAccuracy: 0,
    };
  }

  const totalTests = entries.length;
  const totalNetWpm = entries.reduce((acc, curr) => acc + curr.netWpm, 0);
  const totalAccuracy = entries.reduce((acc, curr) => acc + curr.accuracy, 0);
  const bestNetWpm = Math.max(...entries.map((e) => e.netWpm));

  const averageNetWpm = Math.round(totalNetWpm / totalTests);
  const averageAccuracy = parseFloat((totalAccuracy / totalTests).toFixed(1));

  // entries are stored newest first
  const recentNetWpm = entries[0].netWpm;
  const recentAccuracy = entries[0].accuracy;

  return {
    totalTests,
    averageNetWpm,
    bestNetWpm,
    averageAccuracy,
    recentNetWpm,
    recentAccuracy,
  };
}

/**
 * Aggregates mistyped character frequencies across all historical test attempts.
 * Returns the top-N most frequent weak characters.
 * Pure and deterministic.
 */
export function aggregateWeakCharacters(
  entries: TypingHistoryEntry[],
  topN = 5
): AggregatedWeakCharacter[] {
  if (entries.length === 0 || topN <= 0) {
    return [];
  }

  const freqMap = new Map<string, { displayLabel: string; totalMistakes: number; testsCount: number }>();

  for (const entry of entries) {
    // Track unique mistakes per test to calculate test presence
    const seenInTest = new Set<string>();

    for (const mistyped of entry.mostMistypedCharacters) {
      const key = mistyped.character.toLowerCase();
      const existing = freqMap.get(key);

      if (existing) {
        existing.totalMistakes += mistyped.count;
        if (!seenInTest.has(key)) {
          existing.testsCount += 1;
          seenInTest.add(key);
        }
      } else {
        freqMap.set(key, {
          displayLabel: mistyped.displayLabel,
          totalMistakes: mistyped.count,
          testsCount: 1,
        });
        seenInTest.add(key);
      }
    }
  }

  return Array.from(freqMap.entries())
    .map(([character, data]) => ({
      character,
      displayLabel: data.displayLabel,
      totalMistakes: data.totalMistakes,
      testsCount: data.testsCount,
    }))
    .sort((a, b) => {
      if (b.totalMistakes !== a.totalMistakes) {
        return b.totalMistakes - a.totalMistakes;
      }
      return a.displayLabel.localeCompare(b.displayLabel);
    })
    .slice(0, topN);
}

/**
 * Extracts chronological trend points for visualization (oldest to newest).
 * Bounded by limit (default: latest 20 tests in chronological order).
 * Pure and deterministic.
 */
export function getProgressTrend(
  entries: TypingHistoryEntry[],
  limit = 20
): ProgressTrendPoint[] {
  if (entries.length === 0) {
    return [];
  }

  // entries are stored newest first; take latest N and reverse to chronological
  const subset = entries.slice(0, limit).reverse();

  return subset.map((entry, idx) => ({
    index: idx + 1,
    timestamp: entry.timestamp,
    netWpm: entry.netWpm,
    accuracy: entry.accuracy,
    duration: entry.duration,
  }));
}
