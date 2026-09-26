import {
  CharacterItem,
  Passage,
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
  };
}

/**
 * Pure state reducer processing a single keystroke or character input event.
 */
export function processKeystroke(
  state: TypingState,
  key: string,
  timestamp: number
): TypingState {
  // If test is completed, reject any further typing
  if (state.status === 'completed') {
    return state;
  }

  // Handle Backspace
  if (key === 'Backspace') {
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

    // If at index 0, backspace does nothing
    if (state.currentIndex === 0) {
      return state;
    }

    // Move caret backward and reset the character to untyped
    const prevIndex = state.currentIndex - 1;
    const updatedCharacters = [...state.characters];
    updatedCharacters[prevIndex] = {
      char: updatedCharacters[prevIndex].char,
      state: 'untyped',
      typedChar: undefined,
      pendingComposition: undefined,
    };

    return {
      ...state,
      characters: updatedCharacters,
      currentIndex: prevIndex,
    };
  }

  // Filter out non-printable or modifier keys (e.g. Shift, Alt, Control, Meta, CapsLock, Tab)
  if (isControlKey(key)) {
    return state;
  }

  // If currently idle, the first printable keystroke starts the test
  let currentStartTime = state.startTime;
  let currentStatus = state.status;
  if (state.status === 'idle') {
    currentStatus = 'running';
    currentStartTime = timestamp;
  }

  const updatedTotalKeystrokes = state.totalKeystrokes + 1;

  // Case 1: Typing within the bounds of the passage
  if (state.currentIndex < state.characters.length) {
    const currentItem = state.characters[state.currentIndex];
    const expectedChar = currentItem.char;
    const pending = currentItem.pendingComposition ?? '';
    const candidate = pending + key;

    // Check exact normalized grapheme match
    if (compareGraphemes(expectedChar, candidate)) {
      const updatedCharacters = [...state.characters];
      updatedCharacters[state.currentIndex] = {
        char: expectedChar,
        state: 'correct',
        typedChar: candidate,
        pendingComposition: undefined,
      };

      const nextIndex = state.currentIndex + 1;
      const isTargetCompleted =
        (state.testType === 'words' || state.testType === 'characters') &&
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
      };
    }

    // Check if candidate is a valid multi-keystroke prefix (e.g. InScript consonant before a matra)
    if (isGraphemePrefix(candidate, expectedChar)) {
      const updatedCharacters = [...state.characters];
      updatedCharacters[state.currentIndex] = {
        char: expectedChar,
        state: 'untyped',
        typedChar: candidate,
        pendingComposition: candidate,
      };

      return {
        ...state,
        status: currentStatus,
        startTime: currentStartTime,
        characters: updatedCharacters,
        totalKeystrokes: updatedTotalKeystrokes,
        correctStrokes: state.correctStrokes + 1,
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
          pendingComposition: undefined,
        };

        const intermediateState: TypingState = {
          ...state,
          status: currentStatus,
          startTime: currentStartTime,
          characters: updatedCharacters,
          currentIndex: state.currentIndex + 1,
          totalKeystrokes: state.totalKeystrokes,
          incorrectStrokes: state.incorrectStrokes + 1,
        };

        // Process the new key on the next position
        return processKeystroke(intermediateState, key, timestamp);
      }
    }

    // Normal mismatch: mark current character as incorrect
    const updatedCharacters = [...state.characters];
    updatedCharacters[state.currentIndex] = {
      char: expectedChar,
      state: 'incorrect',
      typedChar: candidate,
      pendingComposition: undefined,
    };

    const nextIndex = state.currentIndex + 1;
    const isTargetCompleted =
      (state.testType === 'words' || state.testType === 'characters') &&
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
  };
}

/**
 * Processes a chunk or sequence of text (e.g. from IME composition commit or mobile virtual keyboard).
 * Segments the text into graphemes and runs each through the keystroke processor sequentially.
 */
export function processInputText(
  state: TypingState,
  text: string,
  timestamp: number
): TypingState {
  if (!text || state.status === 'completed') {
    return state;
  }

  const graphemes = segmentGraphemes(text, state.passage.language);
  let currentState = state;

  for (const grapheme of graphemes) {
    currentState = processKeystroke(currentState, grapheme, timestamp);
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

  // In Words or Characters mode, test completion is determined by reaching the target
  if (state.testType === 'words' || state.testType === 'characters') {
    return state;
  }

  const elapsedMs = currentTimestamp - state.startTime;
  const durationMs = state.duration * 1000;

  if (elapsedMs >= durationMs) {
    return {
      ...state,
      status: 'completed',
      endTime: state.startTime + durationMs,
    };
  }

  return state;
}

/**
 * Derives real-time and final typing metrics from the current engine state.
 */
export function calculateCurrentMetrics(
  state: TypingState,
  currentTimestamp?: number
): TypingMetrics {
  const { status, startTime, endTime, duration, totalKeystrokes, characters, extraCharacters, testType } = state;

  let elapsedSeconds: number = 0;
  let remainingSeconds: number = duration;

  const isCountMode = testType === 'words' || testType === 'characters';

  if (status === 'running' && startTime !== null) {
    const now = currentTimestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const rawElapsed = Math.max(0, (now - startTime) / 1000);
    elapsedSeconds = isCountMode ? rawElapsed : Math.min(duration, rawElapsed);
    remainingSeconds = Math.max(0, duration - elapsedSeconds);
  } else if (status === 'completed' && startTime !== null && endTime !== null) {
    const rawElapsed = Math.max(0, (endTime - startTime) / 1000);
    elapsedSeconds = isCountMode ? rawElapsed : Math.min(duration, rawElapsed);
    remainingSeconds = 0;
  }

  let correctCharacters = 0;
  let incorrectCharacters = 0;

  for (let i = 0; i < state.currentIndex; i++) {
    if (characters[i].state === 'correct') {
      correctCharacters++;
    } else if (characters[i].state === 'incorrect') {
      incorrectCharacters++;
    }
  }

  const extraCount = extraCharacters.length;
  const totalProcessed = correctCharacters + incorrectCharacters + extraCount;
  const uncorrectedErrors = incorrectCharacters + extraCount;

  const grossWPM = calculateGrossWPM(totalKeystrokes, elapsedSeconds);
  const netWPM = calculateNetWPM(totalKeystrokes, uncorrectedErrors, elapsedSeconds);
  const accuracy = calculateAccuracy(correctCharacters, totalProcessed);

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
  };
}
