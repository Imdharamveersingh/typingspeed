'use client';

import React from 'react';
import { KeyDefinition } from '@/engine/keyboardTypes';

interface KeyboardKeyProps {
  keyDef: KeyDefinition;
  isNext?: boolean;
  isPressed?: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  isFocus?: boolean;
  mistakeCount?: number;
  isHindi?: boolean;
}

export const KeyboardKey: React.FC<KeyboardKeyProps> = React.memo(
  ({
    keyDef,
    isNext = false,
    isPressed = false,
    isCorrect = false,
    isIncorrect = false,
    isFocus = false,
    mistakeCount = 0,
    isHindi = false,
  }) => {
    const classNames = [
      'keyboard-key',
      keyDef.group ? `key-group-${keyDef.group}` : '',
      isNext ? 'key-next' : '',
      isPressed ? 'key-pressed' : '',
      isCorrect ? 'key-correct' : '',
      isIncorrect ? 'key-incorrect' : '',
      isFocus ? 'key-focus' : '',
      mistakeCount > 0 ? 'key-has-mistakes' : '',
      isHindi ? 'key-hindi' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const flexGrow = keyDef.widthMultiplier || 1;

    return (
      <div
        className={classNames}
        style={{ flex: `${flexGrow} 0 0` }}
        data-code={keyDef.code}
        aria-hidden="true"
      >
        {keyDef.shiftedLabel && (
          <span className="key-label-shifted">{keyDef.shiftedLabel}</span>
        )}
        <span className="key-label-primary">{keyDef.primaryLabel}</span>

        {mistakeCount > 0 && (
          <span className="key-mistake-badge" title={`${mistakeCount} mistakes`}>
            {mistakeCount}
          </span>
        )}
      </div>
    );
  }
);

KeyboardKey.displayName = 'KeyboardKey';

export default KeyboardKey;
