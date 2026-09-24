'use client';

import React, { useEffect, useState } from 'react';
import { getLayoutForLanguage } from '@/engine/keyboardLayouts';
import { getKeyboardHighlightState } from '@/engine/keyboardUtils';
import { TypingLanguage, TypingState } from '@/engine/types';
import KeyboardRow from './KeyboardRow';

const STORAGE_KEY_KEYBOARD_VISIBLE = 'typing_platform_keyboard_visible';

interface VirtualKeyboardProps {
  typingState: TypingState;
  language: TypingLanguage;
  recentKey?: { code?: string; status?: 'correct' | 'incorrect' } | null;
  mistakes?: { character: string; count: number }[];
  focusKeys?: string[];
  initialVisible?: boolean;
  visible?: boolean;
  onToggleVisible?: () => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  typingState,
  language,
  recentKey,
  mistakes,
  focusKeys,
  initialVisible = false,
  visible,
  onToggleVisible,
}) => {
  const [internalVisible, setInternalVisible] = useState<boolean>(initialVisible);
  const [showMistakeHeatmap, setShowMistakeHeatmap] = useState<boolean>(false);

  // Restore visibility preference on client mount if not explicitly controlled
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_KEYBOARD_VISIBLE);
      if (saved !== null) {
        setInternalVisible(saved === 'true');
      }
    } catch {
      // Ignore storage errors in restricted iframe/browser environments
    }
  }, []);

  const isVisible = visible !== undefined ? visible : internalVisible;

  const handleToggleVisibility = () => {
    if (onToggleVisible) {
      onToggleVisible();
    } else {
      const nextVal = !internalVisible;
      setInternalVisible(nextVal);
      try {
        localStorage.setItem(STORAGE_KEY_KEYBOARD_VISIBLE, String(nextVal));
      } catch {
        // Ignore storage errors
      }
    }
  };

  const layout = getLayoutForLanguage(language);
  const isHindi = language === 'hi';

  const highlightState = getKeyboardHighlightState({
    typingState,
    language,
    recentKey,
    mistakes: showMistakeHeatmap ? mistakes : undefined,
    focusKeys,
  });

  const hasMistakes = Boolean(mistakes && mistakes.length > 0);

  return (
    <div
      className="virtual-keyboard-container"
      role="region"
      aria-label="Virtual keyboard reference visualization"
    >
      {/* Keyboard Header Toolbar */}
      <div className="virtual-keyboard-header">
        <div className="keyboard-identity-group">
          <span className="keyboard-layout-name" data-testid="keyboard-layout-name">
            {layout.name}
          </span>
          {layout.isReferenceOnly && (
            <span
              className="keyboard-reference-badge"
              title="Reference layout for standard InScript. Operating system IME produces direct Unicode."
            >
              Reference
            </span>
          )}
        </div>

        {/* Expected next input & Modifier indicator */}
        {isVisible && typingState.status !== 'completed' && (
          <div className="keyboard-status-indicator" data-testid="keyboard-next-indicator">
            {highlightState.expectedDisplayGrapheme ? (
              <>
                <span className="indicator-label">Next:</span>
                <span className="indicator-grapheme">
                  {highlightState.expectedDisplayGrapheme === ' '
                    ? 'Space'
                    : highlightState.expectedDisplayGrapheme}
                </span>
                {highlightState.isShiftRequired && (
                  <span className="indicator-modifier" title="Requires Shift key">
                    [Shift]
                  </span>
                )}
                {highlightState.unmappedNotice && (
                  <span
                    className="indicator-unmapped"
                    title="Devanagari sequence input is handled directly by your IME/system"
                  >
                    (IME input)
                  </span>
                )}
              </>
            ) : (
              <span className="indicator-ready">Ready</span>
            )}
          </div>
        )}

        {/* Controls: Heatmap switch & Visibility toggle */}
        <div className="keyboard-controls-group">
          {hasMistakes && isVisible && (
            <button
              type="button"
              className={`btn-keyboard-action ${showMistakeHeatmap ? 'active' : ''}`}
              onClick={() => setShowMistakeHeatmap((prev) => !prev)}
              title="Toggle mistake hotspot density on keyboard"
              data-testid="toggle-mistake-heatmap-btn"
            >
              {showMistakeHeatmap ? 'Hide Mistakes' : 'Show Mistakes'}
            </button>
          )}

          <button
            type="button"
            className="btn-keyboard-toggle"
            onClick={handleToggleVisibility}
            aria-expanded={isVisible}
            data-testid="toggle-keyboard-btn"
            title={isVisible ? 'Hide virtual keyboard' : 'Show virtual keyboard'}
          >
            {isVisible ? '⌨️ Hide Keyboard' : '⌨️ Show Keyboard'}
          </button>
        </div>
      </div>

      {/* Main Interactive Keyboard Surface */}
      {isVisible && (
        <div className="keyboard-frame" data-testid="virtual-keyboard-frame">
          {layout.rows.map((rowKeys, rowIdx) => (
            <KeyboardRow
              key={rowIdx}
              rowKeys={rowKeys}
              nextKeyCodes={highlightState.nextKeyCodes}
              activeKeyCodes={highlightState.activeKeyCodes}
              lastCorrectCode={highlightState.lastCorrectCode}
              lastIncorrectCode={highlightState.lastIncorrectCode}
              mistakeFrequencies={highlightState.mistakeFrequencies}
              focusKeyCodes={highlightState.focusKeyCodes}
              isHindi={isHindi}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VirtualKeyboard;
