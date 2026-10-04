import {
  CharacterItem,
  Passage,
  PerformanceSample,
  TestDuration,
  TestType,
  TypingMetrics,
  TypingState,
} from './types';
import {
  calculateAccuracy,
  calculateGrossWPM,
  calculateNetWPM,
} from '@/utils/metrics';
import {
  compareGraphemes,
  isControlKey,
  isGraphemePrefix,
  segmentGraphemes,
} from './textUtils';
import { appendPassageContent } from './passageGenerator';

/**
 * Idle threshold in milliseconds. If the gap between keystrokes exceeds this duration,
 * the active typing clock pauses at this threshold so idle time does not penalize or inflate metrics.
 */
export const IDLE_PAUSE_THRESHOLD_MS = 2000;

/**
 * Derives the accumulated active typing time in seconds for the given state.
 * Idle pauses beyond IDLE_PAUSE_THRESHOLD_MS are excluded.
 */
export function getActiveTypingSeconds(
  state: TypingState,
  currentTimestamp?: number
): number {
  if (state.status === 'idle' || state.startTime === null) {
    return 0;
  }

  const accumulated = state.accumulatedActiveTimeMs ?? 0;

  if (state.status === 'completed') {
    return Math.max(0.1, accumulated / 1000);
  }

  const isBlocked =
    state.currentIndex < state.characters.length &&
    state.characters[state.currentIndex]?.state === 'incorrect';
  if (isBlocked) {
    return Math.max(0, accumulated / 1000);
  }

  const now =
    currentTimestamp ??
    (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const lastKey = state.lastKeystrokeTime ?? state.startTime;
  const delta = Math.max(0, now - lastKey);
  const activeTail = Math.min(delta, IDLE_PAUSE_THRESHOLD_MS);

  return Math.max(0, (accumulated + activeTail) / 1000);
}

/**
 * Calculates the exact completed word count up to currentIndex.
 * A word is counted as completed when the cursor has progressed past its boundary (space or newline).
 */
export function getCompletedWordCount(state: TypingState): number {
  if (state.currentIndex <= 0) return 0;
  let words = 0;
  let inWord = false;

  for (let i = 0; i < state.currentIndex; i++) {
    const char = state.characters[i].char;
    if (char === ' ' || char === '\n') {
      if (inWord) {
        words++;
        inWord = false;
      }
    } else {
      inWord = true;
    }
  }

  // If at or past the end of the passage and currently ending a word
  if (state.currentIndex >= state.characters.length && inWord) {
    words++;
  }

  if (state.targetCount && state.testType === 'words') {
    return Math.min(words, state.targetCount);
  }

  return words;
}

/**
 * Initializes a new typing test state for a given passage and duration.
 * Grapheme clusters are segmented using Unicode rules according to passage language.
 */
export function createInitialState(
  passage: Passage,
  duration: TestDuration = 60,
  testType: TestType = 'time',
  targetCount?: number
): TypingState {
  const graphemes = segmentGraphemes(passage.text, passage.language);
  const characters: CharacterItem[] = graphemes.map((char) => ({
    char,
    state: 'untyped',
  }));

  return {
    passage,
    characters,
    extraCharacters: [],
    currentIndex: 0,
    duration,
    testType,
    targetCount,
    status: 'idle',
    startTime: null,
    endTime: null,
    totalKeystrokes: 0,
    correctStrokes: 0,
    incorrectStrokes: 0,
    lastKeystrokeTime: null,
    accumulatedActiveTimeMs: 0,
    performanceSnapshots: [],
  };
}

export interface TypingEngineOptions {
  stopOnError?: boolean;
  forgiveErrors?: boolean;
  spaceSkipsWord?: boolean;
  allowBackspace?: boolean;
}

/**
 * Pure state reducer processing a single keystroke or character input event.
 */
function processKeystrokeInternal(
  initialState: TypingState,
  key: string,
  timestamp: number,
  options: TypingEngineOptions = {}
): TypingState {
  // If test is completed, reject any further typing except Backspace in target modes
  const isTargetMode =
    initialState.testType === 'words' ||
    initialState.testType === 'characters' ||
    initialState.testType === 'paragraph';
  if (
    initialState.status === 'completed' &&
    !(key === 'Backspace' && isTargetMode && options.allowBackspace !== false)
  ) {
    return initialState;
  }

  let state = initialState;

  // In Time mode: maintain abundant text supply so the passage never runs out before time ends
  const isTimeMode = !state.testType || state.testType === 'time';
  if (
    isTimeMode &&
    (state.characters.length >= 300 || state.passage.id.startsWith('gen-')) &&
    state.characters.length - state.currentIndex < 150
  ) {
    state = appendPassageContent(state, 80);
  }

  // Handle Backspace
  if (key === 'Backspace') {
    // If allowBackspace is explicitly disabled, ignore Backspace
    if (options.allowBackspace === false) {
      return state;
    }

    // If user typed extra characters past the passage length, remove the last extra character
    if (state.extraCharacters.length > 0) {
      return {
        ...state,
        extraCharacters: state.extraCharacters.slice(0, -1),
      };
    }

    // Check if the current character has pending composition (e.g. half-typed Devanagari)
    if (state.currentIndex < state.characters.length) {
      const currentChar = state.characters[state.currentIndex];
      if (currentChar.pendingComposition) {
        const updatedCharacters = [...state.characters];
        updatedCharacters[state.currentIndex] = {
          ...currentChar,
          state: 'untyped',
          typedChar: undefined,
          pendingComposition: undefined,
        };
        return {
          ...state,
          characters: updatedCharacters,
        };
      }
    }

    // In Stop on Error mode, if the current character is marked incorrect,
    // backspace clears the incorrect attempt on the current character
    if (
      state.currentIndex < state.characters.length &&
      state.characters[state.currentIndex].state === 'incorrect'
    ) {
      const updatedCharacters = [...state.characters];
      const currentChar = updatedCharacters[state.currentIndex];
      updatedCharacters[state.currentIndex] = {
        char: currentChar.char,
        state: 'untyped',
        typedChar: undefined,
        mistypedChar: currentChar.mistypedChar ?? currentChar.typedChar,
        pendingComposition: undefined,
        hadMistake: currentChar.hadMistake,
      };
      return {
        ...state,
        characters: updatedCharacters,
      };
    }

    // If at index 0, backspace does nothing
    if (state.currentIndex === 0) {
      return state;
    }

    // Move caret backward and reset the character to untyped
    const prevIndex = state.currentIndex - 1;
    const updatedCharacters = [...state.characters];
    const prevChar = updatedCharacters[prevIndex];
    updatedCharacters[prevIndex] = {
      char: prevChar.char,
      state: 'untyped',
      typedChar: undefined,
      mistypedChar: prevChar.mistypedChar ?? prevChar.typedChar,
      pendingComposition: undefined,
      hadMistake: prevChar.hadMistake,
    };

    const isTargetMode =
      state.testType === 'words' ||
      state.testType === 'characters' ||
      state.testType === 'paragraph';
    const nextStatus = state.status === 'completed' && isTargetMode ? 'running' : state.status;
    const nextEndTime = state.status === 'completed' && isTargetMode ? null : state.endTime;

    return {
      ...state,
      status: nextStatus,
      endTime: nextEndTime,
      characters: updatedCharacters,
      currentIndex: prevIndex,
    };
  }

  // Filter out non-printable or modifier keys (e.g. Shift, Alt, Control, Meta, CapsLock, Tab)
  if (isControlKey(key)) {
    return state;
  }

  // Active typing time accumulator calculation:
  // If idle, this first keystroke starts the clock
  let currentStartTime = state.startTime;
  let currentStatus = state.status;
  let newAccumulatedActiveMs = state.accumulatedActiveTimeMs ?? 0;

  const isAlreadyBlocked =
    state.status === 'running' &&
    state.currentIndex < state.characters.length &&
    state.characters[state.currentIndex].state === 'incorrect';

  if (state.status === 'idle' || currentStartTime === null) {
    currentStatus = 'running';
    currentStartTime = timestamp;
    newAccumulatedActiveMs = 0;
  } else if (!isAlreadyBlocked) {
    // Subsequent keystroke: add active delta up to the idle threshold
    const lastKey = state.lastKeystrokeTime ?? currentStartTime;
    const delta = Math.max(0, timestamp - lastKey);
    const activeDelta = Math.min(delta, IDLE_PAUSE_THRESHOLD_MS);
    newAccumulatedActiveMs += activeDelta;
  }

  const updatedTotalKeystrokes = state.totalKeystrokes + 1;

  // Case 1: Typing within the bounds of the passage
  if (state.currentIndex < state.characters.length) {
    const currentItem = state.characters[state.currentIndex];
    const expectedChar = currentItem.char;
    const pending = currentItem.pendingComposition ?? '';
    const candidate = pending + key;

    // Space Skips Word: if enabled, pressing Space while inside a word skips to the next word
    if (
      options.spaceSkipsWord &&
      key === ' ' &&
      currentItem.char !== ' '
    ) {
      let nextSpaceIdx = -1;
      for (let i = state.currentIndex; i < state.characters.length; i++) {
        if (state.characters[i].char === ' ') {
          nextSpaceIdx = i;
          break;
        }
      }
      if (nextSpaceIdx !== -1) {
        const updatedCharacters = [...state.characters];
        let skippedMistakes = 0;
        for (let i = state.currentIndex; i <= nextSpaceIdx; i++) {
          updatedCharacters[i] = {
            ...updatedCharacters[i],
            state: 'incorrect',
            mistypedChar: updatedCharacters[i].mistypedChar ?? ' ',
            hadMistake: true,
          };
          skippedMistakes++;
        }
        const nextIndex = nextSpaceIdx + 1;
        const isTargetCompleted =
          (state.testType === 'words' ||
            state.testType === 'characters' ||
            state.testType === 'paragraph') &&
          nextIndex >= state.characters.length;

        return {
          ...state,
          status: isTargetCompleted ? 'completed' : currentStatus,
          startTime: currentStartTime,
          endTime: isTargetCompleted ? timestamp : state.endTime,
          characters: updatedCharacters,
          currentIndex: nextIndex,
          totalKeystrokes: updatedTotalKeystrokes,
          incorrectStrokes: state.incorrectStrokes + skippedMistakes,
          lastKeystrokeTime: timestamp,
          accumulatedActiveTimeMs: newAccumulatedActiveMs,
        };
      }
    }

    // Check exact normalized grapheme match
    if (compareGraphemes(expectedChar, candidate)) {
      const wasMistake = Boolean(currentItem.hadMistake) || currentItem.state === 'incorrect';
      const updatedCharacters = [...state.characters];
      updatedCharacters[state.currentIndex] = {
        char: expectedChar,
        state: wasMistake ? 'corrected' : 'correct',
        typedChar: candidate,
        mistypedChar: currentItem.mistypedChar,
        pendingComposition: undefined,
        hadMistake: wasMistake,
      };

      const nextIndex = state.currentIndex + 1;
      const isTargetCompleted =
        (state.testType === 'words' ||
          state.testType === 'characters' ||
          state.testType === 'paragraph') &&
        nextIndex >= state.characters.length;

      return {
        ...state,
        status: isTargetCompleted ? 'completed' : currentStatus,
        startTime: currentStartTime,
        endTime: isTargetCompleted ? timestamp : state.endTime,
        characters: updatedCharacters,
        currentIndex: nextIndex,
        totalKeystrokes: updatedTotalKeystrokes,
        correctStrokes: state.correctStrokes + 1,
        lastKeystrokeTime: timestamp,
        accumulatedActiveTimeMs: isAlreadyBlocked ? (state.accumulatedActiveTimeMs ?? 0) : newAccumulatedActiveMs,
      };
    }

    // Check if candidate is a valid multi-keystroke prefix (e.g. InScript consonant before a matra)
    if (isGraphemePrefix(candidate, expectedChar)) {
      const updatedCharacters = [...state.characters];
      updatedCharacters[state.currentIndex] = {
        char: expectedChar,
        state: 'untyped',
        typedChar: candidate,
        mistypedChar: currentItem.mistypedChar,
        pendingComposition: candidate,
        hadMistake: currentItem.hadMistake,
      };

      return {
        ...state,
        status: currentStatus,
        startTime: currentStartTime,
        characters: updatedCharacters,
        totalKeystrokes: updatedTotalKeystrokes,
        correctStrokes: state.correctStrokes + 1,
        lastKeystrokeTime: timestamp,
        accumulatedActiveTimeMs: newAccumulatedActiveMs,
      };
    }

    // If there was a pending prefix that failed to complete, but the new key matches the NEXT expected character
    if (pending && state.currentIndex + 1 < state.characters.length) {
      const nextExpected = state.characters[state.currentIndex + 1].char;
      if (compareGraphemes(nextExpected, key) || isGraphemePrefix(key, nextExpected)) {
        // Resolve current index as incorrect with the pending prefix
        const updatedCharacters = [...state.characters];
        updatedCharacters[state.currentIndex] = {
          char: expectedChar,
          state: 'incorrect',
          typedChar: pending,
          mistypedChar: currentItem.mistypedChar ?? pending,
          pendingComposition: undefined,
          hadMistake: true,
        };

        const intermediateState: TypingState = {
          ...state,
          status: currentStatus,
          startTime: currentStartTime,
          characters: updatedCharacters,
          currentIndex: state.currentIndex + 1,
          totalKeystrokes: state.totalKeystrokes,
          incorrectStrokes: state.incorrectStrokes + 1,
          lastKeystrokeTime: timestamp,
          accumulatedActiveTimeMs: newAccumulatedActiveMs,
        };

        // Process the new key on the next position
        return processKeystroke(intermediateState, key, timestamp, options);
      }
    }

    // Normal mismatch: mark current character as incorrect
    const updatedCharacters = [...state.characters];
    updatedCharacters[state.currentIndex] = {
      char: expectedChar,
      state: 'incorrect',
      typedChar: candidate,
      mistypedChar: currentItem.mistypedChar ?? candidate,
      pendingComposition: undefined,
      hadMistake: true,
    };

    // If stopOnError is enabled or forgiveErrors is explicitly false, cursor does not advance
    const shouldStop = Boolean(options.stopOnError) || options.forgiveErrors === false;
    const nextIndex = shouldStop ? state.currentIndex : state.currentIndex + 1;
    const isTargetCompleted =
      !shouldStop &&
      (state.testType === 'words' ||
        state.testType === 'characters' ||
        state.testType === 'paragraph') &&
      nextIndex >= state.characters.length;

    return {
      ...state,
      status: isTargetCompleted ? 'completed' : currentStatus,
      startTime: currentStartTime,
      endTime: isTargetCompleted ? timestamp : state.endTime,
      characters: updatedCharacters,
      currentIndex: nextIndex,
      totalKeystrokes: updatedTotalKeystrokes,
      incorrectStrokes: state.incorrectStrokes + 1,
      lastKeystrokeTime: timestamp,
      accumulatedActiveTimeMs: shouldStop ? (state.accumulatedActiveTimeMs ?? 0) : newAccumulatedActiveMs,
    };
  }

  // Case 2: Typing beyond the passage text (extra characters)
  return {
    ...state,
    startTime: currentStartTime,
    status: currentStatus,
    extraCharacters: [...state.extraCharacters, { char: key }],
    totalKeystrokes: updatedTotalKeystrokes,
    incorrectStrokes: state.incorrectStrokes + 1,
    lastKeystrokeTime: timestamp,
  };
}

/**
 * Pure state reducer processing a single keystroke or character input event.
 * Automatically samples typing performance history over time.
 */
export function processKeystroke(
  initialState: TypingState,
  key: string,
  timestamp: number,
  options: TypingEngineOptions = {}
): TypingState {
  const nextState = processKeystrokeInternal(initialState, key, timestamp, options);
  if (nextState === initialState) {
    return nextState;
  }
  const isCompleted = nextState.status === 'completed';
  const snapshots = recordPerformanceSample(nextState, timestamp, isCompleted);
  return {
    ...nextState,
    performanceSnapshots: snapshots,
  };
}

/**
 * Processes a chunk or sequence of text (e.g. from IME composition commit or mobile virtual keyboard).
 * Segments the text into graphemes and runs each through the keystroke processor sequentially.
 */
export function processInputText(
  state: TypingState,
  text: string,
  timestamp: number,
  options: TypingEngineOptions = {}
): TypingState {
  if (!text || state.status === 'completed') {
    return state;
  }

  const graphemes = segmentGraphemes(text, state.passage.language);
  let currentState = state;

  for (const grapheme of graphemes) {
    currentState = processKeystroke(currentState, grapheme, timestamp, options);
  }

  return currentState;
}

/**
 * Checks and updates the timer state based on high-resolution timestamp.
 * Stops the test if the configured duration has elapsed.
 */
export function tickTimer(
  state: TypingState,
  currentTimestamp: number
): TypingState {
  if (state.status !== 'running' || state.startTime === null) {
    return state;
  }

  // If blocked on an incorrect character in Stop on Error mode, timer is frozen
  const isBlocked =
    state.currentIndex < state.characters.length &&
    state.characters[state.currentIndex]?.state === 'incorrect';
  if (isBlocked) {
    return state;
  }

  // In Words, Characters, or Paragraph mode, test completion is determined by reaching the target
  if (
    state.testType === 'words' ||
    state.testType === 'characters' ||
    state.testType === 'paragraph'
  ) {
    return state;
  }

  const elapsedMs = currentTimestamp - state.startTime;
  const durationMs = state.duration * 1000;
  const activeElapsed = getActiveTypingSeconds(state, currentTimestamp);

  if (activeElapsed >= state.duration || elapsedMs >= durationMs) {
    const completedState: TypingState = {
      ...state,
      status: 'completed',
      endTime: currentTimestamp,
    };
    return {
      ...completedState,
      performanceSnapshots: recordPerformanceSample(completedState, currentTimestamp, true),
    };
  }

  const snapshots = recordPerformanceSample(state, currentTimestamp, false);
  return {
    ...state,
    performanceSnapshots: snapshots,
  };
}

/**
 * Derives real-time and final typing metrics from the current engine state.
 */
export function calculateCurrentMetrics(
  state: TypingState,
  currentTimestamp?: number
): TypingMetrics {
  const { status, startTime, endTime, duration, totalKeystrokes, characters, extraCharacters, testType } = state;

  const isCountMode =
    testType === 'words' || testType === 'characters' || testType === 'paragraph';
  let elapsedSeconds: number = 0;
  let remainingSeconds: number = duration;

  const isBlocked =
    state.currentIndex < state.characters.length &&
    characters[state.currentIndex]?.state === 'incorrect';

  if (status === 'running' && startTime !== null) {
    if (isBlocked) {
      const activeMs = state.accumulatedActiveTimeMs ?? 0;
      const rawElapsed = activeMs / 1000;
      elapsedSeconds = isCountMode ? rawElapsed : Math.min(duration, rawElapsed);
      remainingSeconds = Math.max(0, duration - elapsedSeconds);
    } else {
      const rawElapsed =
        currentTimestamp !== undefined
          ? Math.max(0, (currentTimestamp - startTime) / 1000)
          : (state.accumulatedActiveTimeMs !== undefined
              ? state.accumulatedActiveTimeMs / 1000
              : Math.max(0, ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime) / 1000));
      elapsedSeconds = isCountMode ? rawElapsed : Math.min(duration, rawElapsed);
      remainingSeconds = Math.max(0, duration - elapsedSeconds);
    }
  } else if (status === 'completed' && startTime !== null && endTime !== null) {
    const rawElapsed = Math.max(0, (endTime - startTime) / 1000);
    elapsedSeconds = isCountMode ? rawElapsed : Math.min(duration, rawElapsed);
    remainingSeconds = 0;
  }

  let correctCharacters = 0;
  let incorrectCharacters = 0;

  for (let i = 0; i < state.currentIndex; i++) {
    if (characters[i].state === 'correct' || characters[i].state === 'corrected') {
      correctCharacters++;
    } else if (characters[i].state === 'incorrect') {
      incorrectCharacters++;
    }
  }

  // If the current character is blocked in incorrect state, count it as an uncorrected error
  if (isBlocked) {
    incorrectCharacters++;
  }

  const extraCount = extraCharacters.length;
  const uncorrectedErrors = incorrectCharacters + extraCount;

  // Total error positions / mistake characters recorded across the test
  let totalMistakeCharacters = 0;
  for (let i = 0; i < state.characters.length; i++) {
    const item = state.characters[i];
    if (item.hadMistake || item.state === 'incorrect' || item.state === 'corrected') {
      totalMistakeCharacters++;
    }
  }
  const errors = totalMistakeCharacters + extraCount;

  // Effective typed keystrokes for WPM:
  // Repeated wrong key presses while blocked on an error do not advance the passage
  // or inflate WPM. Effective progression keystrokes cannot exceed correct strokes.
  const effectiveWpmKeystrokes = isBlocked
    ? state.correctStrokes
    : Math.min(
        totalKeystrokes,
        Math.max(0, state.correctStrokes + uncorrectedErrors)
      );

  const grossWPM = calculateGrossWPM(effectiveWpmKeystrokes, elapsedSeconds);
  const netWPM = calculateNetWPM(
    effectiveWpmKeystrokes,
    isBlocked ? Math.max(0, uncorrectedErrors - 1) : uncorrectedErrors,
    elapsedSeconds
  );

  // Canonical Accuracy Calculation:
  // Accuracy accounts for all mistake characters (including those subsequently corrected).
  // Total attempted characters includes all characters traversed up to currentIndex, plus
  // any currently blocked mistake character at currentIndex and extra characters.
  const attemptedCharacters = state.currentIndex + (isBlocked ? 1 : 0) + extraCount;
  const netCorrect = Math.max(0, attemptedCharacters - errors);
  const accuracy = calculateAccuracy(netCorrect, attemptedCharacters);

  return {
    grossWPM,
    netWPM,
    accuracy,
    elapsedSeconds,
    remainingSeconds,
    correctCharacters,
    incorrectCharacters,
    extraCharacters: extraCount,
    totalKeystrokes,
    uncorrectedErrors,
    errors,
  };
}

export const computeMetrics = calculateCurrentMetrics;

/**
 * Records a performance sample for the typing test history.
 * Samples are recorded at start (0s), every ~1.0s of active time, and at test completion.
 */
export function recordPerformanceSample(
  state: TypingState,
  currentTimestamp: number,
  forceSample = false
): PerformanceSample[] {
  const existing = state.performanceSnapshots ? [...state.performanceSnapshots] : [];
  if (state.startTime === null) return existing;

  const currentElapsed = getActiveTypingSeconds(state, currentTimestamp);

  // If no sample yet, record initial 0s baseline
  if (existing.length === 0) {
    existing.push({
      timestamp: state.startTime,
      elapsedSeconds: 0,
      grossWpm: 0,
      netWpm: 0,
      accuracy: 100,
      errors: 0,
    });
  }

  const lastSample = existing[existing.length - 1];
  const deltaFromLast = currentElapsed - lastSample.elapsedSeconds;

  if (forceSample || deltaFromLast >= 1.0 || (state.status === 'completed' && deltaFromLast >= 0.2)) {
    const metrics = calculateCurrentMetrics(state, currentTimestamp);
    if (deltaFromLast > 0 || forceSample) {
      existing.push({
        timestamp: currentTimestamp,
        elapsedSeconds: Math.max(0, Math.round(currentElapsed * 10) / 10),
        grossWpm: metrics.grossWPM,
        netWpm: metrics.netWPM,
        accuracy: metrics.accuracy,
        errors: metrics.errors ?? 0,
      });
    }
  }

  return existing;
}

