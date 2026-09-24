/**
 * Typing Metric Utility Functions
 * Standardized 5-keystrokes-per-word calculations.
 */

/**
 * Calculates Gross Words Per Minute (WPM).
 * Standard definition: (total keystrokes / 5) / (time in minutes)
 */
export function calculateGrossWPM(keystrokes: number, seconds: number): number {
  if (seconds <= 0 || keystrokes <= 0) return 0;
  const minutes = seconds / 60;
  return Math.round((keystrokes / 5) / minutes);
}

/**
 * Calculates Net Words Per Minute (WPM).
 * Standard definition: Gross WPM - (uncorrected errors / time in minutes)
 */
export function calculateNetWPM(
  keystrokes: number,
  uncorrectedErrors: number,
  seconds: number
): number {
  if (seconds <= 0 || keystrokes <= 0) return 0;
  const grossWPM = calculateGrossWPM(keystrokes, seconds);
  const minutes = seconds / 60;
  const errorPenalty = uncorrectedErrors / minutes;
  const net = Math.round(grossWPM - errorPenalty);
  return Math.max(0, net);
}

/**
 * Calculates Accuracy percentage (0 to 100).
 */
export function calculateAccuracy(
  correctCharacters: number,
  totalCharacters: number
): number {
  if (totalCharacters <= 0) return 100;
  if (correctCharacters <= 0) return 0;
  const accuracy = (correctCharacters / totalCharacters) * 100;
  return Math.min(100, Math.max(0, parseFloat(accuracy.toFixed(1))));
}

/**
 * Formats a duration in seconds into MM:SS format.
 */
export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
