'use client';

import React from 'react';
import { KeyDefinition } from '@/engine/keyboardTypes';
import KeyboardKey from './KeyboardKey';

interface KeyboardRowProps {
  rowKeys: KeyDefinition[];
  nextKeyCodes: string[];
  activeKeyCodes: string[];
  lastCorrectCode?: string;
  lastIncorrectCode?: string;
  mistakeFrequencies: Map<string, number>;
  focusKeyCodes: string[];
  isHindi?: boolean;
}

export const KeyboardRow: React.FC<KeyboardRowProps> = React.memo(
  ({
    rowKeys,
    nextKeyCodes,
    activeKeyCodes,
    lastCorrectCode,
    lastIncorrectCode,
    mistakeFrequencies,
    focusKeyCodes,
    isHindi = false,
  }) => {
    return (
      <div className="keyboard-row">
        {rowKeys.map((keyDef) => {
          const isNext = nextKeyCodes.includes(keyDef.code);
          const isPressed = activeKeyCodes.includes(keyDef.code);
          const isCorrect = lastCorrectCode === keyDef.code;
          const isIncorrect = lastIncorrectCode === keyDef.code;
          const isFocus = focusKeyCodes.includes(keyDef.code);
          const mistakeCount = mistakeFrequencies.get(keyDef.code) || 0;

          return (
            <KeyboardKey
              key={keyDef.id}
              keyDef={keyDef}
              isNext={isNext}
              isPressed={isPressed}
              isCorrect={isCorrect}
              isIncorrect={isIncorrect}
              isFocus={isFocus}
              mistakeCount={mistakeCount}
              isHindi={isHindi}
            />
          );
        })}
      </div>
    );
  }
);

KeyboardRow.displayName = 'KeyboardRow';

export default KeyboardRow;
