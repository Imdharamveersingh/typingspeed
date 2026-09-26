import { Passage, TypingLanguage } from './types';
import { PASSAGES } from '@/data/passages';
import { HINDI_PASSAGES } from '@/data/hindiPassages';
import { segmentGraphemes } from './textUtils';

export type TestType = 'time' | 'words' | 'characters';
export type TestDifficulty = 'easy' | 'medium' | 'hard';

export interface GeneratePassageOptions {
  language: TypingLanguage;
  difficulty: TestDifficulty;
  testType: TestType;
  targetCount?: number;
}

/**
 * Builds a text stream from passages matching the given language and difficulty.
 */
function getSourceTexts(language: TypingLanguage, difficulty: TestDifficulty): string[] {
  const pool = language === 'hi' ? HINDI_PASSAGES : PASSAGES;
  const filtered = pool.filter((p) => p.difficulty === difficulty);
  const selected = filtered.length > 0 ? filtered : pool;
  return selected.map((p) => p.text.trim());
}

/**
 * Generates an appropriate Passage for Time, Words, or Characters mode.
 */
export function generateTestPassage({
  language,
  difficulty,
  testType,
  targetCount,
}: GeneratePassageOptions): Passage {
  const sources = getSourceTexts(language, difficulty);

  if (testType === 'words') {
    const targetWords = targetCount && targetCount > 0 ? targetCount : 50;
    const allWords: string[] = [];

    // Gather words from source texts
    for (const text of sources) {
      const words = text.split(/\s+/).filter(Boolean);
      allWords.push(...words);
    }

    // If pool has fewer words than requested, loop until fulfilled
    const chosenWords: string[] = [];
    let poolIndex = 0;
    while (chosenWords.length < targetWords && allWords.length > 0) {
      chosenWords.push(allWords[poolIndex % allWords.length]);
      poolIndex++;
    }

    const generatedText = chosenWords.join(' ');
    const diffCapitalized = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    return {
      id: `words-${language}-${difficulty}-${targetWords}`,
      title: `${diffCapitalized} — ${targetWords} Words`,
      text: generatedText,
      language,
      difficulty,
    };
  }

  if (testType === 'characters') {
    const targetChars = targetCount && targetCount > 0 ? targetCount : 250;
    // Build a continuous stream of text from sources
    let combined = sources.join(' ');
    let graphemes = segmentGraphemes(combined, language);

    while (graphemes.length < targetChars) {
      combined += ' ' + sources.join(' ');
      graphemes = segmentGraphemes(combined, language);
    }

    const slicedGraphemes = graphemes.slice(0, targetChars);
    const generatedText = slicedGraphemes.join('');
    const diffCapitalized = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    return {
      id: `chars-${language}-${difficulty}-${targetChars}`,
      title: `${diffCapitalized} — ${targetChars} Characters`,
      text: generatedText,
      language,
      difficulty,
    };
  }

  // Default: Time mode — provide an abundant supply of text so user never runs out
  const targetWords = 2000;
  const allWords: string[] = [];
  for (const text of sources) {
    allWords.push(...text.split(/\s+/).filter(Boolean));
  }

  const chosenWords: string[] = [];
  let poolIndex = 0;
  while (chosenWords.length < targetWords && allWords.length > 0) {
    chosenWords.push(allWords[poolIndex % allWords.length]);
    poolIndex++;
  }

  const generatedText = chosenWords.join(' ');
  const diffCapitalized = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return {
    id: `time-${language}-${difficulty}`,
    title: `${diffCapitalized} — Time Test`,
    text: generatedText,
    language,
    difficulty,
  };
}
