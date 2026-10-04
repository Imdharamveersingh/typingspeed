/**
 * Core type definitions for the Typing Platform Engine
 */

export type CharacterState = 'untyped' | 'correct' | 'incorrect' | 'corrected';

export type TypingLanguage = 'en' | 'hi';

export interface CharacterItem {
  char: string;
  state: CharacterState;
  typedChar?: string;
  mistypedChar?: string;
  pendingComposition?: string;
  hadMistake?: boolean;
}

export interface ExtraCharacterItem {
  char: string;
}

export interface PerformanceSample {
  timestamp: number;
  elapsedSeconds: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  errors: number;
}

export type TestType = 'time' | 'words' | 'characters' | 'paragraph';

export type TestDuration = 15 | 30 | 60 | 180 | 300 | 600 | 900; // 15s, 30s, 1m, 3m, 5m, 10m, 15m in seconds

export type TestStatus = 'idle' | 'running' | 'completed';

export interface Passage {
  id: string;
  title: string;
  text: string;
  language: TypingLanguage;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface TypingMetrics {
  grossWPM: number;
  netWPM: number;
  accuracy: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  correctCharacters: number;
  incorrectCharacters: number;
  extraCharacters: number;
  totalKeystrokes: number;
  uncorrectedErrors: number;
  errors?: number;
}

export interface TypingState {
  passage: Passage;
  characters: CharacterItem[];
  extraCharacters: ExtraCharacterItem[];
  currentIndex: number;
  duration: TestDuration;
  testType?: TestType;
  targetCount?: number;
  status: TestStatus;
  startTime: number | null;
  endTime: number | null;
  totalKeystrokes: number;
  correctStrokes: number;
  incorrectStrokes: number;
  lastKeystrokeTime?: number | null;
  accumulatedActiveTimeMs?: number;
  performanceSnapshots?: PerformanceSample[];
}
