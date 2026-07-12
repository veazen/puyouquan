'use client';

import { useRouter } from 'next/navigation';

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'ES' },
  { code: 'de', label: 'DE' },
  { code: 'ja', label: '日本語' },
];

/**
 * Manual language switch (§6): sets the locale cookie and re-renders.
 * The current locale arrives as a prop so next-intl stays server-only and
 * out of the client bundle (verify-page JS budget, §2.2).
 */
export function LanguageSwitcher({ label, current }: { label: string; current: string }) {
  const router = useRouter();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `VZ_LOCALE=${event.target.value};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  return (
    <select
      aria-label={label}
      value={current}
      onChange={onChange}
      className="rounded border border-etch bg-basalt-deep px-2 py-1.5 text-xs text-limestone-dim focus:border-jade focus:outline-none"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
