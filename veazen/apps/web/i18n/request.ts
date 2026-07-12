import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'de', 'ja'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const LOCALE_COOKIE = 'VZ_LOCALE';

function isSupported(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/** Minimal Accept-Language negotiation (§6: auto-detect + manual switch). */
export function negotiateLocale(acceptLanguage: string | null): SupportedLocale {
  if (!acceptLanguage) {
    return 'en';
  }
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tagRaw, ...params] = part.trim().split(';');
      const tag = (tagRaw ?? '').trim().toLowerCase();
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0] ?? '';
    if (isSupported(tag)) {
      return tag;
    }
    if (isSupported(base)) {
      return base;
    }
  }
  return 'en';
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale =
    fromCookie && isSupported(fromCookie)
      ? fromCookie
      : negotiateLocale(headerStore.get('accept-language'));
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
