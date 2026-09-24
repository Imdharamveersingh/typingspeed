import React, { useMemo } from 'react';
import { CharacterItem, ExtraCharacterItem, TestStatus, TypingLanguage } from '@/engine/types';

interface CharacterToken {
  item: CharacterItem;
  index: number;
}

type PassageToken =
  | { type: 'word'; key: string; chars: CharacterToken[] }
  | { type: 'space'; key: string; char: CharacterToken };

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

export const PassageDisplay: React.FC<PassageDisplayProps> = ({
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

  // Group characters into non-breaking word units and whitespace wrapping boundaries
  const tokens = useMemo(() => {
    const result: PassageToken[] = [];
    let currentWordChars: CharacterToken[] = [];
    let wordCount = 0;

    for (let i = 0; i < characters.length; i++) {
      const item = characters[i];
      if (item.char === ' ' || item.char === '\n') {
        if (currentWordChars.length > 0) {
          result.push({
            type: 'word',
            key: `word-${wordCount++}`,
            chars: currentWordChars,
          });
          currentWordChars = [];
        }
        result.push({
          type: 'space',
          key: `space-${i}`,
          char: { item, index: i },
        });
      } else {
        currentWordChars.push({ item, index: i });
      }
    }

    if (currentWordChars.length > 0) {
      result.push({
        type: 'word',
        key: `word-${wordCount++}`,
        chars: currentWordChars,
      });
    }

    return result;
  }, [characters]);

  const renderChar = (item: CharacterItem, index: number) => {
    const isCurrent = index === currentIndex && !isCompleted;
    let stateClass = 'char-untyped';

    if (item.state === 'correct') {
      stateClass = 'char-correct';
    } else if (item.state === 'incorrect') {
      stateClass = 'char-incorrect';
    }

    return (
      <span key={index} className={`char ${stateClass}`}>
        {isCurrent && <span className="caret-cursor" />}
        {item.char}
      </span>
    );
  };
  return (
    <div
      className={`typing-canvas-wrapper ${isFocused ? 'focused' : ''}`}
      onClick={onContainerClick}
      tabIndex={0}
      aria-label="Typing test passage canvas. Click to focus and start typing."
      onKeyDown={(_e) => {
        // If container itself receives tab focus, focus the hidden input
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }}
    >
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

      {/* Passage Display with non-breaking word units */}
      <div className={`passage-text ${isHindi ? 'lang-hi' : ''}`} aria-hidden="true">
        {tokens.map((token) => {
          if (token.type === 'word') {
            return (
              <span key={token.key} className="word">
                {token.chars.map(({ item, index }) => renderChar(item, index))}
              </span>
            );
          }
          return renderChar(token.char.item, token.char.index);
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
          <span className="caret-cursor" />
        )}
      </div>
    </div>
  );
};

export default PassageDisplay;

