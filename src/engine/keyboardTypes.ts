/**
 * Type definitions for the Keyboard Visualization Engine
 * Phase 9: Keyboard Visualization
 */

import { TypingLanguage } from './types';

export type KeyboardLayoutId = 'qwerty-en' | 'inscript-hi';

export type KeyGroup =
  | 'alphanumeric'
  | 'modifier'
  | 'control'
  | 'space'
  | 'punctuation';

export type KeyVisualState =
  | 'default'
  | 'next'
  | 'pressed'
  | 'correct'
  | 'incorrect'
  | 'mistake'
  | 'focus';

export interface KeyDefinition {
  id: string; // e.g. 'KeyQ', 'KeyA', 'Space', 'Backspace'
  code: string; // Standard KeyboardEvent.code (e.g. 'KeyQ', 'Digit1', 'Space')
  primaryLabel: string; // e.g. 'q' or 'Q', or Devanagari 'ौ'
  shiftedLabel?: string; // e.g. 'Q' or Devanagari 'औ'
  widthMultiplier?: number; // 1 = standard key, 1.5 = 1.5u, 2 = 2u, 6 = space
  group?: KeyGroup;
  row: number; // 0: numbers, 1: top, 2: home, 3: bottom, 4: space
}

export interface KeyboardLayout {
  id: KeyboardLayoutId;
  name: string; // e.g. "English — QWERTY" or "हिंदी — InScript"
  language: TypingLanguage;
  isReferenceOnly?: boolean; // For InScript to indicate reference status
  description: string;
  rows: KeyDefinition[][];
}

export interface KeyMappingResult {
  code: string;
  requiresShift: boolean;
  displayChar: string;
}

export interface KeyboardHighlightState {
  nextKeyCodes: string[]; // Codes for next key(s), e.g. ['KeyG'] or ['ShiftLeft', 'KeyG']
  isShiftRequired: boolean;
  expectedDisplayGrapheme: string;
  unmappedNotice?: boolean;
  activeKeyCodes: string[]; // Currently pressed codes
  lastCorrectCode?: string;
  lastIncorrectCode?: string;
  mistakeFrequencies: Map<string, number>; // code -> mistake count
  focusKeyCodes: string[]; // codes in practice focus mode
}
