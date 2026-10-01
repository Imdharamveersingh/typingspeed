import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createInitialState,
  processKeystroke,
  getCompletedWordCount,
} from '@/engine/typingEngine';
import { calculateProgressPercentage } from './TypingProgressBar';
import { MetricsBar } from './MetricsBar';
import { ResultCard } from './ResultCard';
import { VirtualKeyboard } from '@/components/keyboard/VirtualKeyboard';
import { getKeyboardHighlightState } from '@/engine/keyboardUtils';
import { Passage, TypingState } from '@/engine/types';

describe('TypingSpeed UI Polish + Metrics + Backspace Progress Regressions', () => {
  // =========================================================================
  // A. Header: Same Background and No Border Divider
  // =========================================================================
  describe('A. Header & Body Visual Consistency', () => {
    const cssPath = path.resolve(__dirname, '../../styles/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    it('header and body use the same background variable (--bg-primary)', () => {
      // Body background
      expect(cssContent).toMatch(/body\s*\{[^}]*background-color:\s*var\(--bg-primary\);/s);

      // App header background in light and dark modes
      expect(cssContent).toMatch(/\.app-header\s*\{[^}]*background-color:\s*var\(--bg-primary\);/s);
      expect(cssContent).toMatch(/\[data-theme="dark"\]\s+\.app-header\s*\{[^}]*background-color:\s*var\(--bg-primary\);/s);
    });

    it('removes header bottom border and visual separator line', () => {
      // .app-header must have border-bottom: none
      expect(cssContent).toMatch(/\.app-header\s*\{[^}]*border-bottom:\s*none;/s);
      // Must not have 1px solid border-subtle
      const headerBlockMatch = cssContent.match(/\.app-header\s*\{([^}]+)\}/s);
      expect(headerBlockMatch).not.toBeNull();
      const headerBlock = headerBlockMatch![1];
      expect(headerBlock).not.toContain('1px solid var(--border-subtle)');
    });
  });

  // =========================================================================
  // B. Target Metric Alignment
  // =========================================================================
  describe('B. Target Metric Presentation & Clean Alignment', () => {
    const cssPath = path.resolve(__dirname, '../../styles/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    const dummyMetrics = {
      grossWPM: 65,
      netWPM: 60,
      accuracy: 98,
      elapsedSeconds: 15,
      remainingSeconds: 45,
      correctCharacters: 80,
      incorrectCharacters: 2,
      extraCharacters: 0,
      totalKeystrokes: 82,
      uncorrectedErrors: 0,
    };

    it('Words target renders correctly with label and structured values', () => {
      const html = renderToStaticMarkup(
        React.createElement(MetricsBar, {
          metrics: dummyMetrics,
          testType: 'words',
          targetProgress: { current: 15, total: 50 },
        })
      );

      expect(html).toContain('metric-target-progress');
      expect(html).toContain('target-progress-value');
      expect(html).toContain('target-num');
      expect(html).toContain('15');
      expect(html).toContain('50');
      expect(html).toContain('Words');
    });

    it('Characters target renders correctly with label and structured values', () => {
      const html = renderToStaticMarkup(
        React.createElement(MetricsBar, {
          metrics: dummyMetrics,
          testType: 'characters',
          targetProgress: { current: 9, total: 1000 },
        })
      );

      expect(html).toContain('metric-target-progress');
      expect(html).toContain('target-progress-value');
      expect(html).toContain('target-num');
      expect(html).toContain('9');
      expect(html).toContain('1000');
      expect(html).toContain('Characters');
    });

    it('CSS provides dedicated horizontal alignment preventing broken wrapping of "9 / 1000"', () => {
      // Must have .metric-target-progress and .target-progress-value with horizontal alignment and nowrap
      expect(cssContent).toMatch(/\.metric-target-progress\s*\{[^}]*min-width:/s);
      expect(cssContent).toMatch(/\.target-progress-value\s*\{[^}]*display:\s*inline-flex;/s);
      expect(cssContent).toMatch(/\.target-progress-value\s*\{[^}]*flex-direction:\s*row;/s);
      expect(cssContent).toMatch(/\.target-progress-value\s*\{[^}]*align-items:\s*baseline;/s);
      expect(cssContent).toMatch(/\.target-progress-value\s*\{[^}]*white-space:\s*nowrap;/s);
      expect(cssContent).toMatch(/\.target-progress-value\s+\.target-num\s*\{[^}]*text-align:\s*center;/s);
      expect(cssContent).toMatch(/\.target-progress-value\s+\.target-slash\s*\{[^}]*text-align:\s*center;/s);
      expect(cssContent).toMatch(/\.target-progress-value\s+\.target-den\s*\{[^}]*text-align:\s*center;/s);
    });

    it('Typing progress bar track height is 3px pill shape and centered with max-width', () => {
      expect(cssContent).toMatch(/\.typing-progress-bar-track\s*\{[^}]*height:\s*3px;/s);
      expect(cssContent).toMatch(/\.typing-progress-bar-track\s*\{[^}]*border-radius:\s*9999px;/s);
      expect(cssContent).toMatch(/\.typing-progress-bar-wrapper\s*\{[^}]*max-width:\s*720px;/s);
    });

    it('Toolbar option buttons have no border or shadow and subtle hover background', () => {
      expect(cssContent).toMatch(/\.toolbar-pill\s*\{[^}]*background-color:\s*transparent;/s);
      expect(cssContent).toMatch(/\.toolbar-pill\s*\{[^}]*border:\s*1px\s+solid\s+transparent;/s);
      expect(cssContent).toMatch(/\.toolbar-pill\s*\{[^}]*box-shadow:\s*none;/s);
      expect(cssContent).toMatch(/\.toolbar-pill:hover:not\(:disabled\)\s*\{[^}]*border-color:\s*transparent;/s);
    });
  });

  // =========================================================================
  // C. Character Progress: Type 1 -> 1, Type 10 -> 10, Backspace -> 9, Backspace -> 8
  // =========================================================================
  describe('C. Character Progress Forward & Backspace Tracking', () => {
    const passage: Passage = {
      id: 'char-passage-100',
      title: '100 Chars',
      text: 'abcdefghij0123456789klmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz',
      language: 'en',
      difficulty: 'medium',
    };

    it('accurately advances on type and decreases on Backspace without increasing', () => {
      let state = createInitialState(passage, 60, 'characters', 100);
      expect(state.currentIndex).toBe(0);

      // Type 1 character: 'a'
      state = processKeystroke(state, 'a', 1000);
      expect(state.currentIndex).toBe(1);
      let pct = calculateProgressPercentage({
        testType: 'characters',
        status: state.status,
        duration: 60,
        elapsedSeconds: 1,
        targetProgress: { current: state.currentIndex, total: 100 },
      });
      expect(pct).toBe(1);

      // Type next 9 characters to reach 10 characters typed
      const keys = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      keys.forEach((k, idx) => {
        state = processKeystroke(state, k, 1100 + idx * 100);
      });
      expect(state.currentIndex).toBe(10);
      pct = calculateProgressPercentage({
        testType: 'characters',
        status: state.status,
        duration: 60,
        elapsedSeconds: 2,
        targetProgress: { current: state.currentIndex, total: 100 },
      });
      expect(pct).toBe(10);

      // Press Backspace once -> progress MUST become 9% (NOT 11%)
      state = processKeystroke(state, 'Backspace', 2500);
      expect(state.currentIndex).toBe(9);
      pct = calculateProgressPercentage({
        testType: 'characters',
        status: state.status,
        duration: 60,
        elapsedSeconds: 3,
        targetProgress: { current: state.currentIndex, total: 100 },
      });
      expect(pct).toBe(9);

      // Press Backspace second time -> progress MUST become 8% (NOT 12%)
      state = processKeystroke(state, 'Backspace', 2600);
      expect(state.currentIndex).toBe(8);
      pct = calculateProgressPercentage({
        testType: 'characters',
        status: state.status,
        duration: 60,
        elapsedSeconds: 4,
        targetProgress: { current: state.currentIndex, total: 100 },
      });
      expect(pct).toBe(8);
    });
  });

  // =========================================================================
  // D. Character Target: 100% and Backspace from Completed State
  // =========================================================================
  describe('D. Character Target Completion & Backspace from Completed State', () => {
    const shortPassage: Passage = {
      id: 'short-10',
      title: 'Ten Chars',
      text: '0123456789',
      language: 'en',
      difficulty: 'easy',
    };

    it('100 / 100 reaches 100% and Backspace from completed state decreases progress correctly', () => {
      let state = createInitialState(shortPassage, 60, 'characters', 10);

      // Type all 10 characters
      const chars = shortPassage.text.split('');
      chars.forEach((c, idx) => {
        state = processKeystroke(state, c, 1000 + idx * 100);
      });

      expect(state.currentIndex).toBe(10);
      expect(state.status).toBe('completed');

      let pct = calculateProgressPercentage({
        testType: 'characters',
        status: state.status,
        duration: 60,
        elapsedSeconds: 2,
        targetProgress: { current: state.currentIndex, total: 10 },
      });
      expect(pct).toBe(100);

      // Press Backspace from completed state
      state = processKeystroke(state, 'Backspace', 2500);
      expect(state.status).toBe('running');
      expect(state.currentIndex).toBe(9);
      expect(state.characters[9].state).toBe('untyped');

      pct = calculateProgressPercentage({
        testType: 'characters',
        status: state.status,
        duration: 60,
        elapsedSeconds: 3,
        targetProgress: { current: state.currentIndex, total: 10 },
      });
      expect(pct).toBe(90);

      // Press Backspace again
      state = processKeystroke(state, 'Backspace', 2600);
      expect(state.currentIndex).toBe(8);

      pct = calculateProgressPercentage({
        testType: 'characters',
        status: state.status,
        duration: 60,
        elapsedSeconds: 4,
        targetProgress: { current: state.currentIndex, total: 10 },
      });
      expect(pct).toBe(80);
    });
  });

  // =========================================================================
  // E. Words Progress: Word Boundary Invalidation on Backspace
  // =========================================================================
  describe('E. Words Progress & Word Boundary Invalidation', () => {
    const passage: Passage = {
      id: 'words-5',
      title: 'Five Words',
      text: 'alpha beta gamma delta epsilon',
      language: 'en',
      difficulty: 'easy',
    };

    it('completed words increase progress and Backspace invalidating boundary decreases progress', () => {
      let state = createInitialState(passage, 60, 'words', 5);

      // Type "alpha" (not completed until boundary space)
      'alpha'.split('').forEach((c, idx) => {
        state = processKeystroke(state, c, 1000 + idx * 50);
      });
      expect(getCompletedWordCount(state)).toBe(0);

      // Type space after "alpha" -> word 1 completed
      state = processKeystroke(state, ' ', 1300);
      expect(getCompletedWordCount(state)).toBe(1);

      let pct = calculateProgressPercentage({
        testType: 'words',
        status: state.status,
        duration: 60,
        elapsedSeconds: 1.5,
        targetProgress: { current: getCompletedWordCount(state), total: 5 },
      });
      expect(pct).toBe(20);

      // Type "beta " -> word 2 completed
      'beta '.split('').forEach((c, idx) => {
        state = processKeystroke(state, c, 1400 + idx * 50);
      });
      expect(getCompletedWordCount(state)).toBe(2);

      pct = calculateProgressPercentage({
        testType: 'words',
        status: state.status,
        duration: 60,
        elapsedSeconds: 2,
        targetProgress: { current: getCompletedWordCount(state), total: 5 },
      });
      expect(pct).toBe(40);

      // Press Backspace once to remove the space after "beta" -> boundary invalidated!
      state = processKeystroke(state, 'Backspace', 2000);
      expect(getCompletedWordCount(state)).toBe(1);

      pct = calculateProgressPercentage({
        testType: 'words',
        status: state.status,
        duration: 60,
        elapsedSeconds: 2.2,
        targetProgress: { current: getCompletedWordCount(state), total: 5 },
      });
      expect(pct).toBe(20);

      // Type space again -> word 2 restored
      state = processKeystroke(state, ' ', 2100);
      expect(getCompletedWordCount(state)).toBe(2);

      pct = calculateProgressPercentage({
        testType: 'words',
        status: state.status,
        duration: 60,
        elapsedSeconds: 2.5,
        targetProgress: { current: getCompletedWordCount(state), total: 5 },
      });
      expect(pct).toBe(40);
    });
  });

  // =========================================================================
  // F. Time Mode: Active Elapsed Time & Idle Freeze Intact
  // =========================================================================
  describe('F. Time Mode Progress & Idle Freeze Invariance', () => {
    it('active elapsed time proportionately advances time progress', () => {
      const pct = calculateProgressPercentage({
        testType: 'time',
        status: 'running',
        duration: 60,
        elapsedSeconds: 30,
      });
      expect(pct).toBe(50);
    });

    it('idle periods do not artificially advance time progress', () => {
      // At elapsed active time 15s of 60s
      const pct1 = calculateProgressPercentage({
        testType: 'time',
        status: 'running',
        duration: 60,
        elapsedSeconds: 15,
      });
      expect(pct1).toBe(25);

      // When user is idle, active accumulated seconds stay 15s
      const pct2 = calculateProgressPercentage({
        testType: 'time',
        status: 'running',
        duration: 60,
        elapsedSeconds: 15,
      });
      expect(pct2).toBe(25);
    });
  });

  // =========================================================================
  // G. Completed Result Screen: Hierarchy & Absence of Toolbar
  // =========================================================================
  describe('G. Completed Result Screen Hierarchy', () => {
    function createCompletedStateWithMistakes(): TypingState {
      const passage: Passage = {
        id: 'test-p1',
        title: 'Test',
        text: 'The quick brown fox',
        language: 'en',
        difficulty: 'medium',
      };
      let state = createInitialState(passage, 60, 'time');
      // Type 'The qu' correctly, then error on 'i' (typed 'x'), then 'ck'
      'The qu'.split('').forEach((c, i) => {
        state = processKeystroke(state, c, 1000 + i * 50);
      });
      state = processKeystroke(state, 'x', 1400); // mistake on 'i'
      'ck'.split('').forEach((c, i) => {
        state = processKeystroke(state, c, 1500 + i * 50);
      });
      return {
        ...state,
        status: 'completed',
        startTime: 1000,
        endTime: 2000,
      };
    }

    it('completed result screen renders result summary and primary/secondary actions', () => {
      const state = createCompletedStateWithMistakes();
      const html = renderToStaticMarkup(
        React.createElement(ResultCard, {
          state,
          onRestart: () => {},
          onChangeTest: () => {},
          onPracticeMistakes: () => {},
          testMode: 'standard',
        })
      );

      // Result summary visible
      expect(html).toContain('result-card');
      expect(html).toContain('Test Complete');

      // Practice My Mistakes visible as primary CTA
      expect(html).toContain('Practice My Mistakes');
      expect(html).toContain('practice-mistakes-btn');

      // Three secondary actions visible
      expect(html).toContain('Test Again');
      expect(html).toContain('Change Test');
      expect(html).toContain('View Progress');
    });

    it('TypingTest component file conditionally hides TestToolbar and ExamActiveBar on completion', () => {
      const typingTestPath = path.resolve(__dirname, './TypingTest.tsx');
      const content = fs.readFileSync(typingTestPath, 'utf-8');

      // Toolbar is only rendered when not completed
      expect(content).toMatch(/\{!isCompleted\s*&&\s*\(\s*<TestToolbar/s);
      expect(content).toMatch(/\{!isCompleted\s*&&\s*testMode\s*===\s*'exam'\s*&&\s*\(\s*<ExamActiveBar/s);
    });
  });

  // =========================================================================
  // H. "Test Again" Visible Label: Remove "(Esc)" Text
  // =========================================================================
  describe('H. "Test Again" Action Label', () => {
    it('renders "Test Again" without "(Esc)" text in both mistake and flawless results', () => {
      const passage: Passage = {
        id: 'p-flawless',
        title: 'P',
        text: 'Clean test',
        language: 'en',
        difficulty: 'easy',
      };
      let flawlessState = createInitialState(passage, 60, 'time');
      'Clean test'.split('').forEach((c, i) => {
        flawlessState = processKeystroke(flawlessState, c, 1000 + i * 50);
      });
      flawlessState = {
        ...flawlessState,
        status: 'completed',
        startTime: 1000,
        endTime: 2000,
      };

      const htmlFlawless = renderToStaticMarkup(
        React.createElement(ResultCard, {
          state: flawlessState,
          onRestart: () => {},
          onChangeTest: () => {},
          onPracticeMistakes: () => {},
          testMode: 'standard',
        })
      );

      expect(htmlFlawless).toContain('Test Again');
      expect(htmlFlawless).not.toContain('Test Again (Esc)');
      expect(htmlFlawless).not.toContain('(Esc)');

      // With mistakes
      const stateWithMistakes = {
        ...flawlessState,
        characters: flawlessState.characters.map((ch, idx) =>
          idx === 2 ? { ...ch, state: 'incorrect' as const, typedChar: 'z' } : ch
        ),
      };
      const htmlMistakes = renderToStaticMarkup(
        React.createElement(ResultCard, {
          state: stateWithMistakes,
          onRestart: () => {},
          onChangeTest: () => {},
          onPracticeMistakes: () => {},
          testMode: 'standard',
        })
      );

      expect(htmlMistakes).toContain('Test Again');
      expect(htmlMistakes).not.toContain('Test Again (Esc)');
      expect(htmlMistakes).not.toContain('(Esc)');
    });
  });

  // =========================================================================
  // I. Three Secondary Actions: Visual Clarity as Clickable Buttons
  // =========================================================================
  describe('I. Three Secondary Actions Button Styling', () => {
    const cssPath = path.resolve(__dirname, '../../styles/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    it('CSS provides clear clickable secondary button appearance', () => {
      // Must style .btn-result-secondary with background, border, padding, border-radius
      expect(cssContent).toMatch(/\.btn-result-secondary[^{]*\{[^}]*background-color:/s);
      expect(cssContent).toMatch(/\.btn-result-secondary[^{]*\{[^}]*border:\s*1px\s+solid/s);
      expect(cssContent).toMatch(/\.btn-result-secondary[^{]*\{[^}]*padding:/s);
      expect(cssContent).toMatch(/\.btn-result-secondary[^{]*\{[^}]*border-radius:/s);
      expect(cssContent).toMatch(/\.btn-result-secondary:hover/s);
      expect(cssContent).toMatch(/\.btn-result-secondary:focus-visible/s);
    });

    it('ResultCard renders the 3 secondary buttons with btn-result-secondary class', () => {
      const passage: Passage = {
        id: 'p-btn',
        title: 'Btn',
        text: 'Error text',
        language: 'en',
        difficulty: 'easy',
      };
      let state = createInitialState(passage, 60, 'time');
      'Error'.split('').forEach((c, i) => {
        state = processKeystroke(state, c, 1000 + i * 50);
      });
      // Mistake
      state = processKeystroke(state, 'z', 1300);
      state = {
        ...state,
        status: 'completed',
        startTime: 1000,
        endTime: 2000,
      };

      const html = renderToStaticMarkup(
        React.createElement(ResultCard, {
          state,
          onRestart: () => {},
          onChangeTest: () => {},
          onPracticeMistakes: () => {},
          testMode: 'standard',
        })
      );

      // Verify secondary actions container
      expect(html).toContain('result-secondary-actions');
      expect(html).toContain('btn-result-secondary');
      expect(html).toContain('Test Again');
      expect(html).toContain('Change Test');
      expect(html).toContain('View Progress');
    });
  });

  // =========================================================================
  // J. Keyboard Mistake Heatmap: Dynamic Mistake Highlighting & Normal on Zero
  // =========================================================================
  describe('J. Keyboard Mistake Heatmap Dynamic Highlight', () => {
    it('highlights actual mistake key dynamically without hardcoding', () => {
      const dummyState: TypingState = {
        status: 'completed',
        passage: { id: 'p', title: 'T', text: 'Text', language: 'en', difficulty: 'easy' },
        duration: 60,
        startTime: 1000,
        endTime: 2000,
        currentIndex: 4,
        characters: [],
        extraCharacters: [],
        totalKeystrokes: 10,
        correctStrokes: 10,
        incorrectStrokes: 0,
      };

      // Mistake on 'T' (KeyT)
      const highlightStateT = getKeyboardHighlightState({
        typingState: dummyState,
        language: 'en',
        mistakes: [{ character: 'T', count: 3 }],
      });

      expect(highlightStateT.mistakeFrequencies.get('KeyT')).toBe(3);
      expect(highlightStateT.mistakeFrequencies.get('KeyA')).toBeUndefined();

      // Mistake on 'B' (KeyB)
      const highlightStateB = getKeyboardHighlightState({
        typingState: dummyState,
        language: 'en',
        mistakes: [{ character: 'B', count: 2 }],
      });

      expect(highlightStateB.mistakeFrequencies.get('KeyB')).toBe(2);
      expect(highlightStateB.mistakeFrequencies.get('KeyT')).toBeUndefined();
    });

    it('dynamically supports Space, Enter, Backspace, Shift, and multiple mistake keys', () => {
      const dummyState: TypingState = {
        status: 'completed',
        passage: { id: 'p', title: 'T', text: 'Text', language: 'en', difficulty: 'easy' },
        duration: 60,
        startTime: 1000,
        endTime: 2000,
        currentIndex: 4,
        characters: [],
        extraCharacters: [],
        totalKeystrokes: 10,
        correctStrokes: 10,
        incorrectStrokes: 0,
      };

      const highlightMultiple = getKeyboardHighlightState({
        typingState: dummyState,
        language: 'en',
        mistakes: [
          { character: 'Space', count: 4 },
          { character: 'Enter', count: 1 },
          { character: 'Backspace', count: 2 },
          { character: 'Shift', count: 1 },
          { character: 'A', count: 3 },
        ],
      });

      expect(highlightMultiple.mistakeFrequencies.get('Space')).toBe(4);
      expect(highlightMultiple.mistakeFrequencies.get('Enter')).toBe(1);
      expect(highlightMultiple.mistakeFrequencies.get('Backspace')).toBe(2);
      expect(highlightMultiple.mistakeFrequencies.get('ShiftLeft')).toBe(1);
      expect(highlightMultiple.mistakeFrequencies.get('KeyA')).toBe(3);
    });

    it('zero mistakes leaves keyboard completely normal with no mistake keys', () => {
      const dummyState: TypingState = {
        status: 'completed',
        passage: { id: 'p', title: 'T', text: 'Text', language: 'en', difficulty: 'easy' },
        duration: 60,
        startTime: 1000,
        endTime: 2000,
        currentIndex: 4,
        characters: [],
        extraCharacters: [],
        totalKeystrokes: 10,
        correctStrokes: 10,
        incorrectStrokes: 0,
      };

      const highlightFlawless = getKeyboardHighlightState({
        typingState: dummyState,
        language: 'en',
        mistakes: [],
      });

      expect(highlightFlawless.mistakeFrequencies.size).toBe(0);

      const html = renderToStaticMarkup(
        React.createElement(VirtualKeyboard, {
          typingState: dummyState,
          language: 'en',
          mistakes: [],
          initialVisible: true,
          defaultShowMistakes: true,
        })
      );

      // No key should have key-has-mistakes
      expect(html).not.toContain('key-has-mistakes');
      expect(html).not.toContain('key-mistake-badge');
    });

    it('renders error highlight when mistake keys are present in VirtualKeyboard markup', () => {
      const dummyState: TypingState = {
        status: 'completed',
        passage: { id: 'p', title: 'T', text: 'Text', language: 'en', difficulty: 'easy' },
        duration: 60,
        startTime: 1000,
        endTime: 2000,
        currentIndex: 4,
        characters: [],
        extraCharacters: [],
        totalKeystrokes: 10,
        correctStrokes: 10,
        incorrectStrokes: 0,
      };

      const html = renderToStaticMarkup(
        React.createElement(VirtualKeyboard, {
          typingState: dummyState,
          language: 'en',
          mistakes: [{ character: 'T', count: 2 }],
          initialVisible: true,
          defaultShowMistakes: true,
        })
      );

      expect(html).toContain('key-has-mistakes');
      expect(html).toContain('key-mistake-badge');
      expect(html).toContain('data-code="KeyT"');
    });
  });
});
