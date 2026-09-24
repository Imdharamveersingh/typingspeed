/**
 * Unicode and Text Processing Utilities
 * Standards-compliant grapheme segmentation, NFC normalization,
 * and Devanagari character handling for the Typing Platform.
 */

/**
 * Segments a string into user-perceived grapheme clusters.
 * Prefers native Intl.Segmenter with granularity: "grapheme".
 * Falls back to Array.from (surrogate-pair aware) if Intl.Segmenter is unavailable.
 */
export function segmentGraphemes(text: string, locale = 'en'): string[] {
  if (!text) return [];

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text), (s) => s.segment);
    } catch {
      // Fallback if locale is unsupported
      const fallbackSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(fallbackSegmenter.segment(text), (s) => s.segment);
    }
  }

  return Array.from(text);
}

/**
 * Normalizes text to Unicode NFC (Canonical Decomposition, followed by Canonical Composition).
 * Ensures equivalent representations (e.g. nukhtas, precomposed vs decomposed characters)
 * compare identically.
 */
export function normalizeNFC(text: string): string {
  if (!text) return '';
  return text.normalize('NFC');
}

/**
 * Compares two grapheme strings under NFC normalization.
 */
export function compareGraphemes(expected: string, typed: string): boolean {
  return normalizeNFC(expected) === normalizeNFC(typed);
}

/**
 * Checks if a partial string is a valid prefix of the target grapheme cluster.
 * Useful for multi-keystroke inputs (e.g. typing a base consonant before a matra on InScript keyboards).
 */
export function isGraphemePrefix(partial: string, target: string): boolean {
  if (!partial || !target) return false;
  const normPartial = normalizeNFC(partial);
  const normTarget = normalizeNFC(target);
  return normTarget.startsWith(normPartial) && normTarget !== normPartial;
}

/**
 * Set of known non-printable / control key identifiers from KeyboardEvent.key.
 */
const CONTROL_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'Tab',
  'Escape',
  'Enter',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Insert',
  'Delete',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'NumLock',
  'ScrollLock',
  'Pause',
  'ContextMenu',
  'Process',
  'Unidentified',
  'Dead',
]);

/**
 * Determines whether a keyboard event key represents a non-printable control/modifier key.
 */
export function isControlKey(key: string): boolean {
  if (!key) return true;
  return CONTROL_KEYS.has(key);
}

/**
 * Strips leading and trailing punctuation and symbols across any language
 * using Unicode property escapes (\p{P}\p{S}).
 * Keeps letters, numbers, and Devanagari characters intact.
 */
export function cleanWordToken(token: string): string {
  if (!token) return '';
  return token.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').trim();
}
