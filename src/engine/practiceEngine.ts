import { Passage, TypingLanguage, TypingState } from './types';
import { CharacterMismatch, TypingAnalytics } from './analytics';
import { COMMON_BIGRAMS, COMMON_PRACTICE_WORDS } from '@/data/practiceWords';
import { HINDI_COMMON_BIGRAMS, HINDI_PRACTICE_WORDS } from '@/data/hindiPracticeWords';
import { cleanWordToken, segmentGraphemes } from './textUtils';

export type PracticeType = 'characters' | 'words' | 'bigrams';

export interface PracticePlan {
  id: string;
  type: PracticeType;
  title: string;
  description: string;
  targetKeys: string[];
  targetItems: string[];
  practiceText: string;
  passage: Passage;
  hasContent: boolean;
}

/**
 * Extracts and ranks words from a passage where character mistakes occurred.
 * Uses character mismatch indices mapped against grapheme word boundaries.
 */
export function extractMissedWords(
  passageText: string,
  mistakes: CharacterMismatch[],
  language: TypingLanguage = 'en'
): string[] {
  if (!passageText || mistakes.length === 0) {
    return [];
  }

  // Segment passage into grapheme clusters
  const graphemes = segmentGraphemes(passageText, language);

  // Group graphemes into words with their grapheme start and end boundaries
  const wordTokens: { clean: string; start: number; end: number }[] = [];
  let currentWordGraphemes: string[] = [];
  let wordStartIndex = -1;

  for (let i = 0; i < graphemes.length; i++) {
    const g = graphemes[i];
    const isWhitespace = /\s/.test(g);

    if (!isWhitespace) {
      if (wordStartIndex === -1) {
        wordStartIndex = i;
      }
      currentWordGraphemes.push(g);
    }

    if ((isWhitespace || i === graphemes.length - 1) && currentWordGraphemes.length > 0) {
      const rawWord = currentWordGraphemes.join('');
      const clean = cleanWordToken(rawWord);
      const normalizedClean = language === 'en' ? clean.toLowerCase() : clean;

      if (normalizedClean.length >= 2) {
        wordTokens.push({
          clean: normalizedClean,
          start: wordStartIndex,
          end: isWhitespace ? i : i + 1,
        });
      }

      currentWordGraphemes = [];
      wordStartIndex = -1;
    }
  }

  // Tally mistakes occurring within each word boundary
  const wordMistakeCounts = new Map<string, number>();

  for (const token of wordTokens) {
    let errorCount = 0;
    for (const m of mistakes) {
      if (m.index >= token.start && m.index < token.end) {
        errorCount++;
      }
    }
    if (errorCount > 0) {
      const current = wordMistakeCounts.get(token.clean) || 0;
      wordMistakeCounts.set(token.clean, current + errorCount);
    }
  }

  // Sort by error frequency descending, then alphabetically for deterministic output
  return Array.from(wordMistakeCounts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0], language);
    })
    .map(([word]) => word);
}

/**
 * Extracts candidate bigrams that contain the user's mistyped characters.
 */
export function extractTargetBigrams(
  targetCharacters: string[],
  bigramPool: string[] = COMMON_BIGRAMS,
  language: TypingLanguage = 'en'
): string[] {
  const isHindi = language === 'hi';
  const normalizedTargets = targetCharacters
    .map((c) => (isHindi ? c : c.toLowerCase()))
    .filter((c) => (isHindi ? /[\u0900-\u097F]/.test(c) : c.length === 1 && /[a-z]/.test(c)));

  if (normalizedTargets.length === 0) {
    return [];
  }

  const targetSet = new Set(normalizedTargets);

  // Filter bigrams that contain at least one of the target characters
  const matched = bigramPool.filter((bg) => {
    return Array.from(targetSet).some((t) => bg.includes(t));
  });

  // Sort bigrams that contain both targets higher, otherwise alphabetical
  return matched.sort((a, b) => {
    const scoreA = Array.from(targetSet).reduce((acc, t) => acc + (a.includes(t) ? 1 : 0), 0);
    const scoreB = Array.from(targetSet).reduce((acc, t) => acc + (b.includes(t) ? 1 : 0), 0);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return a.localeCompare(b, language);
  });
}

/**
 * Deterministically generates a practice plan targeting mistyped characters.
 */
export function generateCharacterPractice(
  targetCharacters: string[],
  wordPool: string[] = COMMON_PRACTICE_WORDS,
  language: TypingLanguage = 'en'
): PracticePlan {
  const isHindi = language === 'hi';
  const normalized = targetCharacters
    .map((c) => (isHindi ? c : c.toLowerCase()))
    .filter((c) => (isHindi ? /[\u0900-\u097F]/.test(c) : c.length === 1 && /[a-z]/.test(c)));

  // Deduplicate target characters
  const uniqueTargets = Array.from(new Set(normalized));

  if (uniqueTargets.length === 0) {
    return {
      id: 'practice-characters-empty',
      type: 'characters',
      title: isHindi ? 'विशेष वर्ण अभ्यास' : 'Focus Keys Practice',
      description: 'Not enough mistake data for targeted practice yet.',
      targetKeys: [],
      targetItems: [],
      practiceText: '',
      passage: {
        id: 'practice-empty',
        title: 'Empty Practice',
        text: '',
        language,
        difficulty: 'easy',
      },
      hasContent: false,
    };
  }

  const targetSet = new Set(uniqueTargets);

  // Score words by how many target characters they contain
  const scoredWords = wordPool
    .map((word) => {
      let score = 0;
      const graphemes = segmentGraphemes(word, language);
      for (const g of graphemes) {
        if (targetSet.has(g)) {
          score++;
        }
      }
      return { word, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.word.localeCompare(b.word, language);
    })
    .slice(0, 20)
    .map((item) => item.word);

  if (scoredWords.length === 0) {
    return {
      id: 'practice-characters-empty',
      type: 'characters',
      title: isHindi ? 'विशेष वर्ण अभ्यास' : 'Focus Keys Practice',
      description: 'Not enough matching practice words found for target keys.',
      targetKeys: uniqueTargets,
      targetItems: [],
      practiceText: '',
      passage: {
        id: 'practice-empty',
        title: 'Empty Practice',
        text: '',
        language,
        difficulty: 'easy',
      },
      hasContent: false,
    };
  }

  const practiceText = scoredWords.join(' ');
  const displayKeys = isHindi ? uniqueTargets : uniqueTargets.map((k) => k.toUpperCase());

  return {
    id: `practice-chars-${uniqueTargets.join('-')}`,
    type: 'characters',
    title: isHindi ? 'विशेष वर्ण अभ्यास' : 'Focus Keys Practice',
    description: isHindi
      ? `आपके सर्वाधिक अशुद्ध वर्णों का अभ्यास: ${displayKeys.join(', ')}`
      : `Targeting your most mistyped keys: ${displayKeys.join(', ')}`,
    targetKeys: displayKeys,
    targetItems: scoredWords,
    practiceText,
    passage: {
      id: `practice-passage-chars`,
      title: isHindi
        ? `अभ्यास: मुख्य वर्ण (${displayKeys.join(', ')})`
        : `Practice: Focus Keys (${displayKeys.join(', ')})`,
      text: practiceText,
      language,
      difficulty: 'medium',
    },
    hasContent: true,
  };
}

/**
 * Deterministically generates a practice plan targeting missed words.
 */
export function generateMissedWordsPractice(
  missedWords: string[],
  language: TypingLanguage = 'en'
): PracticePlan {
  const cleanWords = Array.from(new Set(missedWords.filter((w) => w.length >= 2)));
  const isHindi = language === 'hi';

  if (cleanWords.length === 0) {
    return {
      id: 'practice-words-empty',
      type: 'words',
      title: isHindi ? 'अशुद्ध शब्द अभ्यास' : 'Missed Words Practice',
      description: 'Not enough mistake data for targeted word practice yet.',
      targetKeys: [],
      targetItems: [],
      practiceText: '',
      passage: {
        id: 'practice-empty',
        title: 'Empty Practice',
        text: '',
        language,
        difficulty: 'easy',
      },
      hasContent: false,
    };
  }

  // Create repetition sets for the missed words (repeat 3 times in sets)
  const targetWords = cleanWords.slice(0, 10);
  const practiceWords: string[] = [];

  for (let round = 0; round < 3; round++) {
    practiceWords.push(...targetWords);
  }

  const practiceText = practiceWords.join(' ');

  return {
    id: `practice-words-${targetWords.join('-')}`,
    type: 'words',
    title: isHindi ? 'अशुद्ध शब्द अभ्यास' : 'Missed Words Practice',
    description: isHindi
      ? `${targetWords.length} शब्दों का पुनरावृत्ति अभ्यास जिनमें त्रुटि हुई थी।`
      : `Reinforcing ${targetWords.length} words where mistakes were made.`,
    targetKeys: [],
    targetItems: targetWords,
    practiceText,
    passage: {
      id: `practice-passage-words`,
      title: isHindi
        ? `अभ्यास: अशुद्ध शब्द (${targetWords.slice(0, 3).join(', ')}...)`
        : `Practice: Missed Words (${targetWords.slice(0, 3).join(', ')}...)`,
      text: practiceText,
      language,
      difficulty: 'medium',
    },
    hasContent: true,
  };
}

/**
 * Deterministically generates a practice plan targeting bigrams for problem characters.
 */
export function generateBigramPractice(
  targetCharacters: string[],
  wordPool: string[] = COMMON_PRACTICE_WORDS,
  language: TypingLanguage = 'en',
  bigramPool: string[] = COMMON_BIGRAMS
): PracticePlan {
  const isHindi = language === 'hi';
  const targetBigrams = extractTargetBigrams(targetCharacters, bigramPool, language);

  if (targetBigrams.length === 0) {
    return {
      id: 'practice-bigrams-empty',
      type: 'bigrams',
      title: isHindi ? 'वर्ण संयोजन अभ्यास' : 'Targeted Bigram Practice',
      description: 'Not enough mistake data for targeted bigram practice yet.',
      targetKeys: [],
      targetItems: [],
      practiceText: '',
      passage: {
        id: 'practice-empty',
        title: 'Empty Practice',
        text: '',
        language,
        difficulty: 'easy',
      },
      hasContent: false,
    };
  }

  const activeBigrams = targetBigrams.slice(0, 6);
  const matchedWords: string[] = [];

  for (const bg of activeBigrams) {
    const wordsForBg = wordPool.filter((w) => w.includes(bg));
    for (const w of wordsForBg) {
      if (!matchedWords.includes(w)) {
        matchedWords.push(w);
      }
      if (matchedWords.length >= 20) break;
    }
    if (matchedWords.length >= 20) break;
  }

  if (matchedWords.length === 0) {
    return {
      id: 'practice-bigrams-empty',
      type: 'bigrams',
      title: isHindi ? 'वर्ण संयोजन अभ्यास' : 'Targeted Bigram Practice',
      description: 'No matching bigram drill words available.',
      targetKeys: [],
      targetItems: activeBigrams,
      practiceText: '',
      passage: {
        id: 'practice-empty',
        title: 'Empty Practice',
        text: '',
        language,
        difficulty: 'easy',
      },
      hasContent: false,
    };
  }

  const practiceText = matchedWords.join(' ');
  const displayKeys = isHindi ? targetCharacters : targetCharacters.map((c) => c.toUpperCase());

  return {
    id: `practice-bigrams-${activeBigrams.join('-')}`,
    type: 'bigrams',
    title: isHindi ? 'वर्ण संयोजन अभ्यास' : 'Targeted Bigram Practice',
    description: isHindi
      ? `वर्ण संयोजनों का अभ्यास: ${activeBigrams.map((b) => `[${b}]`).join(' ')}`
      : `Practicing key transitions: ${activeBigrams.map((b) => `[${b}]`).join(' ')}`,
    targetKeys: displayKeys,
    targetItems: activeBigrams,
    practiceText,
    passage: {
      id: `practice-passage-bigrams`,
      title: isHindi
        ? `अभ्यास: संयोजन (${activeBigrams.slice(0, 4).join(', ')})`
        : `Practice: Bigrams (${activeBigrams.slice(0, 4).join(', ')})`,
      text: practiceText,
      language,
      difficulty: 'medium',
    },
    hasContent: true,
  };
}

/**
 * Master generator producing a PracticePlan based on the chosen mode and analytics.
 */
export function generatePracticePlan(
  state: TypingState,
  analytics: TypingAnalytics,
  type: PracticeType = 'characters'
): PracticePlan {
  const language = state.passage.language;
  const isHindi = language === 'hi';

  // Extract top mistyped characters based on language
  const targetChars = isHindi
    ? analytics.mostMistypedCharacters
        .map((m) => m.character)
        .filter((c) => /[\u0900-\u097F]/.test(c))
    : analytics.mostMistypedCharacters
        .map((m) => m.character)
        .filter((c) => c.length === 1 && /[a-zA-Z]/.test(c));

  const wordPool = isHindi ? HINDI_PRACTICE_WORDS : COMMON_PRACTICE_WORDS;
  const bigramPool = isHindi ? HINDI_COMMON_BIGRAMS : COMMON_BIGRAMS;

  switch (type) {
    case 'words': {
      const missedWords = extractMissedWords(state.passage.text, analytics.mistakeDetails, language);
      return generateMissedWordsPractice(missedWords, language);
    }
    case 'bigrams': {
      return generateBigramPractice(targetChars, wordPool, language, bigramPool);
    }
    case 'characters':
    default: {
      return generateCharacterPractice(targetChars, wordPool, language);
    }
  }
}
