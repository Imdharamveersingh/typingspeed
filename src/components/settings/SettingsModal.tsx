'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CursorShape,
  FontFamilyOption,
  SoundMode,
  TypingSettings,
  WhitespaceStyle,
  WordListSize,
} from '@/engine/settingsTypes';
import { getWordListStats } from '@/data/practiceWords';
import { playKeystrokeSound } from '@/utils/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TypingSettings;
  onUpdateSettings: (newSettings: Partial<TypingSettings>) => void;
}

type SettingsTab = 'text' | 'typing' | 'appearance' | 'sound';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('text');
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap / auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const wordStats = getWordListStats(settings.wordListSize);

  const handleTestSound = (type: 'correct' | 'incorrect') => {
    playKeystrokeSound(type, 'all', settings.soundVolume, settings.soundTheme);
  };

  return (
    <div
      className="settings-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="settings-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div className="settings-modal-header">
          <div>
            <h2 id="settings-modal-title" className="settings-modal-title">
              Typing Settings
            </h2>
            <p className="settings-modal-subtitle">
              Configure text generation, typing behavior, visual appearance, and audio feedback.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs-nav" role="tablist" aria-label="Settings categories">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            className={`settings-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            <span className="tab-icon">Aa</span>
            <span>Text</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'typing'}
            className={`settings-tab-btn ${activeTab === 'typing' ? 'active' : ''}`}
            onClick={() => setActiveTab('typing')}
          >
            <span className="tab-icon">⌨</span>
            <span>Typing</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'appearance'}
            className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <span className="tab-icon">🎨</span>
            <span>Appearance</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sound'}
            className={`settings-tab-btn ${activeTab === 'sound' ? 'active' : ''}`}
            onClick={() => setActiveTab('sound')}
          >
            <span className="tab-icon">🔊</span>
            <span>Sound</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-modal-body">
          {/* TAB 1: TEXT */}
          {activeTab === 'text' && (
            <div className="settings-tab-panel" role="tabpanel">
              {/* Text Source */}
              <div className="settings-group">
                <div className="settings-group-header">
                  <label className="settings-label">Text Source</label>
                  <span className="settings-hint">Select the vocabulary foundation for new tests</span>
                </div>
                <div className="settings-segmented-control" role="radiogroup" aria-label="Text Source">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings.textSource === 'common'}
                    className={`segmented-btn ${settings.textSource === 'common' ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ textSource: 'common' })}
                  >
                    Common Words (Default)
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings.textSource === 'paragraph'}
                    className={`segmented-btn ${settings.textSource === 'paragraph' ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ textSource: 'paragraph' })}
                  >
                    Paragraph Text
                  </button>
                </div>
                <p className="settings-note">
                  * Note: Pseudo-Words was intentionally omitted as it is not part of the standard curriculum.
                </p>
              </div>

              {/* Capital Letters */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">Include Capital Letters</span>
                  <span className="settings-row-description">
                    When OFF, tests use lowercase letters. When ON, natural capitalization is included.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${!settings.includeCapitalLetters ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ includeCapitalLetters: false })}
                    aria-pressed={!settings.includeCapitalLetters}
                  >
                    OFF
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.includeCapitalLetters ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ includeCapitalLetters: true })}
                    aria-pressed={settings.includeCapitalLetters}
                  >
                    ON
                  </button>
                </div>
              </div>

              {/* Special Characters */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">Include Special Characters</span>
                  <span className="settings-row-description">
                    When OFF, only letters and spaces appear. When ON, punctuation and standard symbols appear.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${!settings.includeSpecialCharacters ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ includeSpecialCharacters: false })}
                    aria-pressed={!settings.includeSpecialCharacters}
                  >
                    OFF
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.includeSpecialCharacters ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ includeSpecialCharacters: true })}
                    aria-pressed={settings.includeSpecialCharacters}
                  >
                    ON
                  </button>
                </div>
              </div>

              {/* Word List Size (for Common Words) */}
              <div className="settings-group">
                <div className="settings-group-header">
                  <label className="settings-label">Word List Size</label>
                  <span className="settings-hint">Select the active vocabulary breadth for word-based tests</span>
                </div>
                <div className="settings-segmented-control" role="radiogroup" aria-label="Word list size">
                  {(['small', 'medium', 'large'] as WordListSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      aria-checked={settings.wordListSize === size}
                      className={`segmented-btn ${settings.wordListSize === size ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ wordListSize: size })}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="settings-stats-badge">
                  <span>Available vocabulary: <strong>{wordStats.count} words</strong></span>
                  <span>Average word length: <strong>{wordStats.avgLength} chars</strong></span>
                </div>
              </div>

              {/* Language */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">Test Language</span>
                  <span className="settings-row-description">
                    Switch between English and Hindi Unicode typing layouts.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${settings.language === 'en' ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ language: 'en' })}
                    aria-pressed={settings.language === 'en'}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.language === 'hi' ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ language: 'hi' })}
                    aria-pressed={settings.language === 'hi'}
                  >
                    हिन्दी (Hindi)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TYPING */}
          {activeTab === 'typing' && (
            <div className="settings-tab-panel" role="tabpanel">
              <div className="settings-group-header" style={{ marginBottom: 'var(--space-4)' }}>
                <h3 className="settings-label" style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                  Typing Behavior
                </h3>
              </div>

              {/* Stop on Error */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">Stop on Error</span>
                  <span className="settings-row-description">
                    Require correcting the mistyped character before the cursor can advance.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${!settings.stopOnError ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ stopOnError: false, forgiveErrors: true })}
                    aria-pressed={!settings.stopOnError}
                  >
                    OFF
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.stopOnError ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ stopOnError: true, forgiveErrors: false })}
                    aria-pressed={settings.stopOnError}
                  >
                    ON
                  </button>
                </div>
              </div>

              {/* Allow Backspace */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">Allow Backspace</span>
                  <span className="settings-row-description">
                    Allow moving backward to correct previously typed characters.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${!settings.allowBackspace ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ allowBackspace: false })}
                    aria-pressed={!settings.allowBackspace}
                  >
                    OFF
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.allowBackspace ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ allowBackspace: true })}
                    aria-pressed={settings.allowBackspace}
                  >
                    ON
                  </button>
                </div>
              </div>

              {/* Forgive Errors */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">Forgive Errors</span>
                  <span className="settings-row-description">
                    Allow continuing past incorrect characters.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${!settings.forgiveErrors ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ forgiveErrors: false, stopOnError: true })}
                    aria-pressed={!settings.forgiveErrors}
                  >
                    OFF
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.forgiveErrors ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ forgiveErrors: true, stopOnError: false })}
                    aria-pressed={settings.forgiveErrors}
                  >
                    ON
                  </button>
                </div>
              </div>

              {/* Space Skips Word */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">Space Skips Word</span>
                  <span className="settings-row-description">
                    Pressing Space skips the remaining characters in the current word.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${!settings.spaceSkipsWord ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ spaceSkipsWord: false })}
                    aria-pressed={!settings.spaceSkipsWord}
                  >
                    OFF
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.spaceSkipsWord ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ spaceSkipsWord: true })}
                    aria-pressed={settings.spaceSkipsWord}
                  >
                    ON
                  </button>
                </div>
              </div>

              {/* Keyboard Visibility */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">On-Screen Keyboard</span>
                  <span className="settings-row-description">
                    Show the virtual keyboard below the typing passage.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${!settings.keyboardVisible ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ keyboardVisible: false })}
                    aria-pressed={!settings.keyboardVisible}
                  >
                    Hidden
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.keyboardVisible ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ keyboardVisible: true })}
                    aria-pressed={settings.keyboardVisible}
                  >
                    Visible
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="settings-tab-panel" role="tabpanel">
              {/* Font Family */}
              <div className="settings-group">
                <div className="settings-group-header">
                  <label className="settings-label">Passage Font</label>
                  <span className="settings-hint">Choose between clean sans-serif or fixed-width monospace</span>
                </div>
                <div className="settings-segmented-control" role="radiogroup" aria-label="Font family">
                  {[
                    { id: 'default', label: 'Default' },
                    { id: 'mono', label: 'Monospace' },
                    { id: 'sans', label: 'Sans Serif' },
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      role="radio"
                      aria-checked={settings.fontFamily === font.id}
                      className={`segmented-btn ${settings.fontFamily === font.id ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ fontFamily: font.id as FontFamilyOption })}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Whitespace Style */}
              <div className="settings-group">
                <div className="settings-group-header">
                  <label className="settings-label">Whitespace Indicator</label>
                  <span className="settings-hint">Visual indicator representation for space characters</span>
                </div>
                <div className="settings-segmented-control" role="radiogroup" aria-label="Whitespace style">
                  {[
                    { id: 'normal', label: 'Normal (Empty)' },
                    { id: 'bar', label: 'Bar (␣)' },
                    { id: 'bullet', label: 'Bullet (·)' },
                  ].map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      role="radio"
                      aria-checked={settings.whitespaceStyle === ws.id}
                      className={`segmented-btn ${settings.whitespaceStyle === ws.id ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ whitespaceStyle: ws.id as WhitespaceStyle })}
                    >
                      {ws.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cursor Shape */}
              <div className="settings-group">
                <div className="settings-group-header">
                  <label className="settings-label">Cursor Shape</label>
                  <span className="settings-hint">Styling of the active typing position caret</span>
                </div>
                <div className="settings-segmented-control" role="radiogroup" aria-label="Cursor shape">
                  {[
                    { id: 'underline', label: 'Underline' },
                    { id: 'line', label: 'Vertical Line' },
                    { id: 'block', label: 'Block' },
                    { id: 'box', label: 'Box' },
                  ].map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      role="radio"
                      aria-checked={settings.cursorShape === shape.id}
                      className={`segmented-btn ${settings.cursorShape === shape.id ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ cursorShape: shape.id as CursorShape })}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cursor Movement */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">Cursor Movement Animation</span>
                  <span className="settings-row-description">
                    Smooth sliding animation or instantaneous jumping between characters.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${settings.cursorMovement === 'smooth' ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ cursorMovement: 'smooth' })}
                    aria-pressed={settings.cursorMovement === 'smooth'}
                  >
                    Smooth
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.cursorMovement === 'jumping' ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ cursorMovement: 'jumping' })}
                    aria-pressed={settings.cursorMovement === 'jumping'}
                  >
                    Jumping
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SOUND */}
          {activeTab === 'sound' && (
            <div className="settings-tab-panel" role="tabpanel">
              {/* Sound Mode */}
              <div className="settings-group">
                <div className="settings-group-header">
                  <label className="settings-label">Sound Feedback</label>
                  <span className="settings-hint">Auditory feedback using lightweight Web Audio synthesizer</span>
                </div>
                <div className="settings-segmented-control" role="radiogroup" aria-label="Sound mode">
                  {[
                    { id: 'off', label: 'No Sounds' },
                    { id: 'error-only', label: 'Errors Only' },
                    { id: 'key-only', label: 'Keys Only' },
                    { id: 'all', label: 'All Sounds' },
                  ].map((sm) => (
                    <button
                      key={sm.id}
                      type="button"
                      role="radio"
                      aria-checked={settings.soundMode === sm.id}
                      className={`segmented-btn ${settings.soundMode === sm.id ? 'active' : ''}`}
                      onClick={() => {
                        onUpdateSettings({ soundMode: sm.id as SoundMode });
                        if (sm.id !== 'off') {
                          playKeystrokeSound('correct', sm.id as SoundMode, settings.soundVolume, settings.soundTheme);
                        }
                      }}
                    >
                      {sm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Theme */}
              <div className="settings-row">
                <div className="settings-row-text">
                  <span className="settings-row-label">Sound Theme</span>
                  <span className="settings-row-description">
                    Mechanical keyboard click or gentle electronic beep.
                  </span>
                </div>
                <div className="settings-toggle-group">
                  <button
                    type="button"
                    className={`pill-btn ${settings.soundTheme === 'click' ? 'active' : ''}`}
                    onClick={() => {
                      onUpdateSettings({ soundTheme: 'click' });
                      playKeystrokeSound('correct', 'all', settings.soundVolume, 'click');
                    }}
                    aria-pressed={settings.soundTheme === 'click'}
                  >
                    Mechanical Click
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${settings.soundTheme === 'beep' ? 'active' : ''}`}
                    onClick={() => {
                      onUpdateSettings({ soundTheme: 'beep' });
                      playKeystrokeSound('correct', 'all', settings.soundVolume, 'beep');
                    }}
                    aria-pressed={settings.soundTheme === 'beep'}
                  >
                    Electronic Beep
                  </button>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="settings-group">
                <div className="settings-group-header">
                  <div className="settings-slider-header">
                    <label className="settings-label" htmlFor="sound-volume-slider">Volume</label>
                    <span className="settings-slider-value">{settings.soundVolume}%</span>
                  </div>
                  <span className="settings-hint">Adjust playback volume level</span>
                </div>
                <div className="settings-volume-control">
                  <input
                    id="sound-volume-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={settings.soundVolume}
                    onChange={(e) => onUpdateSettings({ soundVolume: parseInt(e.target.value, 10) })}
                    className="settings-range-slider"
                  />
                  <div className="settings-test-sound-buttons">
                    <button
                      type="button"
                      className="test-sound-btn"
                      onClick={() => handleTestSound('correct')}
                    >
                      ▶ Test Key Sound
                    </button>
                    <button
                      type="button"
                      className="test-sound-btn test-error-btn"
                      onClick={() => handleTestSound('incorrect')}
                    >
                      ▶ Test Error Sound
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="settings-modal-footer">
          <span className="settings-footer-info">
            Changes apply to your next test.
          </span>
          <button
            type="button"
            className="settings-done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
