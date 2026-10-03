import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CharacterItem, ExtraCharacterItem, TestStatus, TypingLanguage } from '@/engine/types';

interface WordTokenMeta {
  type: 'word';
  key: string;
  startIndex: number;
  endIndex: number;
}

interface SpaceTokenMeta {
  type: 'space';
  key: string;
  index: number;
}

type PassageTokenMeta = WordTokenMeta | SpaceTokenMeta;

interface PassageDisplayProps {
  characters: CharacterItem[];
  extraCharacters: ExtraCharacterItem[];
  currentIndex: number;
  status: TestStatus;
  isFocused: boolean;
  language?: TypingLanguage;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onContainerClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBeforeInput: (e: React.FormEvent<HTMLInputElement> & { data?: string }) => void;
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: (e: React.CompositionEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
}

interface WordComponentProps {
  meta: WordTokenMeta;
  characters: CharacterItem[];
  currentIndex: number;
  isCompleted: boolean;
  caretRef: React.RefObject<HTMLSpanElement | null>;
}

const WordComponent = React.memo(
  function WordComponent({
    meta,
    characters,
    currentIndex,
    isCompleted,
    caretRef,
  }: WordComponentProps) {
    const chars = [];
    for (let i = meta.startIndex; i <= meta.endIndex; i++) {
      const item = characters[i];
      const isCurrent = i === currentIndex && !isCompleted;
      let stateClass = 'char-untyped';
      if (item.state === 'correct') {
        stateClass = 'char-correct';
      } else if (item.state === 'incorrect') {
        stateClass = 'char-incorrect';
      } else if (item.state === 'corrected') {
        stateClass = 'char-corrected';
      }

      chars.push(
        <span key={i} className={`char ${stateClass}`} data-char-index={i}>
          {isCurrent && <span className="caret-cursor" ref={caretRef} />}
          {item.char}
        </span>
      );
    }

    return <span className="word">{chars}</span>;
  },
  (prev, next) => {
    const wasActive =
      prev.currentIndex >= prev.meta.startIndex &&
      prev.currentIndex <= prev.meta.endIndex + 1;
    const isActive =
      next.currentIndex >= next.meta.startIndex &&
      next.currentIndex <= next.meta.endIndex + 1;

    // If word is completely outside the active cursor boundary in both states
    if (!wasActive && !isActive) {
      if (prev.characters === next.characters) return true;
      for (let i = prev.meta.startIndex; i <= prev.meta.endIndex; i++) {
        if (prev.characters[i] !== next.characters[i]) {
          return false;
        }
      }
      return true;
    }

    // If active in either state, re-render unless both index and character states are identical
    if (
      prev.currentIndex === next.currentIndex &&
      prev.isCompleted === next.isCompleted
    ) {
      for (let i = prev.meta.startIndex; i <= prev.meta.endIndex; i++) {
        if (prev.characters[i] !== next.characters[i]) {
          return false;
        }
      }
      return true;
    }

    return false;
  }
);

interface SpaceComponentProps {
  item: CharacterItem;
  index: number;
  isCurrent: boolean;
  caretRef: React.RefObject<HTMLSpanElement | null>;
}

const SpaceComponent = React.memo(
  function SpaceComponent({
    item,
    index,
    isCurrent,
    caretRef,
  }: SpaceComponentProps) {
    let stateClass = 'char-untyped';
    if (item.state === 'correct') {
      stateClass = 'char-correct';
    } else if (item.state === 'incorrect') {
      stateClass = 'char-incorrect';
    } else if (item.state === 'corrected') {
      stateClass = 'char-corrected';
    }

    return (
      <span className={`char ${stateClass}`} data-char-index={index}>
        {isCurrent && <span className="caret-cursor" ref={caretRef} />}
        {item.char}
      </span>
    );
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.isCurrent === next.isCurrent
);

/**
 * Computes visual line index and rolling offset from the active character's vertical position
 * relative to the first character of the passage.
 *
 * 5-Line Rolling Model:
 * - Line 0 (Visual line 1): offset = 0
 * - Line 1 (Visual line 2): offset = 0 (Line 1 remains visible above Line 2)
 * - Line 2 (Visual line 3): offset = 1 * lineHeight (Line 1 rolls away, Line 2 is top, Line 3 active)
 * - Line 3 (Visual line 4): offset = 2 * lineHeight (Line 2 rolls away, Line 3 is top, Line 4 active)
 * - Line N: offset = max(0, lineIndex - 1) * lineHeight
 * - Typing within the same line never changes offset.
 */
export function calculateRollingOffset(
  caretRelativeTop: number,
  lineHeight: number
): { lineIndex: number; targetOffset: number } {
  if (caretRelativeTop <= 0 || lineHeight <= 0) {
    return { lineIndex: 0, targetOffset: 0 };
  }

  // Visual line index (0-based) from rendered Y position with rounding tolerance
  const lineIndex = Math.max(0, Math.round(caretRelativeTop / lineHeight));

  // 5-line rolling window: keep the previous completed line visible above the active line
  const rollingLines = Math.max(0, lineIndex - 1);
  const targetOffset = rollingLines * lineHeight;

  return { lineIndex, targetOffset };
}

export const PassageDisplay: React.FC<PassageDisplayProps> = React.memo(({
  characters,
  extraCharacters,
  currentIndex,
  status,
  isFocused,
  language = 'en',
  inputRef,
  onContainerClick,
  onKeyDown,
  onBeforeInput,
  onInput,
  onCompositionStart,
  onCompositionEnd,
  onPaste,
  onFocus,
  onBlur,
}) => {
  const isCompleted = status === 'completed';
  const isHindi = language === 'hi';
  const [lineOffsetPx, setLineOffsetPx] = useState<number>(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);

  const firstChar = characters[0]?.char;
  const sampleChar = characters[10]?.char;
  const charLength = characters.length;

  // Passage identity fingerprint: only changes when text changes or test resets
  const passageKey = useMemo(() => {
    if (charLength === 0) return '';
    return `${charLength}_${firstChar ?? ''}_${sampleChar ?? ''}`;
  }, [charLength, firstChar, sampleChar]);

  // Precompute static passage token metadata ONCE per passage
  const tokensMeta = useMemo(() => {
    const result: PassageTokenMeta[] = [];
    let wordStart = -1;
    let wordCount = 0;

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i].char;
      if (char === ' ' || char === '\n') {
        if (wordStart !== -1) {
          result.push({
            type: 'word',
            key: `w-${wordCount++}`,
            startIndex: wordStart,
            endIndex: i - 1,
          });
          wordStart = -1;
        }
        result.push({
          type: 'space',
          key: `s-${i}`,
          index: i,
        });
      } else {
        if (wordStart === -1) {
          wordStart = i;
        }
      }
    }

    if (wordStart !== -1) {
      result.push({
        type: 'word',
        key: `w-${wordCount++}`,
        startIndex: wordStart,
        endIndex: characters.length - 1,
      });
    }

    return result;
  }, [passageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Precompute full passage string once for screen readers
  const fullText = useMemo(() => {
    return characters.map((c) => c.char).join('');
  }, [passageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Measure active character position relative to the passage origin using getBoundingClientRect
  const updateRollingOffset = useCallback(() => {
    if (currentIndex === 0) {
      setLineOffsetPx(0);
      return;
    }

    const containerEl = textContainerRef.current;
    if (!containerEl) return;

    // Locate the first character element to establish stable passage origin
    const firstCharEl =
      (containerEl.querySelector('[data-char-index="0"]') as HTMLElement | null) ||
      (containerEl.querySelector('.char') as HTMLElement | null);

    // Prefer active character element, or active caret element
    const activeCharEl =
      (containerEl.querySelector(`[data-char-index="${currentIndex}"]`) as HTMLElement | null) ||
      (caretRef.current ? (caretRef.current.closest('.char') as HTMLElement | null) : null) ||
      (containerEl.querySelector('.char:last-of-type') as HTMLElement | null) ||
      caretRef.current;

    if (!activeCharEl) return;

    // Use the character span wrapper to get the true visual line top (not underline bottom)
    const charEl = (activeCharEl.closest('.char') as HTMLElement | null) || activeCharEl;

    const charRect = charEl.getBoundingClientRect();
    const originTop = firstCharEl
      ? firstCharEl.getBoundingClientRect().top
      : containerEl.getBoundingClientRect().top;
    const caretRelativeTop = Math.max(0, charRect.top - originTop);

    // Determine actual line height dynamically from computed styles with fallback
    let lineHeight = isHindi ? 46 : 38;
    try {
      const computed = window.getComputedStyle(containerEl).lineHeight;
      const parsed = parseFloat(computed);
      if (parsed && !isNaN(parsed) && parsed > 20) {
        lineHeight = parsed;
      }
    } catch {
      // Fallback to default lineHeight
    }

    const { targetOffset } = calculateRollingOffset(caretRelativeTop, lineHeight);

    setLineOffsetPx((prev) => (prev !== targetOffset ? targetOffset : prev));
  }, [currentIndex, isHindi]);

  // Rolling 5-line calculation: decoupled via requestAnimationFrame to never block synchronous keystroke render
  useEffect(() => {
    if (currentIndex === 0) {
      setLineOffsetPx(0);
      return;
    }

    const frameId = requestAnimationFrame(updateRollingOffset);
    return () => cancelAnimationFrame(frameId);
  }, [currentIndex, updateRollingOffset]);

  // Responsive support: recalculate rolling position whenever container size/viewport changes
  useEffect(() => {
    const containerEl = textContainerRef.current;
    if (!containerEl || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      updateRollingOffset();
    });
    observer.observe(containerEl);

    return () => observer.disconnect();
  }, [updateRollingOffset]);

  return (
    <div
      className={`typing-canvas-wrapper ${isFocused ? 'focused' : ''}`}
      onClick={onContainerClick}
      tabIndex={0}
      aria-label="Typing test passage canvas. Click to focus and start typing."
      aria-describedby="passage-accessible-text"
      onKeyDown={(_e) => {
        // If container itself receives tab focus, focus the hidden input
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }}
    >
      {/* Accessible screen-reader mirror of the target passage text */}
      <span id="passage-accessible-text" className="sr-only">
        {fullText}
      </span>

      <input
        ref={inputRef}
        type="text"
        className="typing-hidden-input"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        disabled={isCompleted}
        onKeyDown={onKeyDown}
        onBeforeInput={onBeforeInput}
        onInput={onInput}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        onPaste={onPaste}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Unfocused Prompt Overlay */}
      {!isFocused && !isCompleted && (
        <div className="unfocused-overlay" onClick={onContainerClick}>
          <div className="unfocused-badge">
            <span>Click or tap to focus &amp; type</span>
          </div>
        </div>
      )}

      {/* Rolling 5-line passage viewport */}
      <div className={`passage-scroll-viewport ${isHindi ? 'lang-hi' : ''}`} ref={viewportRef}>
        <div
          ref={textContainerRef}
          className={`passage-text ${isHindi ? 'lang-hi' : ''}`}
          style={{
            transform: `translateY(-${lineOffsetPx}px)`,
            transition: 'transform 140ms ease-out',
          }}
          aria-hidden="true"
        >
          {tokensMeta.map((token) => {
            if (token.type === 'word') {
              return (
                <WordComponent
                  key={token.key}
                  meta={token}
                  characters={characters}
                  currentIndex={currentIndex}
                  isCompleted={isCompleted}
                  caretRef={caretRef}
                />
              );
            }
            return (
              <SpaceComponent
                key={token.key}
                item={characters[token.index]}
                index={token.index}
                isCurrent={token.index === currentIndex && !isCompleted}
                caretRef={caretRef}
              />
            );
          })}

          {/* Extra characters typed past the passage boundary */}
          {extraCharacters.length > 0 && (
            <span className="word word-extra">
              {extraCharacters.map((extra, idx) => (
                <span key={`extra-${idx}`} className="char char-extra">
                  {extra.char}
                </span>
              ))}
            </span>
          )}

          {/* Cursor at the end of text when typing extra characters */}
          {currentIndex >= characters.length && !isCompleted && (
            <span className="caret-cursor caret-trailing" ref={caretRef} />
          )}
        </div>
      </div>
    </div>
  );
});

PassageDisplay.displayName = 'PassageDisplay';

export default PassageDisplay;
