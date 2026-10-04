import { CharacterItem, Passage, TestType, TypingLanguage, TypingState } from './types';
import { PASSAGES } from '@/data/passages';
import { HINDI_PASSAGES } from '@/data/hindiPassages';
import { segmentGraphemes } from './textUtils';
import { getWordListBySize } from '@/data/practiceWords';
import { TextSourceOption, WordListSizeOption } from './settingsTypes';

export type { TestType };
export type TestDifficulty = 'easy' | 'medium' | 'hard';

export interface GeneratePassageOptions {
  language: TypingLanguage;
  difficulty: TestDifficulty;
  testType: TestType;
  targetCount?: number;
  textSource?: TextSourceOption;
  includeCapitalLetters?: boolean;
  includeSpecialCharacters?: boolean;
  wordListSize?: WordListSizeOption;
}

/**
 * Curated continuous paragraph passages with high-frequency everyday vocabulary.
 */
export const EVERYDAY_PARAGRAPHS: string[] = [
  'the people have time to make a good plan and work together to build a strong community where everyone can learn and grow with confidence each new day brings another chance to do something meaningful and help those around us succeed through patience and steady effort',
  'reading books and writing stories allows us to understand different ways of thinking and see the world through new eyes when we take a few quiet moments to focus on our goals small daily habits can lead to great long term results for our family and friends',
  'a walk through the quiet forest in the early morning helps clear the mind and restore energy ancient green trees shelter birds and gentle streams that flow downward toward the river bringing fresh water to the fields and towns along the wide valley',
  'learning a new skill requires practice and patience rather than speed when you pay close attention to each movement your fingers and hands develop natural muscle memory that makes every action feel smooth and easy over time',
  'working together with clear communication helps teams solve hard problems and achieve things that no single person could accomplish alone listening to each other and sharing ideas creates trust and makes the journey enjoyable for all',
];

/**
 * Formats a text string according to user capital letter and special character preferences.
 */
export function formatPassageText(
  text: string,
  language: TypingLanguage,
  includeCapitalLetters: boolean = false,
  includeSpecialCharacters: boolean = false
): string {
  let formatted = text.trim();

  if (language === 'hi') {
    if (!includeSpecialCharacters) {
      // Strip punctuation/special symbols (danda, double danda, commas, hyphens, quotes, brackets, etc.)
      formatted = formatted.replace(/[।,;\-:—"'"!?()[\]{}.॥]/g, '');
      formatted = formatted.replace(/\s+/g, ' ').trim();
    }
    return formatted;
  }

  // If special characters are off, remove punctuation symbols
  if (!includeSpecialCharacters) {
    formatted = formatted.replace(/[^a-zA-Z0-9\s]/g, '');
    formatted = formatted.replace(/\s+/g, ' ').trim();
  }

  // If capital letters are off, make all letters lowercase
  if (!includeCapitalLetters) {
    formatted = formatted.toLowerCase();
  }

  return formatted;
}

/**
 * Builds words from common words vocabulary pool with user options applied.
 */
function buildCommonWords(
  wordCount: number,
  wordListSize: WordListSizeOption = 'medium',
  includeCapitalLetters: boolean = false,
  includeSpecialCharacters: boolean = false
): string[] {
  const pool = getWordListBySize(wordListSize);
  const words: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    // Semi-random deterministic spread to provide variety without pure duplicates
    const wordIndex = (i * 37 + (i % 7) * 13) % pool.length;
    let word = pool[wordIndex].toLowerCase();

    if (includeCapitalLetters) {
      // Natural capitalization at the start of pseudo-sentences (every 7-9 words)
      if (i % 8 === 0) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
    }

    if (includeSpecialCharacters) {
      // Natural punctuation: period at pseudo-sentence ends, comma mid-sentence
      if ((i + 1) % 8 === 0 && i !== wordCount - 1) {
        word += '.';
      } else if (i % 8 === 4) {
        word += ',';
      }
    }

    words.push(word);
  }

  return words;
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
 * Generates an appropriate Passage for Time, Words, Paragraph, or Characters mode.
 */
export function generateTestPassage({
  language,
  difficulty,
  testType,
  targetCount,
  textSource = 'common',
  includeCapitalLetters = false,
  includeSpecialCharacters = false,
  wordListSize = 'medium',
}: GeneratePassageOptions): Passage {
  const diffCapitalized = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  // 1. Paragraph Mode
  if (testType === 'paragraph') {
    let rawText = '';
    if (language === 'hi') {
      const sources = getSourceTexts('hi', difficulty);
      const idx = Math.floor(Math.random() * sources.length) % (sources.length || 1);
      rawText = sources[idx] || 'अभ्यास और धैर्य से सफलता प्राप्त होती है।';
    } else {
      // Select an everyday readable paragraph
      const pool = difficulty === 'hard' ? PASSAGES.map((p) => p.text) : EVERYDAY_PARAGRAPHS;
      const idx = Math.floor(Math.random() * pool.length) % pool.length;
      rawText = pool[idx] || EVERYDAY_PARAGRAPHS[0];
    }

    const formattedText = formatPassageText(
      rawText,
      language,
      includeCapitalLetters,
      includeSpecialCharacters
    );

    return {
      id: `paragraph-${language}-${difficulty}`,
      title: `${diffCapitalized} — Paragraph Test`,
      text: formattedText,
      language,
      difficulty,
      includeCapitalLetters,
      includeSpecialCharacters,
      textSource,
    };
  }

  // 2. Words Mode
  if (testType === 'words') {
    const targetWords = targetCount && targetCount > 0 ? targetCount : 50;

    let chosenWords: string[] = [];
    if (language === 'en' && textSource === 'common') {
      chosenWords = buildCommonWords(
        targetWords,
        wordListSize,
        includeCapitalLetters,
        includeSpecialCharacters
      );
    } else {
      const sources = getSourceTexts(language, difficulty);
      const allWords: string[] = [];
      for (const text of sources) {
        allWords.push(...text.split(/\s+/).filter(Boolean));
      }
      let poolIndex = 0;
      while (chosenWords.length < targetWords && allWords.length > 0) {
        chosenWords.push(allWords[poolIndex % allWords.length]);
        poolIndex++;
      }
      chosenWords = chosenWords.map((w) =>
        formatPassageText(w, language, includeCapitalLetters, includeSpecialCharacters)
      ).filter(Boolean);
    }

    const generatedText = chosenWords.join(' ');

    return {
      id: `words-${language}-${difficulty}-${targetWords}`,
      title: `${diffCapitalized} — ${targetWords} Words`,
      text: generatedText,
      language,
      difficulty,
      includeCapitalLetters,
      includeSpecialCharacters,
      textSource,
      wordListSize,
    };
  }

  // 3. Characters Mode
  if (testType === 'characters') {
    const targetChars = targetCount && targetCount > 0 ? targetCount : 250;
    const sources = getSourceTexts(language, difficulty);
    let combined = sources.join(' ');

    combined = formatPassageText(combined, language, includeCapitalLetters, includeSpecialCharacters);

    let graphemes = segmentGraphemes(combined, language);
    while (graphemes.length < targetChars) {
      combined += ' ' + sources.join(' ');
      combined = formatPassageText(combined, language, includeCapitalLetters, includeSpecialCharacters);
      graphemes = segmentGraphemes(combined, language);
    }

    const slicedGraphemes = graphemes.slice(0, targetChars);
    const generatedText = slicedGraphemes.join('');

    return {
      id: `chars-${language}-${difficulty}-${targetChars}`,
      title: `${diffCapitalized} — ${targetChars} Characters`,
      text: generatedText,
      language,
      difficulty,
      includeCapitalLetters,
      includeSpecialCharacters,
      textSource,
    };
  }

  // 4. Time Mode (Default: provides abundant supply of words)
  const targetWords = 1000;
  let chosenWords: string[] = [];

  if (language === 'en' && textSource === 'common') {
    chosenWords = buildCommonWords(
      targetWords,
      wordListSize,
      includeCapitalLetters,
      includeSpecialCharacters
    );
  } else {
    const sources = getSourceTexts(language, difficulty);
    const allWords: string[] = [];
    for (const text of sources) {
      allWords.push(...text.split(/\s+/).filter(Boolean));
    }
    let poolIndex = 0;
    while (chosenWords.length < targetWords && allWords.length > 0) {
      chosenWords.push(allWords[poolIndex % allWords.length]);
      poolIndex++;
    }
    chosenWords = chosenWords.map((w) =>
      formatPassageText(w, language, includeCapitalLetters, includeSpecialCharacters)
    ).filter(Boolean);
  }

  const generatedText = chosenWords.join(' ');

  return {
    id: `time-${language}-${difficulty}`,
    title: `${diffCapitalized} — Time Test`,
    text: generatedText,
    language,
    difficulty,
    includeCapitalLetters,
    includeSpecialCharacters,
    textSource,
    wordListSize,
  };
}

/**
 * Dynamically appends additional text to a TypingState passage in Time mode
 * so that the user never runs out of text while the test is still running.
 * Appended words are formatted with the exact same pipeline and active preferences stored on the passage.
 */
export function appendPassageContent(
  state: TypingState,
  additionalWordCount: number = 80
): TypingState {
  const {
    language,
    difficulty,
    includeCapitalLetters = false,
    includeSpecialCharacters = false,
    textSource,
    wordListSize = 'medium',
  } = state.passage;

  let rawWords: string[] = [];
  if (language === 'en' && textSource === 'common') {
    rawWords = buildCommonWords(
      additionalWordCount,
      wordListSize,
      includeCapitalLetters,
      includeSpecialCharacters
    );
  } else {
    const sources = getSourceTexts(language, difficulty);
    const allWords: string[] = [];
    for (const text of sources) {
      allWords.push(...text.split(/\s+/).filter(Boolean));
    }
    if (allWords.length === 0) return state;

    const currentWords = state.passage.text.split(/\s+/).filter(Boolean).length;
    for (let i = 0; i < additionalWordCount; i++) {
      rawWords.push(allWords[(currentWords + i) % allWords.length]);
    }
  }

  // Format all appended words using the exact canonical formatPassageText function
  const formattedWords = rawWords
    .map((w) => formatPassageText(w, language, includeCapitalLetters, includeSpecialCharacters))
    .filter(Boolean);

  if (formattedWords.length === 0) return state;

  const addedText = ' ' + formattedWords.join(' ');
  const addedGraphemes = segmentGraphemes(addedText, language);
  const addedCharacters: CharacterItem[] = addedGraphemes.map((char) => ({
    char,
    state: 'untyped',
  }));

  return {
    ...state,
    passage: {
      ...state.passage,
      text: state.passage.text + addedText,
      includeCapitalLetters,
      includeSpecialCharacters,
    },
    characters: [...state.characters, ...addedCharacters],
  };
}
