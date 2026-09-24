/**
 * Keyboard Layout Definitions
 * Supports:
 * - English QWERTY
 * - Hindi InScript (Reference Layout based on BIS IS 13194 / standard Windows InScript)
 */

import { KeyboardLayout, KeyDefinition } from './keyboardTypes';
import { TypingLanguage } from './types';

export const QWERTY_EN_LAYOUT: KeyboardLayout = {
  id: 'qwerty-en',
  name: 'English — QWERTY',
  language: 'en',
  isReferenceOnly: false,
  description: 'Standard English QWERTY layout optimized for touch typing guidance.',
  rows: [
    // Row 0: Number row
    [
      { id: 'Backquote', code: 'Backquote', primaryLabel: '`', shiftedLabel: '~', row: 0, group: 'punctuation' },
      { id: 'Digit1', code: 'Digit1', primaryLabel: '1', shiftedLabel: '!', row: 0, group: 'alphanumeric' },
      { id: 'Digit2', code: 'Digit2', primaryLabel: '2', shiftedLabel: '@', row: 0, group: 'alphanumeric' },
      { id: 'Digit3', code: 'Digit3', primaryLabel: '3', shiftedLabel: '#', row: 0, group: 'alphanumeric' },
      { id: 'Digit4', code: 'Digit4', primaryLabel: '4', shiftedLabel: '$', row: 0, group: 'alphanumeric' },
      { id: 'Digit5', code: 'Digit5', primaryLabel: '5', shiftedLabel: '%', row: 0, group: 'alphanumeric' },
      { id: 'Digit6', code: 'Digit6', primaryLabel: '6', shiftedLabel: '^', row: 0, group: 'alphanumeric' },
      { id: 'Digit7', code: 'Digit7', primaryLabel: '7', shiftedLabel: '&', row: 0, group: 'alphanumeric' },
      { id: 'Digit8', code: 'Digit8', primaryLabel: '8', shiftedLabel: '*', row: 0, group: 'alphanumeric' },
      { id: 'Digit9', code: 'Digit9', primaryLabel: '9', shiftedLabel: '(', row: 0, group: 'alphanumeric' },
      { id: 'Digit0', code: 'Digit0', primaryLabel: '0', shiftedLabel: ')', row: 0, group: 'alphanumeric' },
      { id: 'Minus', code: 'Minus', primaryLabel: '-', shiftedLabel: '_', row: 0, group: 'punctuation' },
      { id: 'Equal', code: 'Equal', primaryLabel: '=', shiftedLabel: '+', row: 0, group: 'punctuation' },
      { id: 'Backspace', code: 'Backspace', primaryLabel: 'Backspace', widthMultiplier: 2, row: 0, group: 'control' },
    ],
    // Row 1: Top row
    [
      { id: 'Tab', code: 'Tab', primaryLabel: 'Tab', widthMultiplier: 1.5, row: 1, group: 'control' },
      { id: 'KeyQ', code: 'KeyQ', primaryLabel: 'q', shiftedLabel: 'Q', row: 1, group: 'alphanumeric' },
      { id: 'KeyW', code: 'KeyW', primaryLabel: 'w', shiftedLabel: 'W', row: 1, group: 'alphanumeric' },
      { id: 'KeyE', code: 'KeyE', primaryLabel: 'e', shiftedLabel: 'E', row: 1, group: 'alphanumeric' },
      { id: 'KeyR', code: 'KeyR', primaryLabel: 'r', shiftedLabel: 'R', row: 1, group: 'alphanumeric' },
      { id: 'KeyT', code: 'KeyT', primaryLabel: 't', shiftedLabel: 'T', row: 1, group: 'alphanumeric' },
      { id: 'KeyY', code: 'KeyY', primaryLabel: 'y', shiftedLabel: 'Y', row: 1, group: 'alphanumeric' },
      { id: 'KeyU', code: 'KeyU', primaryLabel: 'u', shiftedLabel: 'U', row: 1, group: 'alphanumeric' },
      { id: 'KeyI', code: 'KeyI', primaryLabel: 'i', shiftedLabel: 'I', row: 1, group: 'alphanumeric' },
      { id: 'KeyO', code: 'KeyO', primaryLabel: 'o', shiftedLabel: 'O', row: 1, group: 'alphanumeric' },
      { id: 'KeyP', code: 'KeyP', primaryLabel: 'p', shiftedLabel: 'P', row: 1, group: 'alphanumeric' },
      { id: 'BracketLeft', code: 'BracketLeft', primaryLabel: '[', shiftedLabel: '{', row: 1, group: 'punctuation' },
      { id: 'BracketRight', code: 'BracketRight', primaryLabel: ']', shiftedLabel: '}', row: 1, group: 'punctuation' },
      { id: 'Backslash', code: 'Backslash', primaryLabel: '\\', shiftedLabel: '|', widthMultiplier: 1.5, row: 1, group: 'punctuation' },
    ],
    // Row 2: Home row
    [
      { id: 'CapsLock', code: 'CapsLock', primaryLabel: 'Caps', widthMultiplier: 1.75, row: 2, group: 'control' },
      { id: 'KeyA', code: 'KeyA', primaryLabel: 'a', shiftedLabel: 'A', row: 2, group: 'alphanumeric' },
      { id: 'KeyS', code: 'KeyS', primaryLabel: 's', shiftedLabel: 'S', row: 2, group: 'alphanumeric' },
      { id: 'KeyD', code: 'KeyD', primaryLabel: 'd', shiftedLabel: 'D', row: 2, group: 'alphanumeric' },
      { id: 'KeyF', code: 'KeyF', primaryLabel: 'f', shiftedLabel: 'F', row: 2, group: 'alphanumeric' },
      { id: 'KeyG', code: 'KeyG', primaryLabel: 'g', shiftedLabel: 'G', row: 2, group: 'alphanumeric' },
      { id: 'KeyH', code: 'KeyH', primaryLabel: 'h', shiftedLabel: 'H', row: 2, group: 'alphanumeric' },
      { id: 'KeyJ', code: 'KeyJ', primaryLabel: 'j', shiftedLabel: 'J', row: 2, group: 'alphanumeric' },
      { id: 'KeyK', code: 'KeyK', primaryLabel: 'k', shiftedLabel: 'K', row: 2, group: 'alphanumeric' },
      { id: 'KeyL', code: 'KeyL', primaryLabel: 'l', shiftedLabel: 'L', row: 2, group: 'alphanumeric' },
      { id: 'Semicolon', code: 'Semicolon', primaryLabel: ';', shiftedLabel: ':', row: 2, group: 'punctuation' },
      { id: 'Quote', code: 'Quote', primaryLabel: "'", shiftedLabel: '"', row: 2, group: 'punctuation' },
      { id: 'Enter', code: 'Enter', primaryLabel: 'Enter', widthMultiplier: 2.25, row: 2, group: 'control' },
    ],
    // Row 3: Bottom row
    [
      { id: 'ShiftLeft', code: 'ShiftLeft', primaryLabel: 'Shift', widthMultiplier: 2.25, row: 3, group: 'modifier' },
      { id: 'KeyZ', code: 'KeyZ', primaryLabel: 'z', shiftedLabel: 'Z', row: 3, group: 'alphanumeric' },
      { id: 'KeyX', code: 'KeyX', primaryLabel: 'x', shiftedLabel: 'X', row: 3, group: 'alphanumeric' },
      { id: 'KeyC', code: 'KeyC', primaryLabel: 'c', shiftedLabel: 'C', row: 3, group: 'alphanumeric' },
      { id: 'KeyV', code: 'KeyV', primaryLabel: 'v', shiftedLabel: 'V', row: 3, group: 'alphanumeric' },
      { id: 'KeyB', code: 'KeyB', primaryLabel: 'b', shiftedLabel: 'B', row: 3, group: 'alphanumeric' },
      { id: 'KeyN', code: 'KeyN', primaryLabel: 'n', shiftedLabel: 'N', row: 3, group: 'alphanumeric' },
      { id: 'KeyM', code: 'KeyM', primaryLabel: 'm', shiftedLabel: 'M', row: 3, group: 'alphanumeric' },
      { id: 'Comma', code: 'Comma', primaryLabel: ',', shiftedLabel: '<', row: 3, group: 'punctuation' },
      { id: 'Period', code: 'Period', primaryLabel: '.', shiftedLabel: '>', row: 3, group: 'punctuation' },
      { id: 'Slash', code: 'Slash', primaryLabel: '/', shiftedLabel: '?', row: 3, group: 'punctuation' },
      { id: 'ShiftRight', code: 'ShiftRight', primaryLabel: 'Shift', widthMultiplier: 2.75, row: 3, group: 'modifier' },
    ],
    // Row 4: Space row
    [
      { id: 'Space', code: 'Space', primaryLabel: 'Space', widthMultiplier: 6.5, row: 4, group: 'space' },
    ],
  ],
};

export const INSCRIPT_HI_LAYOUT: KeyboardLayout = {
  id: 'inscript-hi',
  name: 'हिंदी — InScript',
  language: 'hi',
  isReferenceOnly: true,
  description: 'Indian Script (InScript) national standard reference keyboard layout.',
  rows: [
    // Row 0: Number row with InScript conjuncts / numbers
    [
      { id: 'Backquote', code: 'Backquote', primaryLabel: '`', shiftedLabel: '~', row: 0, group: 'punctuation' },
      { id: 'Digit1', code: 'Digit1', primaryLabel: '1', shiftedLabel: 'ऍ', row: 0, group: 'alphanumeric' },
      { id: 'Digit2', code: 'Digit2', primaryLabel: '2', shiftedLabel: 'ॅ', row: 0, group: 'alphanumeric' },
      { id: 'Digit3', code: 'Digit3', primaryLabel: '3', shiftedLabel: '्र', row: 0, group: 'alphanumeric' },
      { id: 'Digit4', code: 'Digit4', primaryLabel: '4', shiftedLabel: 'र्', row: 0, group: 'alphanumeric' },
      { id: 'Digit5', code: 'Digit5', primaryLabel: '5', shiftedLabel: 'ज्ञ', row: 0, group: 'alphanumeric' },
      { id: 'Digit6', code: 'Digit6', primaryLabel: '6', shiftedLabel: 'त्र', row: 0, group: 'alphanumeric' },
      { id: 'Digit7', code: 'Digit7', primaryLabel: '7', shiftedLabel: 'क्ष', row: 0, group: 'alphanumeric' },
      { id: 'Digit8', code: 'Digit8', primaryLabel: '8', shiftedLabel: 'श्र', row: 0, group: 'alphanumeric' },
      { id: 'Digit9', code: 'Digit9', primaryLabel: '9', shiftedLabel: '(', row: 0, group: 'alphanumeric' },
      { id: 'Digit0', code: 'Digit0', primaryLabel: '0', shiftedLabel: ')', row: 0, group: 'alphanumeric' },
      { id: 'Minus', code: 'Minus', primaryLabel: '-', shiftedLabel: 'ः', row: 0, group: 'punctuation' },
      { id: 'Equal', code: 'Equal', primaryLabel: 'ृ', shiftedLabel: 'ऋ', row: 0, group: 'punctuation' },
      { id: 'Backspace', code: 'Backspace', primaryLabel: 'Backspace', widthMultiplier: 2, row: 0, group: 'control' },
    ],
    // Row 1: Top row (Vowels & Matras on left, Consonants on right)
    [
      { id: 'Tab', code: 'Tab', primaryLabel: 'Tab', widthMultiplier: 1.5, row: 1, group: 'control' },
      { id: 'KeyQ', code: 'KeyQ', primaryLabel: 'ौ', shiftedLabel: 'औ', row: 1, group: 'alphanumeric' },
      { id: 'KeyW', code: 'KeyW', primaryLabel: 'ै', shiftedLabel: 'ऐ', row: 1, group: 'alphanumeric' },
      { id: 'KeyE', code: 'KeyE', primaryLabel: 'ा', shiftedLabel: 'आ', row: 1, group: 'alphanumeric' },
      { id: 'KeyR', code: 'KeyR', primaryLabel: 'ी', shiftedLabel: 'ई', row: 1, group: 'alphanumeric' },
      { id: 'KeyT', code: 'KeyT', primaryLabel: 'ू', shiftedLabel: 'ऊ', row: 1, group: 'alphanumeric' },
      { id: 'KeyY', code: 'KeyY', primaryLabel: 'ब', shiftedLabel: 'भ', row: 1, group: 'alphanumeric' },
      { id: 'KeyU', code: 'KeyU', primaryLabel: 'ह', shiftedLabel: 'ङ', row: 1, group: 'alphanumeric' },
      { id: 'KeyI', code: 'KeyI', primaryLabel: 'ग', shiftedLabel: 'घ', row: 1, group: 'alphanumeric' },
      { id: 'KeyO', code: 'KeyO', primaryLabel: 'द', shiftedLabel: 'ध', row: 1, group: 'alphanumeric' },
      { id: 'KeyP', code: 'KeyP', primaryLabel: 'ज', shiftedLabel: 'झ', row: 1, group: 'alphanumeric' },
      { id: 'BracketLeft', code: 'BracketLeft', primaryLabel: 'ड', shiftedLabel: 'ढ', row: 1, group: 'punctuation' },
      { id: 'BracketRight', code: 'BracketRight', primaryLabel: '़', shiftedLabel: 'ञ', row: 1, group: 'punctuation' },
      { id: 'Backslash', code: 'Backslash', primaryLabel: 'ॉ', shiftedLabel: 'ऑ', widthMultiplier: 1.5, row: 1, group: 'punctuation' },
    ],
    // Row 2: Home row
    [
      { id: 'CapsLock', code: 'CapsLock', primaryLabel: 'Caps', widthMultiplier: 1.75, row: 2, group: 'control' },
      { id: 'KeyA', code: 'KeyA', primaryLabel: 'ो', shiftedLabel: 'ओ', row: 2, group: 'alphanumeric' },
      { id: 'KeyS', code: 'KeyS', primaryLabel: 'े', shiftedLabel: 'ए', row: 2, group: 'alphanumeric' },
      { id: 'KeyD', code: 'KeyD', primaryLabel: '्', shiftedLabel: 'अ', row: 2, group: 'alphanumeric' },
      { id: 'KeyF', code: 'KeyF', primaryLabel: 'ि', shiftedLabel: 'इ', row: 2, group: 'alphanumeric' },
      { id: 'KeyG', code: 'KeyG', primaryLabel: 'ु', shiftedLabel: 'उ', row: 2, group: 'alphanumeric' },
      { id: 'KeyH', code: 'KeyH', primaryLabel: 'प', shiftedLabel: 'फ', row: 2, group: 'alphanumeric' },
      { id: 'KeyJ', code: 'KeyJ', primaryLabel: 'र', shiftedLabel: 'ऱ', row: 2, group: 'alphanumeric' },
      { id: 'KeyK', code: 'KeyK', primaryLabel: 'क', shiftedLabel: 'ख', row: 2, group: 'alphanumeric' },
      { id: 'KeyL', code: 'KeyL', primaryLabel: 'त', shiftedLabel: 'थ', row: 2, group: 'alphanumeric' },
      { id: 'Semicolon', code: 'Semicolon', primaryLabel: 'च', shiftedLabel: 'छ', row: 2, group: 'punctuation' },
      { id: 'Quote', code: 'Quote', primaryLabel: 'ट', shiftedLabel: 'ठ', row: 2, group: 'punctuation' },
      { id: 'Enter', code: 'Enter', primaryLabel: 'Enter', widthMultiplier: 2.25, row: 2, group: 'control' },
    ],
    // Row 3: Bottom row
    [
      { id: 'ShiftLeft', code: 'ShiftLeft', primaryLabel: 'Shift', widthMultiplier: 2.25, row: 3, group: 'modifier' },
      { id: 'KeyZ', code: 'KeyZ', primaryLabel: '', shiftedLabel: 'ऌ', row: 3, group: 'alphanumeric' },
      { id: 'KeyX', code: 'KeyX', primaryLabel: 'ं', shiftedLabel: 'ँ', row: 3, group: 'alphanumeric' },
      { id: 'KeyC', code: 'KeyC', primaryLabel: 'म', shiftedLabel: 'ण', row: 3, group: 'alphanumeric' },
      { id: 'KeyV', code: 'KeyV', primaryLabel: 'न', shiftedLabel: 'ऩ', row: 3, group: 'alphanumeric' },
      { id: 'KeyB', code: 'KeyB', primaryLabel: 'व', shiftedLabel: 'ऴ', row: 3, group: 'alphanumeric' },
      { id: 'KeyN', code: 'KeyN', primaryLabel: 'ल', shiftedLabel: 'ळ', row: 3, group: 'alphanumeric' },
      { id: 'KeyM', code: 'KeyM', primaryLabel: 'स', shiftedLabel: 'श', row: 3, group: 'alphanumeric' },
      { id: 'Comma', code: 'Comma', primaryLabel: ',', shiftedLabel: 'ष', row: 3, group: 'punctuation' },
      { id: 'Period', code: 'Period', primaryLabel: '.', shiftedLabel: '।', row: 3, group: 'punctuation' },
      { id: 'Slash', code: 'Slash', primaryLabel: 'य', shiftedLabel: 'य़', row: 3, group: 'punctuation' },
      { id: 'ShiftRight', code: 'ShiftRight', primaryLabel: 'Shift', widthMultiplier: 2.75, row: 3, group: 'modifier' },
    ],
    // Row 4: Space row
    [
      { id: 'Space', code: 'Space', primaryLabel: 'Space', widthMultiplier: 6.5, row: 4, group: 'space' },
    ],
  ],
};

/**
 * Returns the layout configuration based on language
 */
export function getLayoutForLanguage(language: TypingLanguage): KeyboardLayout {
  if (language === 'hi') {
    return INSCRIPT_HI_LAYOUT;
  }
  return QWERTY_EN_LAYOUT;
}

/**
 * Retrieves all keys in a flat array for easy lookup
 */
export function flattenLayoutKeys(layout: KeyboardLayout): KeyDefinition[] {
  return layout.rows.flat();
}
