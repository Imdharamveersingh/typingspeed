import { describe, it, expect } from 'vitest';
import {
  QWERTY_EN_LAYOUT,
  INSCRIPT_HI_LAYOUT,
  getLayoutForLanguage,
  flattenLayoutKeys,
} from './keyboardLayouts';
import {
  mapEnglishCharToKey,
  mapInScriptGraphemeToKeyCodes,
  getKeyboardHighlightState,
} from './keyboardUtils';
import { createInitialState } from './typingEngine';
import { DEFAULT_PASSAGE } from '@/data/passages';
import { DEFAULT_HINDI_PASSAGE } from '@/data/hindiPassages';

describe('Keyboard Layouts Integrity', () => {
  it('generates valid English QWERTY layout with 5 rows and unique key IDs', () => {
    expect(QWERTY_EN_LAYOUT.id).toBe('qwerty-en');
    expect(QWERTY_EN_LAYOUT.language).toBe('en');
    expect(QWERTY_EN_LAYOUT.isReferenceOnly).toBe(false);
    expect(QWERTY_EN_LAYOUT.rows.length).toBe(5);

    const keys = flattenLayoutKeys(QWERTY_EN_LAYOUT);
    expect(keys.length).toBeGreaterThan(45);

    // Verify key IDs uniqueness
    const ids = keys.map((k) => k.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Spot-check standard keys
    expect(keys.some((k) => k.code === 'KeyQ' && k.primaryLabel === 'q')).toBe(true);
    expect(keys.some((k) => k.code === 'Space' && k.group === 'space')).toBe(true);
    expect(keys.some((k) => k.code === 'Backspace')).toBe(true);
  });

  it('generates valid Hindi InScript layout marked as reference layout with 5 rows', () => {
    expect(INSCRIPT_HI_LAYOUT.id).toBe('inscript-hi');
    expect(INSCRIPT_HI_LAYOUT.language).toBe('hi');
    expect(INSCRIPT_HI_LAYOUT.isReferenceOnly).toBe(true);
    expect(INSCRIPT_HI_LAYOUT.rows.length).toBe(5);

    const keys = flattenLayoutKeys(INSCRIPT_HI_LAYOUT);
    expect(keys.length).toBeGreaterThan(45);

    // Verify key IDs uniqueness
    const ids = keys.map((k) => k.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Spot-check InScript keys
    expect(keys.some((k) => k.code === 'KeyK' && k.primaryLabel === 'क')).toBe(true);
    expect(keys.some((k) => k.code === 'KeyE' && k.primaryLabel === 'ा')).toBe(true);
    expect(keys.some((k) => k.code === 'Space')).toBe(true);
  });

  it('getLayoutForLanguage selects correct layout according to language', () => {
    expect(getLayoutForLanguage('en').id).toBe('qwerty-en');
    expect(getLayoutForLanguage('hi').id).toBe('inscript-hi');
  });
});

describe('English Key Mapping', () => {
  it('maps lowercase English characters without shift', () => {
    const resG = mapEnglishCharToKey('g');
    expect(resG).toEqual({ code: 'KeyG', requiresShift: false, displayChar: 'G' });

    const resA = mapEnglishCharToKey('a');
    expect(resA).toEqual({ code: 'KeyA', requiresShift: false, displayChar: 'A' });
  });

  it('maps uppercase English characters with shift', () => {
    const resG = mapEnglishCharToKey('G');
    expect(resG).toEqual({ code: 'KeyG', requiresShift: true, displayChar: 'G' });

    const resZ = mapEnglishCharToKey('Z');
    expect(resZ).toEqual({ code: 'KeyZ', requiresShift: true, displayChar: 'Z' });
  });

  it('maps numbers and symbols correctly', () => {
    expect(mapEnglishCharToKey('1')).toEqual({ code: 'Digit1', requiresShift: false, displayChar: '1' });
    expect(mapEnglishCharToKey('!')).toEqual({ code: 'Digit1', requiresShift: true, displayChar: '!' });
    expect(mapEnglishCharToKey(' ')).toEqual({ code: 'Space', requiresShift: false, displayChar: 'Space' });
    expect(mapEnglishCharToKey(',')).toEqual({ code: 'Comma', requiresShift: false, displayChar: ',' });
    expect(mapEnglishCharToKey('?')).toEqual({ code: 'Slash', requiresShift: true, displayChar: '?' });
  });

  it('returns null for unmappable characters', () => {
    expect(mapEnglishCharToKey('©')).toBeNull();
  });
});

describe('Hindi InScript Key Mapping & Decomposition', () => {
  it('maps atomic Hindi consonants and vowels', () => {
    const resKa = mapInScriptGraphemeToKeyCodes('क');
    expect(resKa).toEqual({
      nextCodes: ['KeyK'],
      requiresShift: false,
      displayLabel: 'क',
    });

    const resKha = mapInScriptGraphemeToKeyCodes('ख');
    expect(resKha).toEqual({
      nextCodes: ['ShiftLeft', 'KeyK'],
      requiresShift: true,
      displayLabel: 'ख',
    });

    const resAa = mapInScriptGraphemeToKeyCodes('आ');
    expect(resAa).toEqual({
      nextCodes: ['ShiftLeft', 'KeyE'],
      requiresShift: true,
      displayLabel: 'आ',
    });
  });

  it('maps atomic matras, virama, and punctuation', () => {
    expect(mapInScriptGraphemeToKeyCodes('ा')).toEqual({
      nextCodes: ['KeyE'],
      requiresShift: false,
      displayLabel: 'ा',
    });

    expect(mapInScriptGraphemeToKeyCodes('्')).toEqual({
      nextCodes: ['KeyD'],
      requiresShift: false,
      displayLabel: '्',
    });

    expect(mapInScriptGraphemeToKeyCodes('।')).toEqual({
      nextCodes: ['ShiftLeft', 'Period'],
      requiresShift: true,
      displayLabel: '।',
    });

    expect(mapInScriptGraphemeToKeyCodes(' ')).toEqual({
      nextCodes: ['Space'],
      requiresShift: false,
      displayLabel: 'Space',
    });
  });

  it('decomposes multi-keystroke compound grapheme (e.g. भा) with pending composition awareness', () => {
    // Stage 1: Nothing pending yet -> expects consonant 'भ' (Shift+KeyY)
    const step1 = mapInScriptGraphemeToKeyCodes('भा', '');
    expect(step1).toEqual({
      nextCodes: ['ShiftLeft', 'KeyY'],
      requiresShift: true,
      displayLabel: 'भ',
    });

    // Stage 2: Consonant 'भ' has been entered -> expects matra 'ा' (KeyE)
    const step2 = mapInScriptGraphemeToKeyCodes('भा', 'भ');
    expect(step2).toEqual({
      nextCodes: ['KeyE'],
      requiresShift: false,
      displayLabel: 'ा',
    });
  });

  it('handles unknown/unmappable graphemes without inventing false physical keys', () => {
    const unmapped = mapInScriptGraphemeToKeyCodes('€');
    expect(unmapped.unmapped).toBe(true);
    expect(unmapped.nextCodes).toEqual([]);
    expect(unmapped.displayLabel).toBe('€');
  });
});

describe('getKeyboardHighlightState Adapter', () => {
  it('derives expected next key for English typing state', () => {
    const state = createInitialState(DEFAULT_PASSAGE, 60);
    // First character of DEFAULT_PASSAGE is typically 'T' or a letter
    const firstChar = state.characters[0].char;
    const highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
    });

    expect(highlight.expectedDisplayGrapheme).toBe(firstChar);
    expect(highlight.nextKeyCodes.length).toBeGreaterThan(0);
  });

  it('derives expected next key for Hindi typing state', () => {
    const state = createInitialState(DEFAULT_HINDI_PASSAGE, 60);
    const firstChar = state.characters[0].char;
    const highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'hi',
    });

    expect(highlight.expectedDisplayGrapheme).toBe(firstChar);
    expect(highlight.nextKeyCodes.length).toBeGreaterThan(0);
  });

  it('maps mistake frequencies and focus keys correctly', () => {
    const state = createInitialState(DEFAULT_PASSAGE, 60);
    const highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
      mistakes: [
        { character: 'e', count: 4 },
        { character: 't', count: 2 },
      ],
      focusKeys: ['e', 'r'],
      recentKey: { code: 'KeyE', status: 'correct' },
    });

    expect(highlight.mistakeFrequencies.get('KeyE')).toBe(4);
    expect(highlight.mistakeFrequencies.get('KeyT')).toBe(2);
    expect(highlight.focusKeyCodes).toContain('KeyE');
    expect(highlight.focusKeyCodes).toContain('KeyR');
    expect(highlight.lastCorrectCode).toBe('KeyE');
  });

  it('handles completed state by clearing nextKeyCodes', () => {
    const state = {
      ...createInitialState(DEFAULT_PASSAGE, 60),
      status: 'completed' as const,
    };
    const highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
    });

    expect(highlight.nextKeyCodes).toEqual([]);
    expect(highlight.expectedDisplayGrapheme).toBe('');
  });

  it('tracks incorrect recent key in lastIncorrectCode', () => {
    const state = createInitialState(DEFAULT_PASSAGE, 60);
    const highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
      recentKey: { code: 'KeyZ', status: 'incorrect' },
    });

    expect(highlight.lastIncorrectCode).toBe('KeyZ');
    expect(highlight.lastCorrectCode).toBeUndefined();
    expect(highlight.activeKeyCodes).toEqual(['KeyZ']);
  });

  it('detects shift required for uppercase characters and shifted symbols', () => {
    // Artificial state where current character is uppercase 'H'
    const customPassage = {
      ...DEFAULT_PASSAGE,
      text: 'Hello',
    };
    const state = createInitialState(customPassage, 60);
    const highlight = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
    });

    expect(highlight.expectedDisplayGrapheme).toBe('H');
    expect(highlight.isShiftRequired).toBe(true);
    expect(highlight.nextKeyCodes).toContain('ShiftLeft');
    expect(highlight.nextKeyCodes).toContain('KeyH');
  });

  it('verifies row ordering from row 0 to row 4 across both layouts', () => {
    [QWERTY_EN_LAYOUT, INSCRIPT_HI_LAYOUT].forEach((layout) => {
      layout.rows.forEach((rowKeys, rowIdx) => {
        expect(rowKeys.length).toBeGreaterThan(0);
        rowKeys.forEach((key) => {
          expect(key.row).toBe(rowIdx);
        });
      });
    });
  });
});

