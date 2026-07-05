import { describe, it, expect, vi, afterEach } from 'vitest';
import { cssColorToRgb, readColorToken } from './BlocklyEditor';

// Regression coverage for the v0.2 "unreliable drag / ghost blocks /
// workspace secretly containing far more blocks than visible" bug: Blockly's
// legacy colour parser throws on raw CSS var()/oklch() strings, and that
// thrown exception (not a touch-specific bug) corrupted its drag state.
// These tests lock in the contract that Blockly's theme is NEVER handed a
// var()/oklch() string, regardless of what the design tokens look like.

function mockCanvasContext(pixel: [number, number, number, number]) {
  return {
    fillStyle: '',
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: Uint8ClampedArray.from(pixel) })),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cssColorToRgb', () => {
  it('normalizes any CSS color (including oklch/var-resolved values) to a plain rgb() string', () => {
    const ctx = mockCanvasContext([56, 158, 67, 255]);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    const result = cssColorToRgb('oklch(0.62 0.16 145)');

    expect(result).toBe('rgb(56, 158, 67)');
    expect(result).not.toMatch(/oklch|var\(/);
  });

  it('returns null (triggering the caller\'s fallback) rather than propagating an unparseable value', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(cssColorToRgb('not-a-real-color')).toBeNull();
  });
});

describe('readColorToken', () => {
  it('never returns a raw CSS custom-property reference to hand to Blockly', () => {
    const ctx = mockCanvasContext([255, 255, 255, 255]);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => 'oklch(1 0 0)',
    } as unknown as CSSStyleDeclaration);

    const result = readColorToken('--surface', '#ffffff');

    expect(result).toBe('rgb(255, 255, 255)');
    expect(result).not.toMatch(/var\(|oklch/);
  });

  it('falls back to the provided fallback when the token is empty', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration);

    expect(readColorToken('--missing', '#abc123')).toBe('#abc123');
  });
});
