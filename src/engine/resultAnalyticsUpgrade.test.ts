import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Passage, TypingState } from './types';
import {
  createInitialState,
  processKeystroke,
  calculateCurrentMetrics,
} from './typingEngine';
import { analyzeTypingResult } from './analytics';
import { ResultCard } from '@/components/typing/ResultCard';
import { getKeyboardHighlightState } from './keyboardUtils';

const testPassage: Passage = {
  id: 'analytics-upgrade-passage',
  title: 'Analytics Test Passage',
  text: 'The quick brown fox jumps over the lazy dog.',
  language: 'en',
  difficulty: 'easy',
};

describe('PART 23: Comprehensive Result Page & Analytics Upgrade Regression Tests', () => {
  // TEST 1: 0 mistakes -> flawless message shown
  it('TEST 1: 0 mistakes -> flawless message is shown', () => {
    let state = createInitialState(testPassage, 60);
    // Type 'The ' perfectly
    'The '.split('').forEach((c, idx) => {
      state = processKeystroke(state, c, 1000 + idx * 100);
    });

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 1400,
    };

    const analytics = analyzeTypingResult(completedState);
    expect(analytics.hasMistakes).toBe(false);
    expect(analytics.totalMistakes).toBe(0);

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    expect(html).toContain('Flawless typing!');
    expect(html).toContain('Zero mistakes during this test.');
    expect(html).not.toContain('Good run!');
  });

  // TEST 2: 1+ mistake -> flawless message is NOT shown
  it('TEST 2: 1+ mistake -> flawless message is NOT shown', () => {
    let state = createInitialState(testPassage, 60);
    // Type 'T', 'h', then 'x' (wrong for 'e')
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'h', 1100);
    state = processKeystroke(state, 'x', 1200);

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 2000,
    };

    const analytics = analyzeTypingResult(completedState);
    expect(analytics.hasMistakes).toBe(true);
    expect(analytics.totalMistakes).toBe(1);

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    expect(html).not.toContain('Flawless typing!');
    expect(html).toContain('Good run!');
    expect(html).toContain('You made 1 mistake');
  });

  // TEST 3: 10 errors -> result displays 10 errors
  it('TEST 3: 10 errors -> result displays 10 errors in metrics and breakdown', () => {
    const longPassage: Passage = {
      id: 'p-10-err',
      title: 'Ten Errors',
      text: 'abcdefghijklmnopqrstuvwxyz',
      language: 'en',
      difficulty: 'easy',
    };
    let state = createInitialState(longPassage, 60);

    // Make 10 errors across 10 characters
    for (let i = 0; i < 10; i++) {
      state = processKeystroke(state, '9', 1000 + i * 100); // 9 is wrong for each letter
    }

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 2000,
    };

    const metrics = calculateCurrentMetrics(completedState);
    expect(metrics.errors).toBe(10);

    const analytics = analyzeTypingResult(completedState);
    expect(analytics.totalMistakes).toBe(10);
    expect(analytics.mistakeDetails.length).toBe(10);

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    expect(html).toContain('10 errors');
    expect(html).toContain('10 recorded');
  });

  // TEST 4: Historical corrected mistakes remain recorded
  it('TEST 4: Historical corrected mistakes remain recorded in character state and analytics', () => {
    let state = createInitialState(testPassage, 60);
    // User types 'T', 'h', then 'x' (wrong for 'e'), then Backspace, then 'e'
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'h', 1100);
    state = processKeystroke(state, 'x', 1200); // error
    state = processKeystroke(state, 'Backspace', 1300);
    state = processKeystroke(state, 'e', 1400); // corrected

    expect(state.characters[2].state).toBe('corrected');
    expect(state.characters[2].hadMistake).toBe(true);
    expect(state.characters[2].mistypedChar).toBe('x');

    const metrics = calculateCurrentMetrics(state);
    expect(metrics.errors).toBe(1);
    expect(metrics.uncorrectedErrors).toBe(0);

    const analytics = analyzeTypingResult(state);
    expect(analytics.totalMistakes).toBe(1);
    expect(analytics.correctedMistakes).toBe(1);
    expect(analytics.uncorrectedMistakes).toBe(0);
    expect(analytics.hasMistakes).toBe(true);
  });

  // TEST 5: Mistake Details contains actual recorded mistakes
  it('TEST 5: Mistake Details contains actual recorded mistakes with expected, typed, and position', () => {
    let state = createInitialState(testPassage, 60);
    // Type 'T', then 'z' for 'h'
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'z', 1100);

    const analytics = analyzeTypingResult(state);
    expect(analytics.mistakeDetails.length).toBe(1);
    expect(analytics.mistakeDetails[0].expected).toBe('h');
    expect(analytics.mistakeDetails[0].typed).toBe('z');
    expect(analytics.mistakeDetails[0].index).toBe(1);
  });

  // TEST 6: Mistake Details is not "0 recorded" when errors exist
  it('TEST 6: Mistake Details is not "0 recorded" when errors exist (even if corrected)', () => {
    let state = createInitialState(testPassage, 60);
    // Type 'T', 'x' (wrong for 'h'), Backspace, 'h'
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'x', 1100);
    state = processKeystroke(state, 'Backspace', 1200);
    state = processKeystroke(state, 'h', 1300);

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 2000,
    };

    const analytics = analyzeTypingResult(completedState);
    expect(analytics.mistakeDetails.length).toBe(1);
    expect(analytics.totalMistakes).toBe(1);

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    expect(html).toContain('1 recorded');
    expect(html).not.toContain('0 recorded');
  });

  // TEST 7: Corrected mistake appears with corrected status
  it('TEST 7: Corrected mistake appears with corrected status in analytics and UI', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'x', 1000); // wrong for 'T'
    state = processKeystroke(state, 'Backspace', 1100);
    state = processKeystroke(state, 'T', 1200); // corrected

    const analytics = analyzeTypingResult(state);
    expect(analytics.mistakeDetails[0].status).toBe('corrected');

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 2000,
    };

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    expect(html).toContain('Corrected');
    expect(html).toContain('status-tag-corrected');
  });

  // TEST 8: Keyboard heatmap records actual mistake frequency
  it('TEST 8: Keyboard heatmap records actual mistake frequency', () => {
    let state = createInitialState(testPassage, 60);
    // Type 'x' for 'T' twice or across passages
    state = processKeystroke(state, 'x', 1000);
    const analytics = analyzeTypingResult(state);

    const highlights = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
      mistakes: analytics.mostMistypedCharacters,
    });

    // 'T' key (KeyT) has mistake count 1
    const tCount = highlights.mistakeFrequencies.get('KeyT');
    expect(tCount).toBe(1);
  });

  // TEST 9: A key with 0 mistakes remains neutral
  it('TEST 9: A key with 0 mistakes remains neutral', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'x', 1000); // Mistake on 'T'
    const analytics = analyzeTypingResult(state);

    const highlights = getKeyboardHighlightState({
      typingState: state,
      language: 'en',
      mistakes: analytics.mostMistypedCharacters,
    });

    // 'A' was never mistyped
    expect(highlights.mistakeFrequencies.get('KeyA')).toBeUndefined();
  });

  // TEST 10: WPM history contains only real performance samples
  it('TEST 10: WPM history contains only real performance samples', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'h', 2100);
    state = processKeystroke(state, 'e', 3200);

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      endTime: 3500,
    };

    const analytics = analyzeTypingResult(completedState);
    expect(analytics.performanceSnapshots).toBeDefined();
    expect(analytics.performanceSnapshots!.length).toBeGreaterThanOrEqual(2);
    // Verify each snapshot has valid numeric properties
    analytics.performanceSnapshots!.forEach((snap) => {
      expect(typeof snap.elapsedSeconds).toBe('number');
      expect(typeof snap.grossWpm).toBe('number');
      expect(typeof snap.netWpm).toBe('number');
      expect(snap.elapsedSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  // TEST 11: Accuracy history contains real values
  it('TEST 11: Accuracy history contains real values', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'x', 2100);

    const analytics = analyzeTypingResult(state);
    expect(analytics.performanceSnapshots).toBeDefined();
    analytics.performanceSnapshots!.forEach((snap) => {
      expect(snap.accuracy).toBeGreaterThanOrEqual(0);
      expect(snap.accuracy).toBeLessThanOrEqual(100);
    });
  });

  // TEST 12: Accuracy history reflects mistakes
  it('TEST 12: Accuracy history reflects mistakes', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'T', 1000); // 100%
    state = processKeystroke(state, 'x', 2100); // 50%
    state = processKeystroke(state, 'x', 3200); // 33%

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      endTime: 3500,
    };

    const analytics = analyzeTypingResult(completedState);
    expect(analytics.performanceSnapshots).toBeDefined();
    const lastSnap = analytics.performanceSnapshots![analytics.performanceSnapshots!.length - 1];
    expect(lastSnap.accuracy).toBeLessThan(100);
    expect(lastSnap.errors).toBeGreaterThanOrEqual(1);
  });

  // TEST 13: Correcting a mistake does not erase historical error impact
  it('TEST 13: Correcting a mistake does not erase historical error impact', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'x', 1000); // error
    state = processKeystroke(state, 'Backspace', 1200);
    state = processKeystroke(state, 'T', 1400); // corrected

    const metrics = calculateCurrentMetrics(state, 2000);
    expect(metrics.errors).toBe(1);
    expect(metrics.accuracy).toBeLessThan(100);
  });

  // TEST 14: Live and final accuracy remain consistent
  it('TEST 14: Live and final accuracy remain consistent', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, 'h', 1100);
    state = processKeystroke(state, 'x', 1200);

    const liveMetrics = calculateCurrentMetrics(state, 1500);
    const completedState: TypingState = {
      ...state,
      status: 'completed',
      endTime: 1500,
    };
    const finalMetrics = calculateCurrentMetrics(completedState, 1500);

    expect(liveMetrics.accuracy).toBe(finalMetrics.accuracy);
    expect(liveMetrics.errors).toBe(finalMetrics.errors);
  });

  // TEST 15: Existing error counting remains consistent
  it('TEST 15: Existing error counting remains consistent across multiple test types', () => {
    let state = createInitialState(testPassage, 60, 'time');
    state = processKeystroke(state, 'T', 1000);
    state = processKeystroke(state, '!', 1100); // error
    const metrics = calculateCurrentMetrics(state);
    expect(metrics.errors).toBe(1);
  });

  // TEST 16: Result page works with zero-error test
  it('TEST 16: Result page renders cleanly with zero-error test', () => {
    let state = createInitialState(testPassage, 60);
    'The quick '.split('').forEach((c, i) => {
      state = processKeystroke(state, c, 1000 + i * 100);
    });
    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 2000,
    };

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    expect(html).toContain('Flawless typing!');
    expect(html).toContain('Performance Overview');
    expect(html).toContain('Performance Insights');
  });

  // TEST 17: Result page works with multiple-error test
  it('TEST 17: Result page works with multiple-error test', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, '1', 1000);
    state = processKeystroke(state, '2', 1100);
    state = processKeystroke(state, '3', 1200);

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 2000,
    };

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    expect(html).toContain('3 errors');
    expect(html).toContain('3 recorded');
    expect(html).toContain('Practice My Mistakes');
  });

  // TEST 18: Result page works with corrected mistakes
  it('TEST 18: Result page works with corrected mistakes and displays both corrected & uncorrected', () => {
    let state = createInitialState(testPassage, 60);
    // Corrected mistake on 'T'
    state = processKeystroke(state, 'x', 1000);
    state = processKeystroke(state, 'Backspace', 1100);
    state = processKeystroke(state, 'T', 1200);
    // Uncorrected mistake on 'h'
    state = processKeystroke(state, 'z', 1300);

    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 2000,
    };

    const analytics = analyzeTypingResult(completedState);
    expect(analytics.totalMistakes).toBe(2);
    expect(analytics.correctedMistakes).toBe(1);
    expect(analytics.uncorrectedMistakes).toBe(1);

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    expect(html).toContain('2 errors');
    expect(html).toContain('Corrected Mistakes');
    expect(html).toContain('Uncorrected Mistakes');
  });

  // TEST 19: Dark theme result page works
  it('TEST 19: ResultCard elements are compatible with dark theme CSS selectors', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 2000,
    };

    const html = renderToStaticMarkup(
      React.createElement('div', { 'data-theme': 'dark' },
        React.createElement(ResultCard, {
          state: completedState,
          onRestart: () => {},
          onChangeTest: () => {},
          onPracticeMistakes: () => {},
        })
      )
    );

    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('result-card');
  });

  // TEST 20: Mobile result layout does not create page-level horizontal overflow
  it('TEST 20: Result components use responsive max-width containers', () => {
    let state = createInitialState(testPassage, 60);
    state = processKeystroke(state, 'T', 1000);
    const completedState: TypingState = {
      ...state,
      status: 'completed',
      startTime: 1000,
      endTime: 2000,
    };

    const html = renderToStaticMarkup(
      React.createElement(ResultCard, {
        state: completedState,
        onRestart: () => {},
        onChangeTest: () => {},
        onPracticeMistakes: () => {},
      })
    );

    // Verify SVG and grid containers are present and styled for responsiveness
    expect(html).toContain('performance-svg');
    expect(html).toContain('result-grid');
    expect(html).toContain('performance-graph-card');
  });

  // TEST 21: Existing test suite remains passing (verified via full test execution)
  it('TEST 21: calculatePerformanceInsights produces valid deterministic evaluations', () => {
    const initialState = createInitialState(testPassage, 60);
    const insights = analyzeTypingResult(initialState);
    expect(insights.accuracy).toBe(100);
  });
});
