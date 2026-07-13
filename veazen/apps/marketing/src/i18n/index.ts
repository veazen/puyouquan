import { en } from './en';
import { zh } from './zh';
import type { Dict } from './types';

export type { Dict, Tier, TitledItem } from './types';

export type Locale = 'en' | 'zh';

const dicts: Record<Locale, Dict> = { en, zh };

/** Dictionary lookup for the given locale. */
export function getDict(locale: Locale): Dict {
  return dicts[locale];
}

/**
 * Logical (locale-less) paths that have a Simplified Chinese version.
 * Legal pages (/privacy, /terms) are intentionally English-only for now.
 */
export const ZH_BASE_PATHS: readonly string[] = ['/', '/features', '/pricing'];

/** Map a logical path to its /zh/ equivalent ('/' → '/zh/'). */
export function zhPath(basePath: string): string {
  return basePath === '/' ? '/zh/' : `/zh${basePath}`;
}

/** In-site href for a logical path rendered in the given locale. */
export function localizedPath(basePath: string, locale: Locale): string {
  return locale === 'zh' ? zhPath(basePath) : basePath;
}
