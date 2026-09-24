/**
 * Core type definitions for the Typing Platform Engine
 */

export type CharacterState = 'untyped' | 'correct' | 'incorrect';

export type TypingLanguage = 'en' | 'hi';

export interface CharacterItem {
  char: string;
  state: CharacterState;
  typedChar?: string;
  pendingComposition?: string;
}

export interface ExtraCharacterItem {
  char: string;
}

export type TestDuration = 60 | 180 | 300 | 600 | 900; // 1, 3, 5, 10, 15 minutes in seconds

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
}

export interface TypingState {
  passage: Passage;
  characters: CharacterItem[];
  extraCharacters: ExtraCharacterItem[];
  currentIndex: number;
  duration: TestDuration;
  status: TestStatus;
  startTime: number | null;
  endTime: number | null;
  totalKeystrokes: number;
  correctStrokes: number;
  incorrectStrokes: number;
}
