import { MistypedCharacter } from './analytics';
import { TypingLanguage } from './types';

export interface TypingHistoryEntry {
  id: string;
  timestamp: number;
  duration: number; // Duration in seconds (e.g. 60, 180, 300, 600)
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  totalKeystrokes: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  mostMistypedCharacters: MistypedCharacter[];
  testMode?: 'standard' | 'exam';
  examProfileId?: string;
  language?: TypingLanguage;
}

export interface HistoryEnvelope {
  version: 1;
  entries: TypingHistoryEntry[];
}

export interface ProgressSummary {
  totalTests: number;
  averageNetWpm: number;
  bestNetWpm: number;
  averageAccuracy: number;
  recentNetWpm: number;
  recentAccuracy: number;
}

export interface ProgressTrendPoint {
  index: number;
  timestamp: number;
  netWpm: number;
  accuracy: number;
  duration: number;
}

export interface AggregatedWeakCharacter {
  character: string;
  displayLabel: string;
  totalMistakes: number;
  testsCount: number;
}
