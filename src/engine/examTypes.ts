import { TestDuration } from './types';

export type ExamTargetMetric = 'netWpm' | 'grossWpm';

export type ExamEvaluationType = 'speed_and_accuracy' | 'speed_only' | 'informational';

export type ExamEvaluationStatus = 'target_reached' | 'target_not_reached' | 'informational';

export interface ExamProfile {
  id: string;
  name: string;
  shortName: string;
  description: string;
  language: 'en';
  duration: TestDuration; // in seconds (e.g. 600 for 10 min, 900 for 15 min)
  targetMetric: ExamTargetMetric;
  targetValue: number; // e.g. 35 WPM
  minimumAccuracy?: number; // e.g. 95%
  evaluationType: ExamEvaluationType;
  instructions: string[];
  passageId: string;
  simulationDisclaimer: string;
  enabled: boolean;
}

export interface ExamEvaluation {
  profileId: string;
  profileName: string;
  shortName: string;
  targetWpm: number;
  actualNetWpm: number;
  actualGrossWpm: number;
  accuracy: number;
  minimumAccuracy?: number;
  status: ExamEvaluationStatus;
  isQualified: boolean;
  headline: string;
  message: string;
  disclaimer: string;
}
