'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Passage,
  TestDuration,
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
  setPassage: (passage: Passage) => void;
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
}: UseTypingEngineProps): UseTypingEngineReturn {
  const [state, setState] = useState<TypingState>(() =>
    createInitialState(initialPassage, initialDuration)
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
    setState((prev) => {
      const reset = createInitialState(prev.passage, prev.duration);
      setMetrics(calculateCurrentMetrics(reset));
      return reset;
    });
    // Restore focus on restart
    setTimeout(() => {
      focusTypingArea();
    }, 0);
  }, [focusTypingArea]);

  const completeTest = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running' || prev.startTime === null) return prev;
      const now = performance.now();
      const endTime = Math.max(now, prev.startTime + 100);
      const updated: TypingState = {
        ...prev,
        status: 'completed',
        endTime,
      };
      setMetrics(calculateCurrentMetrics(updated, endTime));
      return updated;
    });
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
    setState((prev) => {
      const updated = createInitialState(prev.passage, duration);
      setMetrics(calculateCurrentMetrics(updated));
      return updated;
    });
    setTimeout(() => {
      focusTypingArea();
    }, 0);
  }, [focusTypingArea]);

  const setPassage = useCallback((passage: Passage) => {
    setState((prev) => {
      const updated = createInitialState(passage, prev.duration);
      setMetrics(calculateCurrentMetrics(updated));
      return updated;
    });
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
        setRecentKey({ code: 'Backspace', status: 'correct' });
        if (recentKeyTimerRef.current) clearTimeout(recentKeyTimerRef.current);
        recentKeyTimerRef.current = setTimeout(() => setRecentKey(null), 150);

        setState((prev) => {
          const next = processKeystroke(prev, 'Backspace', now);
          setMetrics(calculateCurrentMetrics(next, now));
          return next;
        });
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

        setState((prev) => {
          const next = processKeystroke(prev, e.key, now);
          const status = next.correctStrokes > prev.correctStrokes ? 'correct' : 'incorrect';
          setRecentKey({ code, status });
          if (recentKeyTimerRef.current) clearTimeout(recentKeyTimerRef.current);
          recentKeyTimerRef.current = setTimeout(() => setRecentKey(null), 150);

          setMetrics(calculateCurrentMetrics(next, now));
          return next;
        });
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
        setState((prev) => {
          const next = processInputText(prev, committedText, now);
          setMetrics(calculateCurrentMetrics(next, now));
          return next;
        });
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
        setState((prev) => {
          const next = processInputText(prev, inputChar, now);
          setMetrics(calculateCurrentMetrics(next, now));
          return next;
        });
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
      setState((prev) => {
        const next = processInputText(prev, val, now);
        setMetrics(calculateCurrentMetrics(next, now));
        return next;
      });
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
