import { describe, it, expect } from 'vitest';
import { CharacterItem } from '@/engine/types';
import { segmentGraphemes } from '@/engine/textUtils';

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
