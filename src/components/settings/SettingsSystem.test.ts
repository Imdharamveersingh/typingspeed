import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_TYPING_SETTINGS,
  loadTypingSettings,
  saveTypingSettings,
  TypingSettings,
} from '@/engine/settingsTypes';
import { generateTestPassage } from '@/engine/passageGenerator';
import {
  createInitialState,
  processKeystroke,
  computeMetrics,
} from '@/engine/typingEngine';
import { getWordListStats, getWordListBySize } from '@/data/practiceWords';
import { playKeystrokeSound } from '@/utils/soundEffects';
import { getAllExamProfiles, getDefaultExamProfile } from '@/engine/examEngine';

describe('Advanced Test Configuration & Settings System', () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageStore[key] ?? null,
      setItem: (key: string, value: string) => {
        localStorageStore[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageStore[key];
      },
      clear: () => {
        localStorageStore = {};
      },
    });
  });

  afterEach(() => {
    localStorageStore = {};
    vi.restoreAllMocks();
  });

  describe('1. Test Type Support (Time, Words, Paragraph)', () => {
    it('supports Time mode generation and durations', () => {
      const passage15 = generateTestPassage({
        language: 'en',
        difficulty: 'medium',
        testType: 'time',
        targetCount: 15,
      });
      expect(passage15.text.length).toBeGreaterThan(0);
      expect(passage15.language).toBe('en');

      const state15 = createInitialState(passage15, 15, 'time', 15);
      expect(state15.duration).toBe(15);
      expect(state15.testType).toBe('time');

      const state30 = createInitialState(passage15, 30, 'time', 30);
      expect(state30.duration).toBe(30);

      const state60 = createInitialState(passage15, 60, 'time', 60);
      expect(state60.duration).toBe(60);
    });

    it('supports Words mode with fixed word targets', () => {
      const wordCounts = [25, 50, 100];
      for (const count of wordCounts) {
        const passage = generateTestPassage({
          language: 'en',
          difficulty: 'medium',
          testType: 'words',
          targetCount: count,
        });
        const words = passage.text.trim().split(/\s+/);
        expect(words.length).toBe(count);

        const state = createInitialState(passage, 60, 'words', count);
        expect(state.testType).toBe('words');
        expect(state.targetCount).toBe(count);
      }
    });

    it('supports Paragraph mode with continuous everyday text', () => {
      const passage = generateTestPassage({
        language: 'en',
        difficulty: 'medium',
        testType: 'paragraph',
        targetCount: 60,
      });

      expect(passage.text.length).toBeGreaterThan(50);
      // Default paragraph mode uses lowercase, common everyday vocabulary
      expect(passage.text).toBe(passage.text.toLowerCase());
      expect(passage.text).not.toMatch(/[#@$%^&*~]/);

      const state = createInitialState(passage, 60, 'paragraph');
      expect(state.testType).toBe('paragraph');
    });
  });

  describe('2. Text Settings & Generation Options', () => {
    it('generates lowercase text by default when Include Capital Letters is OFF', () => {
      const passage = generateTestPassage({
        language: 'en',
        difficulty: 'medium',
        testType: 'time',
        targetCount: 60,
        includeCapitalLetters: false,
      });

      const letters = passage.text.replace(/[^a-zA-Z]/g, '');
      expect(letters).toBe(letters.toLowerCase());
    });

    it('includes natural capitalization when Include Capital Letters is ON', () => {
      const passage = generateTestPassage({
        language: 'en',
        difficulty: 'medium',
        testType: 'time',
        targetCount: 60,
        includeCapitalLetters: true,
      });

      // Capital letters appear naturally
      expect(passage.text).toMatch(/[A-Z]/);
    });

    it('excludes special characters by default when Include Special Characters is OFF', () => {
      const passage = generateTestPassage({
        language: 'en',
        difficulty: 'medium',
        testType: 'time',
        targetCount: 60,
        includeSpecialCharacters: false,
      });

      // Contains only letters and spaces
      expect(passage.text).toMatch(/^[a-zA-Z\s]+$/);
    });

    it('allows natural punctuation when Include Special Characters is ON', () => {
      const passage = generateTestPassage({
        language: 'en',
        difficulty: 'medium',
        testType: 'time',
        targetCount: 60,
        includeSpecialCharacters: true,
      });

      expect(passage.text).toMatch(/[,.?!;:]/);
    });

    it('provides genuine, calculated statistics for Word List Sizes (never fabricated)', () => {
      const smallStats = getWordListStats('small');
      const medStats = getWordListStats('medium');
      const largeStats = getWordListStats('large');

      expect(smallStats.count).toBe(100);
      expect(medStats.count).toBe(300);
      expect(largeStats.count).toBe(1000);

      expect(parseFloat(smallStats.avgLength)).toBeGreaterThan(3);
      expect(parseFloat(smallStats.avgLength)).toBeLessThan(7);

      const smallList = getWordListBySize('small');
      const medList = getWordListBySize('medium');
      const largeList = getWordListBySize('large');

      expect(smallList.length).toBe(100);
      expect(medList.length).toBe(300);
      expect(largeList.length).toBe(1000);

      // Medium contains Small, Large contains Medium
      expect(smallList.every((w) => medList.includes(w))).toBe(true);
      expect(medList.every((w) => largeList.includes(w))).toBe(true);
    });
  });

  describe('3. Typing Behavior Options (Stop on Error, Forgive Errors, Space Skips Word)', () => {
    it('stopOnError=true prevents cursor from advancing when mistyped character is entered', () => {
      const passage = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy' as const,
        text: 'apple banana',
        language: 'en' as const,
      };
      let state = createInitialState(passage, 60, 'time');

      // Correct first letter 'a'
      state = processKeystroke(state, 'a', 1000, { stopOnError: true });
      expect(state.currentIndex).toBe(1);
      expect(state.characters[0].state).toBe('correct');

      // Mistyped second letter 'z' (target is 'p')
      state = processKeystroke(state, 'z', 1050, { stopOnError: true });
      // Cursor should remain at index 1 and character marked incorrect
      expect(state.currentIndex).toBe(1);
      expect(state.characters[1].state).toBe('incorrect');

      // User types another wrong letter 'x', still blocked
      state = processKeystroke(state, 'x', 1100, { stopOnError: true });
      expect(state.currentIndex).toBe(1);

      // User types correct letter 'p', now it advances
      state = processKeystroke(state, 'p', 1150, { stopOnError: true });
      expect(state.currentIndex).toBe(2);
      expect(state.characters[1].state).toBe('corrected');
    });

    it('forgiveErrors=true allows cursor to advance past an error', () => {
      const passage = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy' as const,
        text: 'apple banana',
        language: 'en' as const,
      };
      let state = createInitialState(passage, 60, 'time');

      state = processKeystroke(state, 'z', 1000, { forgiveErrors: true, stopOnError: false });
      expect(state.currentIndex).toBe(1);
      expect(state.characters[0].state).toBe('incorrect');
      expect(state.incorrectStrokes).toBe(1);
    });

    it('spaceSkipsWord=true advances past remaining characters of the current word', () => {
      const passage = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy' as const,
        text: 'cat dog bird',
        language: 'en' as const,
      };
      let state = createInitialState(passage, 60, 'time');

      // Type 'c'
      state = processKeystroke(state, 'c', 1000, { spaceSkipsWord: true });
      expect(state.currentIndex).toBe(1);

      // Press space inside 'cat' (target at index 1 is 'a') -> skips to next word after space (index 4)
      state = processKeystroke(state, ' ', 1100, { spaceSkipsWord: true });
      expect(state.currentIndex).toBe(4);
      // Untyped characters of skipped word are marked incorrect
      expect(state.characters[1].state).toBe('incorrect');
      expect(state.characters[2].state).toBe('incorrect');
    });
  });

  describe('4. Sound Effects Utility & Web Audio Safety', () => {
    it('executes safely in environment without AudioContext throwing errors', () => {
      expect(() => {
        playKeystrokeSound('correct', 'off', 50, 'click');
        playKeystrokeSound('incorrect', 'off', 50, 'click');
        playKeystrokeSound('correct', 'error-only', 50, 'click');
        playKeystrokeSound('incorrect', 'key-only', 50, 'click');
      }).not.toThrow();
    });
  });

  describe('5. Settings Persistence & Storage Sync', () => {
    it('loads default settings when localStorage is empty', () => {
      const settings = loadTypingSettings();
      expect(settings).toEqual(DEFAULT_TYPING_SETTINGS);
      expect(settings.includeCapitalLetters).toBe(false);
      expect(settings.includeSpecialCharacters).toBe(false);
      expect(settings.textSource).toBe('common');
      expect(settings.stopOnError).toBe(true);
      expect(settings.allowBackspace).toBe(false);
      expect(settings.forgiveErrors).toBe(false);
      expect(settings.spaceSkipsWord).toBe(false);
      expect(settings.keyboardVisible).toBe(true);
      expect(settings.fontFamily).toBe('default');
      expect(settings.whitespaceStyle).toBe('normal');
      expect(settings.cursorShape).toBe('underline');
      expect(settings.cursorMovement).toBe('smooth');
      expect(settings.soundMode).toBe('off');
    });

    it('persists and reloads modified settings including allowBackspace', () => {
      const custom: TypingSettings = {
        ...DEFAULT_TYPING_SETTINGS,
        includeCapitalLetters: true,
        includeSpecialCharacters: true,
        textSource: 'paragraph',
        stopOnError: true,
        allowBackspace: true,
        cursorShape: 'block',
        fontFamily: 'mono',
        soundMode: 'all',
        soundVolume: 75,
      };

      saveTypingSettings(custom);
      const loaded = loadTypingSettings();

      expect(loaded.includeCapitalLetters).toBe(true);
      expect(loaded.includeSpecialCharacters).toBe(true);
      expect(loaded.textSource).toBe('paragraph');
      expect(loaded.stopOnError).toBe(true);
      expect(loaded.allowBackspace).toBe(true);
      expect(loaded.cursorShape).toBe('block');
      expect(loaded.fontFamily).toBe('mono');
      expect(loaded.soundMode).toBe('all');
      expect(loaded.soundVolume).toBe(75);
    });

    it('syncs keyboardVisible flag with legacy typing_platform_keyboard_visible key', () => {
      saveTypingSettings({
        ...DEFAULT_TYPING_SETTINGS,
        keyboardVisible: true,
      });

      expect(localStorage.getItem('typing_platform_keyboard_visible')).toBe('true');

      saveTypingSettings({
        ...DEFAULT_TYPING_SETTINGS,
        keyboardVisible: false,
      });

      expect(localStorage.getItem('typing_platform_keyboard_visible')).toBe('false');
    });
  });

  describe('6. Stop on Error, Backspace, and Authoritative Error Analytics', () => {
    it('Stop on Error = ON blocks cursor on wrong key, marks it RED, and stays blocked on repeated errors', () => {
      const passage = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy' as const,
        text: 'the plan',
        language: 'en' as const,
      };
      let state = createInitialState(passage, 60, 'time');

      // 1. Expected 't', user presses 'x' (wrong key)
      state = processKeystroke(state, 'x', 1000, { stopOnError: true });
      expect(state.characters[0].state).toBe('incorrect');
      expect(state.characters[0].hadMistake).toBe(true);
      expect(state.currentIndex).toBe(0); // Cursor MUST NOT advance
      expect(state.incorrectStrokes).toBe(1);
      expect(state.correctStrokes).toBe(0);

      // 2. Repeated wrong keys do NOT advance cursor
      state = processKeystroke(state, 'y', 1100, { stopOnError: true });
      expect(state.characters[0].state).toBe('incorrect');
      expect(state.currentIndex).toBe(0);
      expect(state.incorrectStrokes).toBe(2);

      state = processKeystroke(state, 'z', 1200, { stopOnError: true });
      expect(state.currentIndex).toBe(0);
      expect(state.incorrectStrokes).toBe(3);

      // 3. Correct key 't' resolves the character and advances cursor
      state = processKeystroke(state, 't', 1300, { stopOnError: true });
      expect(state.characters[0].state).toBe('corrected');
      expect(state.characters[0].hadMistake).toBe(true);
      expect(state.currentIndex).toBe(1);
      expect(state.correctStrokes).toBe(1);
    });

    it('Allow Backspace = OFF ignores Backspace and prevents erasing characters', () => {
      const passage = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy' as const,
        text: 'the plan',
        language: 'en' as const,
      };
      let state = createInitialState(passage, 60, 'time');

      // Type 't' correctly
      state = processKeystroke(state, 't', 1000, { allowBackspace: false });
      expect(state.currentIndex).toBe(1);
      expect(state.characters[0].state).toBe('correct');

      // Press Backspace with allowBackspace = OFF
      const afterBackspace = processKeystroke(state, 'Backspace', 1100, { allowBackspace: false });
      expect(afterBackspace.currentIndex).toBe(1); // Position untouched
      expect(afterBackspace.characters[0].state).toBe('correct'); // Not erased
    });

    it('Allow Backspace = ON enables backward correction and clears mistyped characters', () => {
      const passage = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy' as const,
        text: 'the plan',
        language: 'en' as const,
      };
      let state = createInitialState(passage, 60, 'time');

      // Type 't' correctly
      state = processKeystroke(state, 't', 1000, { allowBackspace: true, stopOnError: true });
      expect(state.currentIndex).toBe(1);

      // Type 'x' incorrectly at index 1 (expected 'h')
      state = processKeystroke(state, 'x', 1100, { allowBackspace: true, stopOnError: true });
      expect(state.currentIndex).toBe(1);
      expect(state.characters[1].state).toBe('incorrect');

      // Backspace clears the incorrect attempt on index 1
      state = processKeystroke(state, 'Backspace', 1200, { allowBackspace: true, stopOnError: true });
      expect(state.currentIndex).toBe(1);
      expect(state.characters[1].state).toBe('untyped');
      expect(state.characters[1].hadMistake).toBe(true);

      // Second backspace moves back to index 0
      state = processKeystroke(state, 'Backspace', 1300, { allowBackspace: true, stopOnError: true });
      expect(state.currentIndex).toBe(0);
      expect(state.characters[0].state).toBe('untyped');
    });

    it('Repeated wrong keys do not artificially inflate Gross WPM or Net WPM', () => {
      const passage = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy' as const,
        text: 'the plan',
        language: 'en' as const,
      };
      let state = createInitialState(passage, 60, 'time');

      // Start test by pressing wrong key 'x'
      state = processKeystroke(state, 'x', 1000, { stopOnError: true });

      // User spams wrong keys 30 times over 5 seconds while stuck on character 0
      for (let i = 0; i < 30; i++) {
        state = processKeystroke(state, 'x', 1000 + (i + 1) * 150, { stopOnError: true });
      }

      expect(state.currentIndex).toBe(0);
      expect(state.incorrectStrokes).toBe(31);
      expect(state.correctStrokes).toBe(0);

      // Compute metrics after 5.5 seconds (timestamp 6500)
      const metrics = computeMetrics(state, 6500);
      expect(metrics.correctCharacters).toBe(0);
      expect(metrics.incorrectCharacters).toBe(1);
      expect(metrics.uncorrectedErrors).toBe(1);
      // Net WPM must be 0 because 0 correct words were typed
      expect(metrics.netWPM).toBe(0);
      // Gross WPM must be strictly restrained to productive progress (near 0, not inflated by 31 strokes)
      expect(metrics.grossWPM).toBeLessThanOrEqual(2);
      expect(metrics.accuracy).toBe(0);
    });

    it('Preserves deterministic passage generation without Date.now() in paragraph mode', () => {
      const p1 = generateTestPassage({
        language: 'en',
        difficulty: 'medium',
        testType: 'paragraph',
      });
      const p2 = generateTestPassage({
        language: 'en',
        difficulty: 'medium',
        testType: 'paragraph',
      });

      expect(p1.id).toBe('paragraph-en-medium');
      expect(p2.id).toBe('paragraph-en-medium');
      expect(p1.id).not.toContain('Date.now()');
      expect(p1.id).not.toMatch(/\d{10,}/);
    });
  });

  describe('7. Regression Safety for /exam and /practice', () => {
    it('preserves all government exam profiles and preset specifications', () => {
      const profiles = getAllExamProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(3);

      const ssc = profiles.find((p) => p.id === 'ssc-practice');
      expect(ssc).toBeDefined();
      expect(ssc?.targetValue).toBe(35);
      expect(ssc?.duration).toBe(600); // 10 mins

      const defaultProfile = getDefaultExamProfile();
      expect(defaultProfile).toBeDefined();
      expect(defaultProfile.id).toBe('ssc-practice');
    });
  });
});
