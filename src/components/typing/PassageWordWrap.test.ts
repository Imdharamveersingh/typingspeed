import { describe, it, expect } from 'vitest';
import { CharacterItem } from '@/engine/types';
import { segmentGraphemes } from '@/engine/textUtils';
import { calculateRollingOffset } from './PassageDisplay';

// Helper function implementing the same grouping algorithm as PassageDisplay
function groupCharactersIntoTokens(characters: CharacterItem[]) {
  const result: Array<{ type: 'word'; chars: Array<{ item: CharacterItem; index: number }> } | { type: 'space'; char: { item: CharacterItem; index: number } }> = [];
  let currentWordChars: Array<{ item: CharacterItem; index: number }> = [];

  for (let i = 0; i < characters.length; i++) {
    const item = characters[i];
    if (item.char === ' ' || item.char === '\n') {
      if (currentWordChars.length > 0) {
        result.push({
          type: 'word',
          chars: currentWordChars,
        });
        currentWordChars = [];
      }
      result.push({
        type: 'space',
        char: { item, index: i },
      });
    } else {
      currentWordChars.push({ item, index: i });
    }
  }

  if (currentWordChars.length > 0) {
    result.push({
      type: 'word',
      chars: currentWordChars,
    });
  }

  return result;
}

describe('Passage Word-Wrapping Architecture', () => {
  it('groups English passage into non-breaking word units and whitespace boundaries', () => {
    const text = 'agricultural hubs with major port terminals.';
    const characters: CharacterItem[] = text.split('').map((char) => ({
      char,
      state: 'untyped',
    }));

    const tokens = groupCharactersIntoTokens(characters);

    // Should have 6 words and 5 spaces
    const words = tokens.filter((t) => t.type === 'word');
    const spaces = tokens.filter((t) => t.type === 'space');

    expect(words.length).toBe(6);
    expect(spaces.length).toBe(5);

    // Verify word contents
    expect(words[0].chars.map((c) => c.item.char).join('')).toBe('agricultural');
    expect(words[1].chars.map((c) => c.item.char).join('')).toBe('hubs');
    expect(words[2].chars.map((c) => c.item.char).join('')).toBe('with');
    expect(words[3].chars.map((c) => c.item.char).join('')).toBe('major');
    expect(words[4].chars.map((c) => c.item.char).join('')).toBe('port');
    expect(words[5].chars.map((c) => c.item.char).join('')).toBe('terminals.');

    // Verify every character's original index is preserved
    let totalCharCount = 0;
    tokens.forEach((t) => {
      if (t.type === 'word') {
        t.chars.forEach((c) => {
          expect(c.index).toBe(totalCharCount);
          totalCharCount++;
        });
      } else {
        expect(t.char.index).toBe(totalCharCount);
        totalCharCount++;
      }
    });
    expect(totalCharCount).toBe(characters.length);
  });

  it('preserves Hindi Devanagari graphemes inside word units without breaking', () => {
    const hindiText = 'डिजिटल तकनीक और आधुनिक भारत';
    const graphemes = segmentGraphemes(hindiText, 'hi');
    const characters: CharacterItem[] = graphemes.map((char) => ({
      char,
      state: 'untyped',
    }));

    const tokens = groupCharactersIntoTokens(characters);

    const words = tokens.filter((t) => t.type === 'word');
    const spaces = tokens.filter((t) => t.type === 'space');

    expect(words.length).toBe(5);
    expect(spaces.length).toBe(4);

    expect(words[0].chars.map((c) => c.item.char).join('')).toBe('डिजिटल');
    expect(words[1].chars.map((c) => c.item.char).join('')).toBe('तकनीक');
    expect(words[2].chars.map((c) => c.item.char).join('')).toBe('और');
    expect(words[3].chars.map((c) => c.item.char).join('')).toBe('आधुनिक');
    expect(words[4].chars.map((c) => c.item.char).join('')).toBe('भारत');
  });

  it('keeps punctuation attached to the word unit so it never breaks separately', () => {
    const text = 'Quick, fast, and reliable.';
    const characters: CharacterItem[] = text.split('').map((char) => ({
      char,
      state: 'untyped',
    }));

    const tokens = groupCharactersIntoTokens(characters);
    const words = tokens.filter((t) => t.type === 'word');

    expect(words[0].chars.map((c) => c.item.char).join('')).toBe('Quick,');
    expect(words[1].chars.map((c) => c.item.char).join('')).toBe('fast,');
    expect(words[2].chars.map((c) => c.item.char).join('')).toBe('and');
    expect(words[3].chars.map((c) => c.item.char).join('')).toBe('reliable.');
  });
});

describe('5-Line Rolling Passage Window Offset Calculation', () => {
  const LINE_HEIGHT_EN = 38;
  const LINE_HEIGHT_HI = 46;

  it('keeps offset at 0 for visual line 1 (caret on line 1)', () => {
    // Caret at very start
    expect(calculateRollingOffset(0, LINE_HEIGHT_EN)).toEqual({
      lineIndex: 0,
      targetOffset: 0,
    });

    // Caret somewhere midway through line 1
    expect(calculateRollingOffset(15, LINE_HEIGHT_EN)).toEqual({
      lineIndex: 0,
      targetOffset: 0,
    });
  });

  it('keeps offset at 0 for visual line 2 so line 1 remains visible while typing line 2', () => {
    // Caret is on visual line 2 (offset ~38px): Line 1 must remain visible above it
    const result = calculateRollingOffset(LINE_HEIGHT_EN, LINE_HEIGHT_EN);
    expect(result.lineIndex).toBe(1);
    expect(result.targetOffset).toBe(0); // Line 1 remains visible, no premature roll!

    // Typing horizontally across line 2
    expect(calculateRollingOffset(LINE_HEIGHT_EN + 10, LINE_HEIGHT_EN)).toEqual({
      lineIndex: 1,
      targetOffset: 0,
    });
  });

  it('shifts passage upward by 1 line height only when typing enters line 3', () => {
    // Caret on visual line 3 (offset ~76px): Line 1 rolls out, Line 2 is top, Line 3 is active
    const result = calculateRollingOffset(LINE_HEIGHT_EN * 2, LINE_HEIGHT_EN);
    expect(result.lineIndex).toBe(2);
    expect(result.targetOffset).toBe(38); // Exactly 1 line-height shift!
  });

  it('shifts passage upward by 2 lines when moving onto visual line 4', () => {
    // Caret on visual line 4 (offset ~114px): Line 2 rolls out, Line 3 is top, Line 4 is active
    const result = calculateRollingOffset(LINE_HEIGHT_EN * 3, LINE_HEIGHT_EN);
    expect(result.lineIndex).toBe(3);
    expect(result.targetOffset).toBe(76); // Exactly 2 line-heights shift!
  });

  it('shifts continuously line by line as typing progresses through 10 lines', () => {
    for (let line = 0; line < 10; line++) {
      const caretTop = line * LINE_HEIGHT_EN + 2; // small subpixel offset within line
      const result = calculateRollingOffset(caretTop, LINE_HEIGHT_EN);
      expect(result.lineIndex).toBe(line);
      const expectedOffset = Math.max(0, line - 1) * LINE_HEIGHT_EN;
      expect(result.targetOffset).toBe(expectedOffset);
    }
  });

  it('correctly calculates rolling offset for Hindi with larger line-height (46px)', () => {
    // Caret on line 1
    expect(calculateRollingOffset(20, LINE_HEIGHT_HI)).toEqual({
      lineIndex: 0,
      targetOffset: 0,
    });

    // Caret on line 2: offset remains 0
    expect(calculateRollingOffset(46, LINE_HEIGHT_HI)).toEqual({
      lineIndex: 1,
      targetOffset: 0,
    });

    // Caret moves to line 3: shifts by 46px
    expect(calculateRollingOffset(92, LINE_HEIGHT_HI)).toEqual({
      lineIndex: 2,
      targetOffset: 46,
    });

    // Caret moves to line 4: shifts by 92px
    expect(calculateRollingOffset(138, LINE_HEIGHT_HI)).toEqual({
      lineIndex: 3,
      targetOffset: 92,
    });
  });

  it('gracefully handles boundary and invalid inputs', () => {
    expect(calculateRollingOffset(-10, LINE_HEIGHT_EN)).toEqual({
      lineIndex: 0,
      targetOffset: 0,
    });
    expect(calculateRollingOffset(50, 0)).toEqual({
      lineIndex: 0,
      targetOffset: 0,
    });
    expect(calculateRollingOffset(0, -38)).toEqual({
      lineIndex: 0,
      targetOffset: 0,
    });
  });
});

