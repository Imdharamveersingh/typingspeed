import { TypingMetrics, TypingState } from './types';
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
 * Pure, deterministic analysis function computing mistake diagnostics and breakdown
 * from a completed or running typing state.
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

  // Analyze characters in the passage traversed by user
  for (let i = 0; i < state.currentIndex; i++) {
    const item = state.characters[i];
    if (item.state === 'correct') {
      correctCharacters++;
    } else if (item.state === 'incorrect') {
      incorrectCharacters++;

      const expected = item.char;
      const typed = item.typedChar ?? '';

      mistakeDetails.push({
        expected,
        typed,
        index: i,
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

  // Handle extra characters typed beyond passage
  const extraCount = state.extraCharacters.length;
  if (extraCount > 0) {
    state.extraCharacters.forEach((extra, idx) => {
      mistakeDetails.push({
        expected: '(none)',
        typed: extra.char,
        index: state.characters.length + idx,
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

  const totalProcessed = correctCharacters + incorrectCharacters + extraCount;
  const hasMistakes = incorrectCharacters + extraCount > 0;

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
  };
}
