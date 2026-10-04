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
      mistakeCount === 1 ? 'key-mistake-level-1' : '',
      mistakeCount >= 2 && mistakeCount <= 3 ? 'key-mistake-level-2' : '',
      mistakeCount >= 4 ? 'key-mistake-level-3' : '',
      isHindi ? 'key-hindi' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const flexGrow = keyDef.widthMultiplier || 1;
    const tooltip = mistakeCount > 0
      ? `${keyDef.primaryLabel} — ${mistakeCount} ${mistakeCount === 1 ? 'mistake' : 'mistakes'}`
      : undefined;

    return (
      <div
        className={classNames}
        style={{ flex: `${flexGrow} 0 0` }}
        data-code={keyDef.code}
        title={tooltip}
        aria-hidden="true"
      >
        {keyDef.shiftedLabel && (
          <span className="key-label-shifted">{keyDef.shiftedLabel}</span>
        )}
        <span className="key-label-primary">{keyDef.primaryLabel}</span>

        {mistakeCount > 0 && (
          <span className="key-mistake-badge" title={tooltip}>
            {mistakeCount}
          </span>
        )}
      </div>
    );
  }
);

KeyboardKey.displayName = 'KeyboardKey';

export default KeyboardKey;
