/**
 * Keyboard Utilities & Next-Key Mapping Adapters
 * Pure, deterministic functions for translating typing state into visual keyboard highlights.
 */

import { KeyboardHighlightState, KeyMappingResult } from './keyboardTypes';
import { TypingState, TypingLanguage } from './types';
import { normalizeNFC } from './textUtils';

// English QWERTY keycode mappings
const ENGLISH_CHAR_MAP: Record<string, KeyMappingResult> = {
  // Space
  ' ': { code: 'Space', requiresShift: false, displayChar: 'Space' },
  // Row 0 Numbers & Symbols
  '`': { code: 'Backquote', requiresShift: false, displayChar: '`' },
  '~': { code: 'Backquote', requiresShift: true, displayChar: '~' },
  '1': { code: 'Digit1', requiresShift: false, displayChar: '1' },
  '!': { code: 'Digit1', requiresShift: true, displayChar: '!' },
  '2': { code: 'Digit2', requiresShift: false, displayChar: '2' },
  '@': { code: 'Digit2', requiresShift: true, displayChar: '@' },
  '3': { code: 'Digit3', requiresShift: false, displayChar: '3' },
  '#': { code: 'Digit3', requiresShift: true, displayChar: '#' },
  '4': { code: 'Digit4', requiresShift: false, displayChar: '4' },
  '$': { code: 'Digit4', requiresShift: true, displayChar: '$' },
  '5': { code: 'Digit5', requiresShift: false, displayChar: '5' },
  '%': { code: 'Digit5', requiresShift: true, displayChar: '%' },
  '6': { code: 'Digit6', requiresShift: false, displayChar: '6' },
  '^': { code: 'Digit6', requiresShift: true, displayChar: '^' },
  '7': { code: 'Digit7', requiresShift: false, displayChar: '7' },
  '&': { code: 'Digit7', requiresShift: true, displayChar: '&' },
  '8': { code: 'Digit8', requiresShift: false, displayChar: '8' },
  '*': { code: 'Digit8', requiresShift: true, displayChar: '*' },
  '9': { code: 'Digit9', requiresShift: false, displayChar: '9' },
  '(': { code: 'Digit9', requiresShift: true, displayChar: '(' },
  '0': { code: 'Digit0', requiresShift: false, displayChar: '0' },
  ')': { code: 'Digit0', requiresShift: true, displayChar: ')' },
  '-': { code: 'Minus', requiresShift: false, displayChar: '-' },
  '_': { code: 'Minus', requiresShift: true, displayChar: '_' },
  '=': { code: 'Equal', requiresShift: false, displayChar: '=' },
  '+': { code: 'Equal', requiresShift: true, displayChar: '+' },

  // Row 1
  'q': { code: 'KeyQ', requiresShift: false, displayChar: 'Q' },
  'Q': { code: 'KeyQ', requiresShift: true, displayChar: 'Q' },
  'w': { code: 'KeyW', requiresShift: false, displayChar: 'W' },
  'W': { code: 'KeyW', requiresShift: true, displayChar: 'W' },
  'e': { code: 'KeyE', requiresShift: false, displayChar: 'E' },
  'E': { code: 'KeyE', requiresShift: true, displayChar: 'E' },
  'r': { code: 'KeyR', requiresShift: false, displayChar: 'R' },
  'R': { code: 'KeyR', requiresShift: true, displayChar: 'R' },
  't': { code: 'KeyT', requiresShift: false, displayChar: 'T' },
  'T': { code: 'KeyT', requiresShift: true, displayChar: 'T' },
  'y': { code: 'KeyY', requiresShift: false, displayChar: 'Y' },
  'Y': { code: 'KeyY', requiresShift: true, displayChar: 'Y' },
  'u': { code: 'KeyU', requiresShift: false, displayChar: 'U' },
  'U': { code: 'KeyU', requiresShift: true, displayChar: 'U' },
  'i': { code: 'KeyI', requiresShift: false, displayChar: 'I' },
  'I': { code: 'KeyI', requiresShift: true, displayChar: 'I' },
  'o': { code: 'KeyO', requiresShift: false, displayChar: 'O' },
  'O': { code: 'KeyO', requiresShift: true, displayChar: 'O' },
  'p': { code: 'KeyP', requiresShift: false, displayChar: 'P' },
  'P': { code: 'KeyP', requiresShift: true, displayChar: 'P' },
  '[': { code: 'BracketLeft', requiresShift: false, displayChar: '[' },
  '{': { code: 'BracketLeft', requiresShift: true, displayChar: '{' },
  ']': { code: 'BracketRight', requiresShift: false, displayChar: ']' },
  '}': { code: 'BracketRight', requiresShift: true, displayChar: '}' },
  '\\': { code: 'Backslash', requiresShift: false, displayChar: '\\' },
  '|': { code: 'Backslash', requiresShift: true, displayChar: '|' },

  // Row 2
  'a': { code: 'KeyA', requiresShift: false, displayChar: 'A' },
  'A': { code: 'KeyA', requiresShift: true, displayChar: 'A' },
  's': { code: 'KeyS', requiresShift: false, displayChar: 'S' },
  'S': { code: 'KeyS', requiresShift: true, displayChar: 'S' },
  'd': { code: 'KeyD', requiresShift: false, displayChar: 'D' },
  'D': { code: 'KeyD', requiresShift: true, displayChar: 'D' },
  'f': { code: 'KeyF', requiresShift: false, displayChar: 'F' },
  'F': { code: 'KeyF', requiresShift: true, displayChar: 'F' },
  'g': { code: 'KeyG', requiresShift: false, displayChar: 'G' },
  'G': { code: 'KeyG', requiresShift: true, displayChar: 'G' },
  'h': { code: 'KeyH', requiresShift: false, displayChar: 'H' },
  'H': { code: 'KeyH', requiresShift: true, displayChar: 'H' },
  'j': { code: 'KeyJ', requiresShift: false, displayChar: 'J' },
  'J': { code: 'KeyJ', requiresShift: true, displayChar: 'J' },
  'k': { code: 'KeyK', requiresShift: false, displayChar: 'K' },
  'K': { code: 'KeyK', requiresShift: true, displayChar: 'K' },
  'l': { code: 'KeyL', requiresShift: false, displayChar: 'L' },
  'L': { code: 'KeyL', requiresShift: true, displayChar: 'L' },
  ';': { code: 'Semicolon', requiresShift: false, displayChar: ';' },
  ':': { code: 'Semicolon', requiresShift: true, displayChar: ':' },
  "'": { code: 'Quote', requiresShift: false, displayChar: "'" },
  '"': { code: 'Quote', requiresShift: true, displayChar: '"' },

  // Row 3
  'z': { code: 'KeyZ', requiresShift: false, displayChar: 'Z' },
  'Z': { code: 'KeyZ', requiresShift: true, displayChar: 'Z' },
  'x': { code: 'KeyX', requiresShift: false, displayChar: 'X' },
  'X': { code: 'KeyX', requiresShift: true, displayChar: 'X' },
  'c': { code: 'KeyC', requiresShift: false, displayChar: 'C' },
  'C': { code: 'KeyC', requiresShift: true, displayChar: 'C' },
  'v': { code: 'KeyV', requiresShift: false, displayChar: 'V' },
  'V': { code: 'KeyV', requiresShift: true, displayChar: 'V' },
  'b': { code: 'KeyB', requiresShift: false, displayChar: 'B' },
  'B': { code: 'KeyB', requiresShift: true, displayChar: 'B' },
  'n': { code: 'KeyN', requiresShift: false, displayChar: 'N' },
  'N': { code: 'KeyN', requiresShift: true, displayChar: 'N' },
  'm': { code: 'KeyM', requiresShift: false, displayChar: 'M' },
  'M': { code: 'KeyM', requiresShift: true, displayChar: 'M' },
  ',': { code: 'Comma', requiresShift: false, displayChar: ',' },
  '<': { code: 'Comma', requiresShift: true, displayChar: '<' },
  '.': { code: 'Period', requiresShift: false, displayChar: '.' },
  '>': { code: 'Period', requiresShift: true, displayChar: '>' },
  '/': { code: 'Slash', requiresShift: false, displayChar: '/' },
  '?': { code: 'Slash', requiresShift: true, displayChar: '?' },
};

// Hindi InScript atomic key mappings (IS 13194 standards)
const INSCRIPT_ATOMIC_MAP: Record<string, KeyMappingResult> = {
  // Space
  ' ': { code: 'Space', requiresShift: false, displayChar: 'Space' },

  // Independent Vowels
  'अ': { code: 'KeyD', requiresShift: true, displayChar: 'अ' },
  'आ': { code: 'KeyE', requiresShift: true, displayChar: 'आ' },
  'इ': { code: 'KeyF', requiresShift: true, displayChar: 'इ' },
  'ई': { code: 'KeyR', requiresShift: true, displayChar: 'ई' },
  'उ': { code: 'KeyG', requiresShift: true, displayChar: 'उ' },
  'ऊ': { code: 'KeyT', requiresShift: true, displayChar: 'ऊ' },
  'ऋ': { code: 'Equal', requiresShift: true, displayChar: 'ऋ' },
  'ए': { code: 'KeyS', requiresShift: true, displayChar: 'ए' },
  'ऐ': { code: 'KeyW', requiresShift: true, displayChar: 'ऐ' },
  'ओ': { code: 'KeyA', requiresShift: true, displayChar: 'ओ' },
  'औ': { code: 'KeyQ', requiresShift: true, displayChar: 'औ' },
  'ऑ': { code: 'Backslash', requiresShift: true, displayChar: 'ऑ' },
  'ऍ': { code: 'Digit1', requiresShift: true, displayChar: 'ऍ' },

  // Dependent Matras
  'ा': { code: 'KeyE', requiresShift: false, displayChar: 'ा' },
  'ि': { code: 'KeyF', requiresShift: false, displayChar: 'ि' },
  'ी': { code: 'KeyR', requiresShift: false, displayChar: 'ी' },
  'ु': { code: 'KeyG', requiresShift: false, displayChar: 'ु' },
  'ू': { code: 'KeyT', requiresShift: false, displayChar: 'ू' },
  'ृ': { code: 'Equal', requiresShift: false, displayChar: 'ृ' },
  'े': { code: 'KeyS', requiresShift: false, displayChar: 'े' },
  'ै': { code: 'KeyW', requiresShift: false, displayChar: 'ै' },
  'ो': { code: 'KeyA', requiresShift: false, displayChar: 'ो' },
  'ौ': { code: 'KeyQ', requiresShift: false, displayChar: 'ौ' },
  'ॉ': { code: 'Backslash', requiresShift: false, displayChar: 'ॉ' },
  'ॅ': { code: 'Digit2', requiresShift: true, displayChar: 'ॅ' },

  // Halant (Virama) & Marks
  '्': { code: 'KeyD', requiresShift: false, displayChar: '्' },
  'ं': { code: 'KeyX', requiresShift: false, displayChar: 'ं' },
  'ँ': { code: 'KeyX', requiresShift: true, displayChar: 'ँ' },
  'ः': { code: 'Minus', requiresShift: true, displayChar: 'ः' },
  '़': { code: 'BracketRight', requiresShift: false, displayChar: '़' },

  // Consonants
  'क': { code: 'KeyK', requiresShift: false, displayChar: 'क' },
  'ख': { code: 'KeyK', requiresShift: true, displayChar: 'ख' },
  'ग': { code: 'KeyI', requiresShift: false, displayChar: 'ग' },
  'घ': { code: 'KeyI', requiresShift: true, displayChar: 'घ' },
  'ङ': { code: 'KeyU', requiresShift: true, displayChar: 'ङ' },

  'च': { code: 'Semicolon', requiresShift: false, displayChar: 'च' },
  'छ': { code: 'Semicolon', requiresShift: true, displayChar: 'छ' },
  'ज': { code: 'KeyP', requiresShift: false, displayChar: 'ज' },
  'झ': { code: 'KeyP', requiresShift: true, displayChar: 'झ' },
  'ञ': { code: 'BracketRight', requiresShift: true, displayChar: 'ञ' },

  'ट': { code: 'Quote', requiresShift: false, displayChar: 'ट' },
  'ठ': { code: 'Quote', requiresShift: true, displayChar: 'ठ' },
  'ड': { code: 'BracketLeft', requiresShift: false, displayChar: 'ड' },
  'ढ': { code: 'BracketLeft', requiresShift: true, displayChar: 'ढ' },
  'ण': { code: 'KeyC', requiresShift: true, displayChar: 'ण' },

  'त': { code: 'KeyL', requiresShift: false, displayChar: 'त' },
  'थ': { code: 'KeyL', requiresShift: true, displayChar: 'थ' },
  'द': { code: 'KeyO', requiresShift: false, displayChar: 'द' },
  'ध': { code: 'KeyO', requiresShift: true, displayChar: 'ध' },
  'न': { code: 'KeyV', requiresShift: false, displayChar: 'न' },

  'प': { code: 'KeyH', requiresShift: false, displayChar: 'प' },
  'फ': { code: 'KeyH', requiresShift: true, displayChar: 'फ' },
  'ब': { code: 'KeyY', requiresShift: false, displayChar: 'ब' },
  'भ': { code: 'KeyY', requiresShift: true, displayChar: 'भ' },
  'म': { code: 'KeyC', requiresShift: false, displayChar: 'म' },

  'य': { code: 'Slash', requiresShift: false, displayChar: 'य' },
  'र': { code: 'KeyJ', requiresShift: false, displayChar: 'र' },
  'ल': { code: 'KeyN', requiresShift: false, displayChar: 'ल' },
  'व': { code: 'KeyB', requiresShift: false, displayChar: 'व' },

  'श': { code: 'KeyM', requiresShift: true, displayChar: 'श' },
  'ष': { code: 'Comma', requiresShift: true, displayChar: 'ष' },
  'स': { code: 'KeyM', requiresShift: false, displayChar: 'स' },
  'ह': { code: 'KeyU', requiresShift: false, displayChar: 'ह' },

  'ळ': { code: 'KeyN', requiresShift: true, displayChar: 'ळ' },
  'ऱ': { code: 'KeyJ', requiresShift: true, displayChar: 'ऱ' },

  // Conjuncts with dedicated shortcuts in standard InScript
  'ज्ञ': { code: 'Digit5', requiresShift: true, displayChar: 'ज्ञ' },
  'त्र': { code: 'Digit6', requiresShift: true, displayChar: 'त्र' },
  'क्ष': { code: 'Digit7', requiresShift: true, displayChar: 'क्ष' },
  'श्र': { code: 'Digit8', requiresShift: true, displayChar: 'श्र' },

  // Punctuation
  '।': { code: 'Period', requiresShift: true, displayChar: '।' },
  ',': { code: 'Comma', requiresShift: false, displayChar: ',' },
  '.': { code: 'Period', requiresShift: false, displayChar: '.' },
  '-': { code: 'Minus', requiresShift: false, displayChar: '-' },
  '?': { code: 'Slash', requiresShift: true, displayChar: '?' },

  // Digits
  '1': { code: 'Digit1', requiresShift: false, displayChar: '1' },
  '2': { code: 'Digit2', requiresShift: false, displayChar: '2' },
  '3': { code: 'Digit3', requiresShift: false, displayChar: '3' },
  '4': { code: 'Digit4', requiresShift: false, displayChar: '4' },
  '5': { code: 'Digit5', requiresShift: false, displayChar: '5' },
  '6': { code: 'Digit6', requiresShift: false, displayChar: '6' },
  '7': { code: 'Digit7', requiresShift: false, displayChar: '7' },
  '8': { code: 'Digit8', requiresShift: false, displayChar: '8' },
  '9': { code: 'Digit9', requiresShift: false, displayChar: '9' },
  '0': { code: 'Digit0', requiresShift: false, displayChar: '0' },
};

/**
 * Maps an English character to its QWERTY key representation.
 */
export function mapEnglishCharToKey(char: string): KeyMappingResult | null {
  if (!char) return null;
  return ENGLISH_CHAR_MAP[char] || null;
}

/**
 * Maps a Devanagari grapheme to its InScript key codes, taking pendingComposition into account.
 * Decomposes multi-keystroke graphemes (e.g. 'भा' -> 'भ' then 'ा') accurately.
 */
export function mapInScriptGraphemeToKeyCodes(
  grapheme: string,
  pendingComposition: string = ''
): {
  nextCodes: string[];
  requiresShift: boolean;
  displayLabel: string;
  unmapped?: boolean;
} {
  const normGrapheme = normalizeNFC(grapheme);
  const normPending = normalizeNFC(pendingComposition);

  // If there is no pending composition, check if the whole grapheme is directly atomic
  if (!normPending) {
    const atomic = INSCRIPT_ATOMIC_MAP[normGrapheme];
    if (atomic) {
      const nextCodes = atomic.requiresShift
        ? ['ShiftLeft', atomic.code]
        : [atomic.code];
      return {
        nextCodes,
        requiresShift: atomic.requiresShift,
        displayLabel: atomic.displayChar,
      };
    }
  }

  // If the grapheme starts with the pending composition, identify the remainder
  if (normPending && normGrapheme.startsWith(normPending)) {
    const remainder = normGrapheme.slice(normPending.length);
    if (remainder) {
      // Find the next atomic unit in remainder
      // Check first code point / mark of remainder
      const nextUnit = Array.from(remainder)[0];
      const match = INSCRIPT_ATOMIC_MAP[nextUnit];
      if (match) {
        const nextCodes = match.requiresShift
          ? ['ShiftLeft', match.code]
          : [match.code];
        return {
          nextCodes,
          requiresShift: match.requiresShift,
          displayLabel: match.displayChar,
        };
      }
    }
  }

  // If nothing is pending yet and the grapheme is multi-character (e.g. 'भा' = 'भ' + 'ा')
  if (!normPending && normGrapheme.length > 1) {
    const firstCodePoint = Array.from(normGrapheme)[0];
    const match = INSCRIPT_ATOMIC_MAP[firstCodePoint];
    if (match) {
      const nextCodes = match.requiresShift
        ? ['ShiftLeft', match.code]
        : [match.code];
      return {
        nextCodes,
        requiresShift: match.requiresShift,
        displayLabel: match.displayChar,
      };
    }
  }

  // Fallback: If no reliable physical InScript key is mapped, do NOT guess a false key
  return {
    nextCodes: [],
    requiresShift: false,
    displayLabel: normGrapheme,
    unmapped: true,
  };
}

/**
 * Pure adapter creating the full highlight state for the VirtualKeyboard.
 */
export function getKeyboardHighlightState(params: {
  typingState: TypingState;
  language: TypingLanguage;
  recentKey?: { code?: string; status?: 'correct' | 'incorrect' } | null;
  mistakes?: { character: string; count: number }[];
  focusKeys?: string[];
}): KeyboardHighlightState {
  const { typingState, language, recentKey, mistakes, focusKeys } = params;

  let nextKeyCodes: string[] = [];
  let isShiftRequired = false;
  let expectedDisplayGrapheme = '';
  let unmappedNotice = false;

  // Determine next expected key if test is running or idle
  if (
    typingState.status !== 'completed' &&
    typingState.currentIndex < typingState.characters.length
  ) {
    const currentItem = typingState.characters[typingState.currentIndex];
    const expectedChar = currentItem.char;
    const pending = currentItem.pendingComposition ?? '';
    expectedDisplayGrapheme = expectedChar;

    if (language === 'hi') {
      const inscriptMap = mapInScriptGraphemeToKeyCodes(expectedChar, pending);
      nextKeyCodes = inscriptMap.nextCodes;
      isShiftRequired = inscriptMap.requiresShift;
      if (inscriptMap.unmapped) {
        unmappedNotice = true;
      }
    } else {
      const enMap = mapEnglishCharToKey(expectedChar);
      if (enMap) {
        nextKeyCodes = enMap.requiresShift
          ? ['ShiftLeft', enMap.code]
          : [enMap.code];
        isShiftRequired = enMap.requiresShift;
      } else {
        unmappedNotice = true;
      }
    }
  }

  // Calculate mistake frequency map from analytics
  const mistakeFrequencies = new Map<string, number>();
  if (mistakes && mistakes.length > 0) {
    for (const m of mistakes) {
      if (language === 'hi') {
        const mapped = mapInScriptGraphemeToKeyCodes(m.character);
        const code = mapped.nextCodes.find((c) => c !== 'ShiftLeft');
        if (code) {
          mistakeFrequencies.set(code, (mistakeFrequencies.get(code) || 0) + m.count);
        }
      } else {
        const mapped = mapEnglishCharToKey(m.character);
        if (mapped) {
          mistakeFrequencies.set(
            mapped.code,
            (mistakeFrequencies.get(mapped.code) || 0) + m.count
          );
        }
      }
    }
  }

  // Calculate focus keys from practice engine
  const focusKeyCodes: string[] = [];
  if (focusKeys && focusKeys.length > 0) {
    for (const fk of focusKeys) {
      if (language === 'hi') {
        const mapped = mapInScriptGraphemeToKeyCodes(fk);
        const code = mapped.nextCodes.find((c) => c !== 'ShiftLeft');
        if (code && !focusKeyCodes.includes(code)) {
          focusKeyCodes.push(code);
        }
      } else {
        const mapped = mapEnglishCharToKey(fk);
        if (mapped && !focusKeyCodes.includes(mapped.code)) {
          focusKeyCodes.push(mapped.code);
        }
      }
    }
  }

  const activeKeyCodes = recentKey?.code ? [recentKey.code] : [];
  const lastCorrectCode = recentKey?.status === 'correct' ? recentKey.code : undefined;
  const lastIncorrectCode = recentKey?.status === 'incorrect' ? recentKey.code : undefined;

  return {
    nextKeyCodes,
    isShiftRequired,
    expectedDisplayGrapheme,
    unmappedNotice,
    activeKeyCodes,
    lastCorrectCode,
    lastIncorrectCode,
    mistakeFrequencies,
    focusKeyCodes,
  };
}
