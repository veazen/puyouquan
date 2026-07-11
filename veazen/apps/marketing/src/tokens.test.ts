import { describe, expect, it } from 'vitest';

import { COLORS, FONTS, SLOGAN, tokensToCssVars } from './tokens';

describe('brand design tokens (§2.5)', () => {
  it('pins the exact palette established by the live temp site', () => {
    expect(COLORS.basalt).toBe('#16191d');
    expect(COLORS.basaltDeep).toBe('#101317');
    expect(COLORS.limestone).toBe('#e9e4d8');
    expect(COLORS.limestoneDim).toBe('#a9a498');
    expect(COLORS.jade).toBe('#3fa37c');
    expect(COLORS.jadeDeep).toBe('#2c7a5c');
    expect(COLORS.etch).toBe('rgba(233,228,216,.07)');
  });

  it('uses valid CSS color syntax for every token', () => {
    for (const value of Object.values(COLORS)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$|^rgba\(\d+,\d+,\d+,\.?[\d.]+\)$/);
    }
  });

  it('keeps the §2.5 font stacks and slogans', () => {
    expect(FONTS.display).toContain('Marcellus');
    expect(FONTS.body).toContain('Inter');
    expect(FONTS.mono).toContain('IBM Plex Mono');
    expect(SLOGAN.en).toBe('Trust, set in stone.');
    expect(SLOGAN.zh).toBe('信任，坚如磐石。');
  });

  it('renders every token as a CSS custom property', () => {
    const css = tokensToCssVars();
    expect(css).toContain('--color-jade: #3fa37c;');
    expect(css).toContain('--font-mono:');
    expect(css.split('\n')).toHaveLength(Object.keys(COLORS).length + Object.keys(FONTS).length);
  });
});
