'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  PracticePlan,
  PracticeType,
  generateCharacterPractice,
  generateBigramPractice,
  generateMissedWordsPractice,
} from '@/engine/practiceEngine';
import { COMMON_PRACTICE_WORDS, COMMON_BIGRAMS } from '@/data/practiceWords';
import { HINDI_PRACTICE_WORDS, HINDI_COMMON_BIGRAMS } from '@/data/hindiPracticeWords';
import { loadHistory } from '@/engine/progressStorage';
import { aggregateWeakCharacters } from '@/engine/progressAnalytics';
import { AggregatedWeakCharacter } from '@/engine/progressTypes';
import { TypingLanguage } from '@/engine/types';
import { segmentGraphemes } from '@/engine/textUtils';
import PracticeSession from './PracticeSession';

export const PracticeHub: React.FC = () => {
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [weakCharacters, setWeakCharacters] = useState<AggregatedWeakCharacter[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<TypingLanguage>('en');
  const [customMode, setCustomMode] = useState<PracticeType>('characters');
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [selectedTargetKeys, setSelectedTargetKeys] = useState<string[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PracticePlan | null>(null);
  const [activeSessionMode, setActiveSessionMode] = useState<PracticeType>('characters');

  // Load user test history and aggregate weak characters
  const refreshHistoryData = useCallback(() => {
    const entries = loadHistory();
    setHasHistory(entries.length > 0);

    const aggregated = aggregateWeakCharacters(entries, 6);
    setWeakCharacters(aggregated);

    // If latest entry was Hindi, set initial language to Hindi, otherwise English
    if (entries.length > 0 && entries[0].language === 'hi') {
      setSelectedLanguage('hi');
    }

    const initialKeys = aggregated.map((w) => w.character);
    setSelectedTargetKeys(initialKeys);
    setHistoryLoaded(true);
  }, []);

  useEffect(() => {
    refreshHistoryData();
  }, [refreshHistoryData]);


  // Effective target characters for practice generation
  const effectiveTargetChars = useMemo(() => {
    if (selectedTargetKeys.length > 0) {
      return selectedTargetKeys;
    }
    if (weakCharacters.length > 0) {
      return weakCharacters.map((w) => w.character);
    }
    // Fallback for general practice when no weak keys exist
    return selectedLanguage === 'hi' ? ['क', 'र', 'त'] : ['e', 'r', 't'];
  }, [selectedTargetKeys, weakCharacters, selectedLanguage]);

  // Toggle key selection in custom mode
  const handleToggleKey = (char: string) => {
    setSelectedTargetKeys((prev) => {
      if (prev.includes(char)) {
        const next = prev.filter((k) => k !== char);
        return next.length === 0 ? prev : next; // Prevent deselecting all
      }
      return [...prev, char];
    });
  };

  // Helper to generate a practice plan for given mode and targets
  const buildPlan = useCallback(
    (mode: PracticeType, targets: string[], lang: TypingLanguage): PracticePlan => {
      const activeWordPool = lang === 'hi' ? HINDI_PRACTICE_WORDS : COMMON_PRACTICE_WORDS;
      const activeBigramPool = lang === 'hi' ? HINDI_COMMON_BIGRAMS : COMMON_BIGRAMS;

      switch (mode) {
        case 'bigrams':
          return generateBigramPractice(targets, activeWordPool, lang, activeBigramPool);
        case 'words': {
          const targetSet = new Set(targets.map((c) => (lang === 'hi' ? c : c.toLowerCase())));
          const candidateWords = activeWordPool.filter((w) => {
            const graphemes = segmentGraphemes(w, lang);
            return graphemes.some((g) => targetSet.has(lang === 'hi' ? g : g.toLowerCase()));
          });
          const wordsToDrill = candidateWords.length > 0 ? candidateWords.slice(0, 10) : activeWordPool.slice(0, 10);
          return generateMissedWordsPractice(wordsToDrill, lang);
        }
        case 'characters':
        default:
          return generateCharacterPractice(targets, activeWordPool, lang);
      }
    },
    []
  );

  // Start recommended practice drill (default: Focus Keys targeting top weak characters)
  const handleStartRecommended = () => {
    const targets = weakCharacters.map((w) => w.character);
    const plan = buildPlan('characters', targets, selectedLanguage);
    setActiveSessionMode('characters');
    setCurrentPlan(plan);
  };

  // Start custom practice drill
  const handleStartCustom = () => {
    const plan = buildPlan(customMode, effectiveTargetChars, selectedLanguage);
    setActiveSessionMode(customMode);
    setCurrentPlan(plan);
  };

  // Start general practice drill (for flawless/low-data state)
  const handleStartGeneralPractice = () => {
    const defaultTargets = selectedLanguage === 'hi' ? ['क', 'म', 'न', 'र'] : ['e', 't', 'a', 'o', 'i', 'n'];
    const plan = buildPlan('characters', defaultTargets, selectedLanguage);
    setActiveSessionMode('characters');
    setCurrentPlan(plan);
  };

  // Handle mode switching inside the active PracticeSession
  const handleSessionModeChange = (newMode: PracticeType) => {
    setActiveSessionMode(newMode);
    const plan = buildPlan(newMode, effectiveTargetChars, selectedLanguage);
    setCurrentPlan(plan);
  };

  // Return to hub from practice session
  const handleBackToHub = () => {
    setCurrentPlan(null);
    refreshHistoryData();
  };

  // If a practice session is active, render the existing PracticeSession component
  if (currentPlan !== null) {
    return (
      <section className="typing-test-container" aria-label="Practice session workspace">
        <PracticeSession
          plan={currentPlan}
          activeMode={activeSessionMode}
          onChangeMode={handleSessionModeChange}
          onBackToTest={handleBackToHub}
          backButtonLabel="Back to Practice Hub"
        />
      </section>
    );
  }

  // Initial loading state before localStorage history is checked
  if (!historyLoaded) {
    return (
      <div className="practice-hub-wrapper" role="region" aria-label="Practice Hub">
        <div className="practice-hub-card">
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Loading practice profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="practice-hub-wrapper" role="region" aria-label="Targeted Practice Hub">
      {/* 1. Empty State: No history recorded yet */}
      {!hasHistory ? (
        <div className="practice-hub-card" data-testid="practice-empty-state">
          <div className="practice-icon-badge" aria-hidden="true">🎯</div>
          <h1 className="practice-hub-title">Practice</h1>
          <p className="practice-hub-subtitle">Build your first typing profile.</p>
          <p className="practice-hub-desc">
            Take a test first so TypingSpeed can identify the specific keys and patterns that need practice.
          </p>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Link
              href="/"
              className="btn-result-primary"
              data-testid="take-test-btn"
              style={{ textDecoration: 'none', display: 'inline-flex' }}
            >
              Take a 60s Test
            </Link>
          </div>
        </div>
      ) : weakCharacters.length === 0 ? (
        /* 2. Low-data / Flawless State: History exists, but no recorded mistakes */
        <div className="practice-hub-card" data-testid="practice-low-data-state">
          <div className="practice-icon-badge" aria-hidden="true">✨</div>
          <h1 className="practice-hub-title">Practice</h1>
          <p className="practice-hub-subtitle">No active weaknesses detected.</p>
          <p className="practice-hub-desc">
            Your recent tests show excellent accuracy with no recurring weak keys. Complete more tests with varied topics or longer durations to identify new focus areas.
          </p>
          <div className="practice-empty-actions">
            <Link
              href="/"
              className="btn-result-primary"
              data-testid="take-another-test-btn"
              style={{ textDecoration: 'none', display: 'inline-flex' }}
            >
              Take Another Test
            </Link>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleStartGeneralPractice}
              style={{ padding: 'var(--space-3) var(--space-6)' }}
            >
              Practice Common Keys
            </button>
          </div>
        </div>
      ) : (
        /* 3. Recommended Practice State: Active Weaknesses Detected */
        <div className="practice-hub-card" data-testid="practice-hub">
          {/* Header */}
          <div className="practice-hub-header">
            <h1 className="practice-hub-title">Practice</h1>
            <p className="practice-hub-subtitle">Improve the areas that slow you down.</p>
          </div>

          {/* Tier 1: Weakness Summary */}
          <div className="practice-weakness-section" data-testid="weak-keys-summary">
            <span className="practice-section-label">Your current weaknesses</span>
            <div className="practice-weak-chips-grid">
              {weakCharacters.map((w, idx) => (
                <div key={idx} className="mistyped-chip">
                  <span className="mistyped-chip-char">{w.displayLabel}</span>
                  <span className="mistyped-chip-count">{w.totalMistakes}×</span>
                </div>
              ))}
            </div>
            <p className="practice-weakness-note">Based on your recent typing history.</p>
          </div>

          {/* Tier 2: Primary Next Action (Start Recommended Practice) */}
          <div className="practice-primary-cta-group">
            <button
              type="button"
              className="btn-result-primary"
              data-testid="start-recommended-practice-btn"
              onClick={handleStartRecommended}
              autoFocus
              aria-label="Start Recommended Practice"
            >
              🎯 Start Recommended Practice
            </button>
          </div>

          {/* Tier 3: Secondary Action (Customize Practice) */}
          <div className="practice-customize-toggle-wrapper">
            <button
              type="button"
              className="btn-details-toggle"
              data-testid="customize-practice-btn"
              onClick={() => setIsCustomizeOpen((prev) => !prev)}
              aria-expanded={isCustomizeOpen}
              aria-controls="practice-customize-panel"
            >
              <span>{isCustomizeOpen ? 'Hide customization' : 'Customize Practice'}</span>
              <span aria-hidden="true" className="toggle-chevron">{isCustomizeOpen ? '▴' : '▾'}</span>
            </button>
          </div>

          {/* Tier 4: Progressive Disclosure (Customization Panel) */}
          {isCustomizeOpen && (
            <div
              id="practice-customize-panel"
              className="practice-customize-panel"
              role="region"
              aria-label="Customize Practice Settings"
              data-testid="customize-practice-panel"
            >
              {/* Language Selector */}
              <div className="customize-option-group">
                <span className="customize-option-label">Language</span>
                <div className="practice-mode-tabs" role="radiogroup" aria-label="Select practice language">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedLanguage === 'en'}
                    className={`practice-mode-tab ${selectedLanguage === 'en' ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage('en')}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedLanguage === 'hi'}
                    className={`practice-mode-tab ${selectedLanguage === 'hi' ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage('hi')}
                  >
                    हिंदी (Hindi)
                  </button>
                </div>
              </div>

              {/* Practice Strategy Mode */}
              <div className="customize-option-group">
                <span className="customize-option-label">Practice Strategy</span>
                <div className="practice-mode-tabs" role="radiogroup" aria-label="Select practice strategy">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={customMode === 'characters'}
                    className={`practice-mode-tab ${customMode === 'characters' ? 'active' : ''}`}
                    onClick={() => setCustomMode('characters')}
                    data-testid="custom-mode-characters"
                  >
                    Focus Keys
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={customMode === 'words'}
                    className={`practice-mode-tab ${customMode === 'words' ? 'active' : ''}`}
                    onClick={() => setCustomMode('words')}
                    data-testid="custom-mode-words"
                  >
                    Missed Words
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={customMode === 'bigrams'}
                    className={`practice-mode-tab ${customMode === 'bigrams' ? 'active' : ''}`}
                    onClick={() => setCustomMode('bigrams')}
                    data-testid="custom-mode-bigrams"
                  >
                    Targeted Bigrams
                  </button>
                </div>
              </div>

              {/* Target Key Selection */}
              <div className="customize-option-group">
                <span className="customize-option-label">Target Keys</span>
                <div className="practice-key-toggles" role="group" aria-label="Toggle target keys">
                  {weakCharacters.map((w, idx) => {
                    const isSelected = selectedTargetKeys.includes(w.character);
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`key-toggle-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleKey(w.character)}
                        aria-pressed={isSelected}
                        title={`Toggle ${w.displayLabel}`}
                      >
                        <span className="toggle-char">{w.displayLabel}</span>
                        <span className="toggle-check" aria-hidden="true">{isSelected ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Drill CTA */}
              <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="start-custom-practice-btn"
                  onClick={handleStartCustom}
                  style={{ minHeight: '40px', padding: 'var(--space-2) var(--space-6)' }}
                >
                  Start Custom Drill
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PracticeHub;
