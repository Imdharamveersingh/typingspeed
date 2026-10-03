import { TypingLanguage } from './types';

export type TextSource = 'common' | 'paragraph';
export type TextSourceOption = TextSource;
export type WordListSize = 'small' | 'medium' | 'large';
export type WordListSizeOption = WordListSize;

export type FontFamilyOption = 'default' | 'mono' | 'sans';
export type FontOption = FontFamilyOption;

export type WhitespaceStyle = 'normal' | 'bar' | 'bullet';
export type WhitespaceOption = WhitespaceStyle;

export type CursorShape = 'underline' | 'line' | 'block' | 'box';
export type CursorShapeOption = CursorShape;

export type CursorMovement = 'smooth' | 'jumping';
export type CursorMovementOption = CursorMovement;

export type SoundMode = 'off' | 'error-only' | 'key-only' | 'all';
export type SoundModeOption = SoundMode;

export type SoundTheme = 'click' | 'beep';
export type SoundThemeOption = SoundTheme;

export interface TypingSettings {
  // Text Generation
  textSource: TextSource;
  includeCapitalLetters: boolean;
  includeSpecialCharacters: boolean;
  wordListSize: WordListSize;
  language: TypingLanguage;

  // Typing Behavior
  stopOnError: boolean;
  allowBackspace: boolean;
  forgiveErrors: boolean;
  spaceSkipsWord: boolean;
  keyboardVisible: boolean;
  showKeyboard?: boolean;

  // Appearance
  fontFamily: FontFamilyOption;
  font?: FontFamilyOption;
  whitespaceStyle: WhitespaceStyle;
  cursorShape: CursorShape;
  cursorMovement: CursorMovement;

  // Sound
  soundMode: SoundMode;
  soundVolume: number;
  soundTheme: SoundTheme;
}

export const DEFAULT_TYPING_SETTINGS: TypingSettings = {
  textSource: 'common',
  includeCapitalLetters: false,
  includeSpecialCharacters: false,
  wordListSize: 'medium',
  language: 'en',

  stopOnError: true,
  allowBackspace: false,
  forgiveErrors: false,
  spaceSkipsWord: false,
  keyboardVisible: true,
  showKeyboard: true,

  fontFamily: 'default',
  font: 'default',
  whitespaceStyle: 'normal',
  cursorShape: 'underline',
  cursorMovement: 'smooth',

  soundMode: 'off',
  soundVolume: 50,
  soundTheme: 'click',
};

const SETTINGS_STORAGE_KEY = 'typingspeed_user_settings';
const KEYBOARD_STORAGE_KEY = 'typing_platform_keyboard_visible';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

/**
 * Loads persisted settings from localStorage with safe fallback to defaults.
 */
export function loadTypingSettings(): TypingSettings {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_TYPING_SETTINGS;
  }

  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    let settings = { ...DEFAULT_TYPING_SETTINGS };

    if (raw) {
      const parsed = JSON.parse(raw);
      settings = { ...DEFAULT_TYPING_SETTINGS, ...parsed };
      if (parsed.allowBackspace !== undefined) {
        settings.allowBackspace = Boolean(parsed.allowBackspace);
      }
      if (parsed.font && !parsed.fontFamily) {
        settings.fontFamily = parsed.font;
      }
      if (parsed.showKeyboard !== undefined && parsed.keyboardVisible === undefined) {
        settings.keyboardVisible = parsed.showKeyboard;
      }
    }

    // Synchronize legacy/existing keyboard preference if present
    const legacyKeyboard = storage.getItem(KEYBOARD_STORAGE_KEY);
    if (legacyKeyboard !== null) {
      settings.keyboardVisible = legacyKeyboard === 'true';
      settings.showKeyboard = legacyKeyboard === 'true';
    }

    return settings;
  } catch {
    return DEFAULT_TYPING_SETTINGS;
  }
}

/**
 * Persists settings to localStorage.
 */
export function saveTypingSettings(settings: TypingSettings): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const toSave: TypingSettings = {
      ...settings,
      font: settings.fontFamily || settings.font || 'default',
      showKeyboard: settings.keyboardVisible ?? settings.showKeyboard ?? true,
      allowBackspace: Boolean(settings.allowBackspace),
    };
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toSave));
    storage.setItem(KEYBOARD_STORAGE_KEY, String(toSave.keyboardVisible));
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}
