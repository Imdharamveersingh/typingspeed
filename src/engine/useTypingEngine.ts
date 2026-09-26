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
  tickTimer,
} from './typingEngine';
import { isControlKey } from './textUtils';

export interface UseTypingEngineProps {
  initialPassage: Passage;
  initialDuration?: TestDuration;
  initialTestType?: TestType;
  initialTargetCount?: number;
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
}: UseTypingEngineProps): UseTypingEngineReturn {
  const [state, setState] = useState<TypingState>(() =>
    createInitialState(initialPassage, initialDuration, initialTestType, initialTargetCount)
  );
  const [metrics, setMetrics] = useState<TypingMetrics>(() =>
    calculateCurrentMetrics(state)
  );
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [recentKey, setRecentKey] = useState<{ code?: string; status?: 'correct' | 'incorrect' } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stateRef = useRef<TypingState>(state);
  const isComposingRef = useRef<boolean>(false);
  const lastCompositionEndTimeRef = useRef<number>(0);
  const recentKeyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep stateRef in sync for animation loop
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // High-precision monotonic timer loop (performance.now())
  useEffect(() => {
    if (state.status !== 'running') {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const checkTimer = () => {
      const now = performance.now();
      const currentState = stateRef.current;

      if (currentState.status === 'running') {
        const updatedState = tickTimer(currentState, now);
        const updatedMetrics = calculateCurrentMetrics(updatedState, now);

        if (updatedState.status !== currentState.status) {
          stateRef.current = updatedState;
          setState(updatedState);
          setMetrics(updatedMetrics);
        } else {
          setMetrics(updatedMetrics);
        }

        if (updatedState.status === 'running') {
          animFrameRef.current = requestAnimationFrame(checkTimer);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(checkTimer);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [state.status]);

  const focusTypingArea = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      setIsFocused(true);
    }
  }, []);

  const restart = useCallback(() => {
    isComposingRef.current = false;
    if (recentKeyTimerRef.current) {
      clearTimeout(recentKeyTimerRef.current);
      recentKeyTimerRef.current = null;
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

  const completeTest = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'running' || current.startTime === null) return;
    const now = performance.now();
    const endTime = Math.max(now, current.startTime + 100);
    const updated: TypingState = {
      ...current,
      status: 'completed',
      endTime,
    };
    stateRef.current = updated;
    setState(updated);
    setMetrics(calculateCurrentMetrics(updated, endTime));
  }, []);

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
      if (stateRef.current.status === 'completed') {
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
        const next = processKeystroke(current, 'Backspace', now);
        stateRef.current = next;

        setRecentKey({ code: 'Backspace', status: 'correct' });
        if (recentKeyTimerRef.current) clearTimeout(recentKeyTimerRef.current);
        recentKeyTimerRef.current = setTimeout(() => setRecentKey(null), 150);

        setState(next);
        setMetrics(calculateCurrentMetrics(next, now));
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
        const code = e.nativeEvent.code || e.code || e.key;

        const current = stateRef.current;
        const next = processKeystroke(current, e.key, now);
        stateRef.current = next;

        const status: 'correct' | 'incorrect' =
          next.correctStrokes > current.correctStrokes ? 'correct' : 'incorrect';

        setRecentKey({ code, status });
        if (recentKeyTimerRef.current) clearTimeout(recentKeyTimerRef.current);
        recentKeyTimerRef.current = setTimeout(() => setRecentKey(null), 150);

        setState(next);
        setMetrics(calculateCurrentMetrics(next, now));
      }
    },
    []
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
        const next = processInputText(current, committedText, now);
        stateRef.current = next;
        setState(next);
        setMetrics(calculateCurrentMetrics(next, now));
      }

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    []
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
        const next = processInputText(current, inputChar, now);
        stateRef.current = next;
        setState(next);
        setMetrics(calculateCurrentMetrics(next, now));
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    },
    []
  );

  // Fallback for virtual keyboards or input methods that populate input.value directly
  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
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
      const next = processInputText(current, val, now);
      stateRef.current = next;
      setState(next);
      setMetrics(calculateCurrentMetrics(next, now));
      (e.currentTarget as HTMLInputElement).value = '';
    }
  }, []);

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
