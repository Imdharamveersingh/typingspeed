'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Passage,
  TestDuration,
  TestType,
  TypingMetrics,
  TypingState,
} from './types';
import {
  calculateCurrentMetrics,
  createInitialState,
  processInputText,
  processKeystroke,
  recordPerformanceSample,
  TypingEngineOptions,
} from './typingEngine';
import { isControlKey } from './textUtils';
import { SoundMode, SoundTheme } from './settingsTypes';
import { playKeystrokeSound } from '../utils/soundEffects';

export interface UseTypingEngineProps {
  initialPassage: Passage;
  initialDuration?: TestDuration;
  initialTestType?: TestType;
  initialTargetCount?: number;
  engineOptions?: TypingEngineOptions;
  soundOptions?: {
    mode: SoundMode;
    volume: number;
    theme?: SoundTheme;
  };
}

export interface UseTypingEngineReturn {
  state: TypingState;
  metrics: TypingMetrics;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isFocused: boolean;
  focusTypingArea: () => void;
  restart: () => void;
  completeTest: () => void;
  setDuration: (duration: TestDuration) => void;
  setPassage: (passage: Passage, testType?: TestType, targetCount?: number) => void;
  setTestType: (testType: TestType, targetCount?: number) => void;
  recentKey: { code?: string; status?: 'correct' | 'incorrect' } | null;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleBeforeInput: (e: React.FormEvent<HTMLInputElement> & { data?: string }) => void;
  handleInput: (e: React.FormEvent<HTMLInputElement>) => void;
  handleCompositionStart: () => void;
  handleCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  handleFocus: () => void;
  handleBlur: () => void;
}


export function useTypingEngine({
  initialPassage,
  initialDuration = 60,
  initialTestType = 'time',
  initialTargetCount,
  engineOptions,
  soundOptions,
}: UseTypingEngineProps): UseTypingEngineReturn {
  const [state, setState] = useState<TypingState>(() =>
    createInitialState(initialPassage, initialDuration, initialTestType, initialTargetCount)
  );
  const [metrics, setMetrics] = useState<TypingMetrics>(() =>
    calculateCurrentMetrics(state)
  );
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [recentKey, setRecentKey] = useState<{ code?: string; status?: 'correct' | 'incorrect' } | null>(null);

  const engineOptionsRef = useRef<TypingEngineOptions | undefined>(engineOptions);
  const soundOptionsRef = useRef<UseTypingEngineProps['soundOptions']>(soundOptions);

  useEffect(() => {
    engineOptionsRef.current = engineOptions;
    soundOptionsRef.current = soundOptions;
  }, [engineOptions, soundOptions]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const stateRef = useRef<TypingState>(state);
  const isComposingRef = useRef<boolean>(false);
  const lastCompositionEndTimeRef = useRef<number>(0);
  const recentKeyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeModeCompletionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active-only typing clock tracking refs
  const activeAccumulatedMsRef = useRef<number>(0);
  const lastKeystrokeTimeRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (recentKeyTimerRef.current) clearTimeout(recentKeyTimerRef.current);
      if (timeModeCompletionTimerRef.current) clearTimeout(timeModeCompletionTimerRef.current);
    };
  }, []);

  const focusTypingArea = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      setIsFocused(true);
    }
  }, []);

  const registerActiveKeystroke = useCallback((now: number) => {
    if (lastKeystrokeTimeRef.current === null) {
      lastKeystrokeTimeRef.current = now;
      lastTickTimeRef.current = now;
      activeAccumulatedMsRef.current = 0;
    } else {
      const timeSinceLastKey = now - lastKeystrokeTimeRef.current;
      // Idle threshold is 2000ms: only intervals within threshold count as active typing time
      if (timeSinceLastKey <= 2000) {
        const delta = Math.max(0, now - lastKeystrokeTimeRef.current);
        activeAccumulatedMsRef.current += delta;
      }
      lastKeystrokeTimeRef.current = now;
      lastTickTimeRef.current = now;
    }
  }, []);

  const completeTest = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'running' || current.startTime === null) return;
    const isTimeMode = !current.testType || current.testType === 'time';
    const effectiveAccumulatedMs = isTimeMode
      ? Math.max(activeAccumulatedMsRef.current, current.duration * 1000)
      : Math.max(100, activeAccumulatedMsRef.current);
    const effectiveNow = current.startTime + effectiveAccumulatedMs;
    const updated: TypingState = {
      ...current,
      status: 'completed',
      endTime: effectiveNow,
    };
    updated.performanceSnapshots = recordPerformanceSample(updated, effectiveNow, true);
    stateRef.current = updated;
    setState(updated);
    setMetrics(calculateCurrentMetrics(updated, effectiveNow));
    if (timeModeCompletionTimerRef.current) {
      clearTimeout(timeModeCompletionTimerRef.current);
      timeModeCompletionTimerRef.current = null;
    }
  }, []);

  // Event-driven state and metrics commit on keystrokes
  const applyKeystrokeResult = useCallback(
    (nextState: TypingState, now: number) => {
      let finalState = nextState;
      const isTimeMode = !finalState.testType || finalState.testType === 'time';
      const durationMs = finalState.duration * 1000;
      const isBlocked =
        finalState.currentIndex < finalState.characters.length &&
        finalState.characters[finalState.currentIndex]?.state === 'incorrect';

      if (finalState.accumulatedActiveTimeMs !== undefined) {
        activeAccumulatedMsRef.current = finalState.accumulatedActiveTimeMs;
      }

      const effectiveTime = (finalState.startTime ?? now) + activeAccumulatedMsRef.current;

      // In Time mode: if accumulated active typing time reached duration, mark as completed immediately
      if (
        isTimeMode &&
        finalState.status === 'running' &&
        !isBlocked &&
        activeAccumulatedMsRef.current >= durationMs
      ) {
        finalState = {
          ...finalState,
          status: 'completed',
          endTime: effectiveTime,
        };
        finalState.performanceSnapshots = recordPerformanceSample(finalState, effectiveTime, true);
      }

      stateRef.current = finalState;
      setState(finalState);
      setMetrics(calculateCurrentMetrics(finalState, effectiveTime));

      // Clear any pending completion timer
      if (timeModeCompletionTimerRef.current) {
        clearTimeout(timeModeCompletionTimerRef.current);
        timeModeCompletionTimerRef.current = null;
      }

      // In Time mode: schedule one-shot completion timer only if remaining active time is within active threshold and not blocked
      if (isTimeMode && finalState.status === 'running' && !isBlocked) {
        const remainingMs = durationMs - activeAccumulatedMsRef.current;
        if (remainingMs > 0 && remainingMs <= 2000) {
          timeModeCompletionTimerRef.current = setTimeout(() => {
            if (stateRef.current.status === 'running') {
              const currentBlocked =
                stateRef.current.currentIndex < stateRef.current.characters.length &&
                stateRef.current.characters[stateRef.current.currentIndex]?.state === 'incorrect';
              if (!currentBlocked) {
                activeAccumulatedMsRef.current = durationMs;
                completeTest();
              }
            }
          }, remainingMs);
        }
      }
    },
    [completeTest]
  );

  const restart = useCallback(() => {
    isComposingRef.current = false;
    activeAccumulatedMsRef.current = 0;
    lastKeystrokeTimeRef.current = null;
    lastTickTimeRef.current = null;
    if (recentKeyTimerRef.current) {
      clearTimeout(recentKeyTimerRef.current);
      recentKeyTimerRef.current = null;
    }
    if (timeModeCompletionTimerRef.current) {
      clearTimeout(timeModeCompletionTimerRef.current);
      timeModeCompletionTimerRef.current = null;
    }
    setRecentKey(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    const current = stateRef.current;
    const reset = createInitialState(current.passage, current.duration, current.testType, current.targetCount);
    stateRef.current = reset;
    setState(reset);
    setMetrics(calculateCurrentMetrics(reset));
    // Restore focus on restart
    setTimeout(() => {
      focusTypingArea();
    }, 0);
  }, [focusTypingArea]);

  // Deterministic test completion listener for automated workflows & testing
  useEffect(() => {
    const handleCompleteEvent = () => {
      completeTest();
    };
    window.addEventListener('typing:complete', handleCompleteEvent);
    return () => {
      window.removeEventListener('typing:complete', handleCompleteEvent);
    };
  }, [completeTest]);

  const setDuration = useCallback((duration: TestDuration) => {
    isComposingRef.current = false;
    activeAccumulatedMsRef.current = 0;
    lastKeystrokeTimeRef.current = null;
    lastTickTimeRef.current = null;
    if (recentKeyTimerRef.current) {
      clearTimeout(recentKeyTimerRef.current);
      recentKeyTimerRef.current = null;
    }
    if (timeModeCompletionTimerRef.current) {
      clearTimeout(timeModeCompletionTimerRef.current);
      timeModeCompletionTimerRef.current = null;
    }
    setRecentKey(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    const current = stateRef.current;
    const updated = createInitialState(current.passage, duration, current.testType, current.targetCount);
    stateRef.current = updated;
    setState(updated);
    setMetrics(calculateCurrentMetrics(updated));
    setTimeout(() => {
      focusTypingArea();
    }, 0);
  }, [focusTypingArea]);

  const setPassage = useCallback((passage: Passage, testType?: TestType, targetCount?: number) => {
    isComposingRef.current = false;
    activeAccumulatedMsRef.current = 0;
    lastKeystrokeTimeRef.current = null;
    lastTickTimeRef.current = null;
    if (recentKeyTimerRef.current) {
      clearTimeout(recentKeyTimerRef.current);
      recentKeyTimerRef.current = null;
    }
    if (timeModeCompletionTimerRef.current) {
      clearTimeout(timeModeCompletionTimerRef.current);
      timeModeCompletionTimerRef.current = null;
    }
    setRecentKey(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    const current = stateRef.current;
    const updated = createInitialState(
      passage,
      current.duration,
      testType ?? current.testType ?? 'time',
      targetCount ?? current.targetCount
    );
    stateRef.current = updated;
    setState(updated);
    setMetrics(calculateCurrentMetrics(updated));
    setTimeout(() => {
      focusTypingArea();
    }, 0);
  }, [focusTypingArea]);

  const setTestType = useCallback((testType: TestType, targetCount?: number) => {
    isComposingRef.current = false;
    activeAccumulatedMsRef.current = 0;
    lastKeystrokeTimeRef.current = null;
    lastTickTimeRef.current = null;
    if (recentKeyTimerRef.current) {
      clearTimeout(recentKeyTimerRef.current);
      recentKeyTimerRef.current = null;
    }
    if (timeModeCompletionTimerRef.current) {
      clearTimeout(timeModeCompletionTimerRef.current);
      timeModeCompletionTimerRef.current = null;
    }
    setRecentKey(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    const current = stateRef.current;
    const updated = createInitialState(current.passage, current.duration, testType, targetCount);
    stateRef.current = updated;
    setState(updated);
    setMetrics(calculateCurrentMetrics(updated));
    setTimeout(() => {
      focusTypingArea();
    }, 0);
  }, [focusTypingArea]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const isTargetMode =
        stateRef.current.testType === 'words' || stateRef.current.testType === 'characters';
      if (stateRef.current.status === 'completed' && !(e.key === 'Backspace' && isTargetMode)) {
        return;
      }

      // Ignore intermediate keydowns while IME is composing
      if (isComposingRef.current || e.nativeEvent.isComposing || e.key === 'Process') {
        return;
      }

      // Handle Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        const now = performance.now();
        const current = stateRef.current;
        const isBlockedBefore =
          current.status === 'running' &&
          current.currentIndex < current.characters.length &&
          current.characters[current.currentIndex]?.state === 'incorrect';

        if (
          !isBlockedBefore &&
          (current.status === 'running' || (current.status === 'completed' && isTargetMode))
        ) {
          registerActiveKeystroke(now);
        }

        const next = processKeystroke(current, 'Backspace', now, engineOptionsRef.current);

        if (next.accumulatedActiveTimeMs !== undefined) {
          activeAccumulatedMsRef.current = next.accumulatedActiveTimeMs;
        }
        if (isBlockedBefore) {
          lastKeystrokeTimeRef.current = now;
          lastTickTimeRef.current = now;
        }

        setRecentKey({ code: 'Backspace', status: 'correct' });
        if (recentKeyTimerRef.current) clearTimeout(recentKeyTimerRef.current);
        recentKeyTimerRef.current = setTimeout(() => setRecentKey(null), 150);

        applyKeystrokeResult(next, now);
        return;
      }

      // Ignore browser shortcuts with Ctrl, Meta, Alt (except normal key combinations)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Handle printable characters (Latin, Devanagari, punctuation, numbers, spaces)
      if (!isControlKey(e.key)) {
        e.preventDefault();
        const now = performance.now();
        const current = stateRef.current;
        const isBlockedBefore =
          current.status === 'running' &&
          current.currentIndex < current.characters.length &&
          current.characters[current.currentIndex]?.state === 'incorrect';

        if (!isBlockedBefore) {
          registerActiveKeystroke(now);
        }

        const code = e.nativeEvent.code || e.code || e.key;
        const next = processKeystroke(current, e.key, now, engineOptionsRef.current);

        if (next.accumulatedActiveTimeMs !== undefined) {
          activeAccumulatedMsRef.current = next.accumulatedActiveTimeMs;
        }

        const isBlockedAfter =
          next.currentIndex < next.characters.length &&
          next.characters[next.currentIndex]?.state === 'incorrect';

        if (isBlockedBefore && !isBlockedAfter) {
          lastKeystrokeTimeRef.current = now;
          lastTickTimeRef.current = now;
        }

        const status: 'correct' | 'incorrect' =
          next.correctStrokes > current.correctStrokes ? 'correct' : 'incorrect';

        if (soundOptionsRef.current) {
          playKeystrokeSound(
            status,
            soundOptionsRef.current.mode,
            soundOptionsRef.current.volume,
            soundOptionsRef.current.theme
          );
        }

        setRecentKey({ code, status });
        if (recentKeyTimerRef.current) clearTimeout(recentKeyTimerRef.current);
        recentKeyTimerRef.current = setTimeout(() => setRecentKey(null), 150);

        applyKeystrokeResult(next, now);
      }
    },
    [registerActiveKeystroke, applyKeystrokeResult]
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false;
      const committedText = e.data;
      lastCompositionEndTimeRef.current = performance.now();

      if (committedText && stateRef.current.status !== 'completed') {
        const now = performance.now();
        const current = stateRef.current;
        const isBlockedBefore =
          current.status === 'running' &&
          current.currentIndex < current.characters.length &&
          current.characters[current.currentIndex]?.state === 'incorrect';

        if (!isBlockedBefore) {
          registerActiveKeystroke(now);
        }

        const next = processInputText(current, committedText, now, engineOptionsRef.current);

        if (next.accumulatedActiveTimeMs !== undefined) {
          activeAccumulatedMsRef.current = next.accumulatedActiveTimeMs;
        }

        const isBlockedAfter =
          next.currentIndex < next.characters.length &&
          next.characters[next.currentIndex]?.state === 'incorrect';

        if (isBlockedBefore && !isBlockedAfter) {
          lastKeystrokeTimeRef.current = now;
          lastTickTimeRef.current = now;
        }

        const status: 'correct' | 'incorrect' =
          next.correctStrokes > current.correctStrokes ? 'correct' : 'incorrect';
        if (soundOptionsRef.current) {
          playKeystrokeSound(
            status,
            soundOptionsRef.current.mode,
            soundOptionsRef.current.volume,
            soundOptionsRef.current.theme
          );
        }
        applyKeystrokeResult(next, now);
      }

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [registerActiveKeystroke, applyKeystrokeResult]
  );

  // Fallback for mobile virtual keyboards that emit beforeInput
  const handleBeforeInput = useCallback(
    (e: React.FormEvent<HTMLInputElement> & { data?: string }) => {
      if (stateRef.current.status === 'completed' || isComposingRef.current) {
        return;
      }

      // If this beforeInput immediately followed compositionend, avoid double-processing
      if (performance.now() - lastCompositionEndTimeRef.current < 20) {
        return;
      }

      const inputChar = e.data;
      if (inputChar && !isControlKey(inputChar)) {
        e.preventDefault();
        const now = performance.now();
        const current = stateRef.current;
        const isBlockedBefore =
          current.status === 'running' &&
          current.currentIndex < current.characters.length &&
          current.characters[current.currentIndex]?.state === 'incorrect';

        if (!isBlockedBefore) {
          registerActiveKeystroke(now);
        }

        const next = processInputText(current, inputChar, now, engineOptionsRef.current);

        if (next.accumulatedActiveTimeMs !== undefined) {
          activeAccumulatedMsRef.current = next.accumulatedActiveTimeMs;
        }

        const isBlockedAfter =
          next.currentIndex < next.characters.length &&
          next.characters[next.currentIndex]?.state === 'incorrect';

        if (isBlockedBefore && !isBlockedAfter) {
          lastKeystrokeTimeRef.current = now;
          lastTickTimeRef.current = now;
        }

        const status: 'correct' | 'incorrect' =
          next.correctStrokes > current.correctStrokes ? 'correct' : 'incorrect';
        if (soundOptionsRef.current) {
          playKeystrokeSound(
            status,
            soundOptionsRef.current.mode,
            soundOptionsRef.current.volume,
            soundOptionsRef.current.theme
          );
        }
        applyKeystrokeResult(next, now);
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    },
    [registerActiveKeystroke, applyKeystrokeResult]
  );

  // Fallback for virtual keyboards or input methods that populate input.value directly
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      if (stateRef.current.status === 'completed' || isComposingRef.current) {
        return;
      }

      if (performance.now() - lastCompositionEndTimeRef.current < 20) {
        return;
      }

      const val = (e.currentTarget as HTMLInputElement).value;
      if (val && !isControlKey(val)) {
        const now = performance.now();
        const current = stateRef.current;
        const isBlockedBefore =
          current.status === 'running' &&
          current.currentIndex < current.characters.length &&
          current.characters[current.currentIndex]?.state === 'incorrect';

        if (!isBlockedBefore) {
          registerActiveKeystroke(now);
        }

        const next = processInputText(current, val, now, engineOptionsRef.current);

        if (next.accumulatedActiveTimeMs !== undefined) {
          activeAccumulatedMsRef.current = next.accumulatedActiveTimeMs;
        }

        const isBlockedAfter =
          next.currentIndex < next.characters.length &&
          next.characters[next.currentIndex]?.state === 'incorrect';

        if (isBlockedBefore && !isBlockedAfter) {
          lastKeystrokeTimeRef.current = now;
          lastTickTimeRef.current = now;
        }

        const status: 'correct' | 'incorrect' =
          next.correctStrokes > current.correctStrokes ? 'correct' : 'incorrect';
        if (soundOptionsRef.current) {
          playKeystrokeSound(
            status,
            soundOptionsRef.current.mode,
            soundOptionsRef.current.volume,
            soundOptionsRef.current.theme
          );
        }
        applyKeystrokeResult(next, now);
        (e.currentTarget as HTMLInputElement).value = '';
      }
    },
    [registerActiveKeystroke, applyKeystrokeResult]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    // Strictly prevent pasting into the typing test
    e.preventDefault();
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return {
    state,
    metrics,
    inputRef,
    isFocused,
    focusTypingArea,
    restart,
    completeTest,
    setDuration,
    setPassage,
    setTestType,
    recentKey,
    handleKeyDown,
    handleBeforeInput,
    handleInput,
    handleCompositionStart,
    handleCompositionEnd,
    handlePaste,
    handleFocus,
    handleBlur,
  };
}
