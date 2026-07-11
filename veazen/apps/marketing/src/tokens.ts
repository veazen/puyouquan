/**
 * Brand design tokens (PROJECT_PLAN §2.5) — the single typed source shared by
 * the marketing site and (from Phase 2) the verify page's default theme.
 * Established by the temp site already live on veazen.app; do not tweak
 * values here without updating that baseline deliberately.
 */

export const COLORS = {
  /** primary background */
  basalt: '#16191d',
  basaltDeep: '#101317',
  /** primary text */
  limestone: '#e9e4d8',
  /** secondary text */
  limestoneDim: '#a9a498',
  /** the single accent — reserved for "verified / authentic" semantics */
  jade: '#3fa37c',
  jadeDeep: '#2c7a5c',
  /** etched hairlines / borders */
  etch: 'rgba(233,228,216,.07)',
} as const;

export const FONTS = {
  /** display headings: uppercase + wide tracking (Roman inscription lineage) */
  display: "Marcellus, 'Times New Roman', serif",
  body: "Inter, system-ui, -apple-system, sans-serif",
  /** serials, code, label utility */
  mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace",
} as const;

export const SLOGAN = {
  en: 'Trust, set in stone.',
  zh: '信任，坚如磐石。',
} as const;

/** CSS custom-properties block rendered into global styles. */
export function tokensToCssVars(): string {
  return [
    `--color-basalt: ${COLORS.basalt};`,
    `--color-basalt-deep: ${COLORS.basaltDeep};`,
    `--color-limestone: ${COLORS.limestone};`,
    `--color-limestone-dim: ${COLORS.limestoneDim};`,
    `--color-jade: ${COLORS.jade};`,
    `--color-jade-deep: ${COLORS.jadeDeep};`,
    `--color-etch: ${COLORS.etch};`,
    `--font-display: ${FONTS.display};`,
    `--font-body: ${FONTS.body};`,
    `--font-mono: ${FONTS.mono};`,
  ].join('\n');
}
