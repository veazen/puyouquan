import { getLocale, getTranslations } from 'next-intl/server';

import { formatForDisplay, isCanonicalCrockford, normalizeInput } from '@veazen/crypto/format';
import type { VerifyResponse } from '@veazen/shared';

import { LanguageSwitcher } from './LanguageSwitcher';
import { ScratchForm } from './ScratchForm';

type State = 'authentic' | 'already_verified' | 'inactive' | 'flagged' | 'invalid';

const STATE_STYLES: Record<State, { border: string; text: string; dot: string }> = {
  authentic: { border: 'border-jade', text: 'text-jade', dot: 'bg-jade' },
  already_verified: {
    border: 'border-state-warn',
    text: 'text-state-warn',
    dot: 'bg-state-warn',
  },
  inactive: { border: 'border-state-warn', text: 'text-state-warn', dot: 'bg-state-warn' },
  flagged: { border: 'border-state-alert', text: 'text-state-alert', dot: 'bg-state-alert' },
  invalid: { border: 'border-state-alert', text: 'text-state-alert', dot: 'bg-state-alert' },
};

interface VerifyViewProps {
  serialRaw: string;
  data: VerifyResponse | null;
}

/**
 * Consumer verify page (§6): mobile-first, tenant-branded, three-state
 * visual (green = authentic first scan / yellow = seen before / red =
 * invalid). Server component — the only client JS is the scratch form and
 * the language switcher (first-load budget < 100KB).
 */
export async function VerifyView({ serialRaw, data }: VerifyViewProps) {
  const t = await getTranslations('verify');
  const locale = await getLocale();
  const normalized = normalizeInput(decodeURIComponent(serialRaw));
  const displaySerial = isCanonicalCrockford(normalized) && normalized.length > 0
    ? formatForDisplay(normalized)
    : normalized || '—';

  const result: State = data?.result ?? 'invalid';
  const style = STATE_STYLES[result];
  const config = (data?.verify_page_config ?? {}) as {
    mode?: string;
    brandColor?: string;
    logoUrl?: string;
    story?: { title?: string; body?: string };
  };
  const isLite = config.mode === 'lite';
  const brand = data?.product?.brand as { name?: string } | undefined;

  const firstVerifiedDate = data?.first_verified_at
    ? new Date(data.first_verified_at).toISOString().slice(0, 10)
    : null;

  let stateTitle: string;
  let stateBody: string;
  switch (result) {
    case 'authentic':
      stateTitle = t('states.authentic.title');
      stateBody =
        data?.scan_count_hint === 'scanned_before'
          ? t('states.authentic.scannedBefore')
          : t('states.authentic.firstScan');
      break;
    case 'already_verified':
      stateTitle = t('states.already_verified.title');
      stateBody = t('states.already_verified.body', { date: firstVerifiedDate ?? '—' });
      break;
    case 'inactive':
      stateTitle = t('states.inactive.title');
      stateBody = t('states.inactive.body');
      break;
    case 'flagged':
      stateTitle = t('states.flagged.title');
      stateBody =
        data?.flag_reason === 'stolen' ? t('states.flagged.stolen') : t('states.flagged.body');
      break;
    default:
      stateTitle = t('states.invalid.title');
      stateBody = t('states.invalid.body');
  }

  // §7.5: Lite codes have no scratch layer; scratch entry only for standard
  const showScratch = !isLite && result === 'authentic';
  const showTrace = !isLite && (data?.trace.length ?? 0) > 0;

  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-5 py-8"
      style={config.brandColor ? ({ '--brand': config.brandColor } as React.CSSProperties) : undefined}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.3em] text-limestone-dim">
            {brand?.name ?? 'Veazen'}
          </p>
          <p className="text-[11px] uppercase tracking-widest text-limestone-dim/70">
            {t('kicker')}
          </p>
        </div>
        <LanguageSwitcher label={t('language')} current={locale} />
      </header>

      <section
        data-testid="verify-state"
        data-result={result}
        className={`rounded-lg border ${style.border} bg-basalt-deep p-5`}
      >
        <div className="flex items-center gap-2.5">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          <h1 className={`font-display text-2xl ${style.text}`}>{stateTitle}</h1>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-limestone-dim">{stateBody}</p>
        <div className="mt-4 border-t border-etch pt-3">
          <p className="text-[11px] uppercase tracking-widest text-limestone-dim/70">
            {t('serialLabel')}
          </p>
          <p className="mt-1 break-all font-mono text-lg tracking-[0.12em]">{displaySerial}</p>
        </div>
      </section>

      {data?.product && (
        <section className="rounded-lg border border-etch bg-basalt-deep p-5">
          <h2 className="font-display text-lg">{data.product.name}</h2>
          {Array.isArray(data.product.images) && data.product.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(data.product.images[0])}
              alt={data.product.name}
              className="mt-3 max-h-56 w-full rounded object-cover"
            />
          )}
        </section>
      )}

      {showScratch && (
        <ScratchForm
          serial={normalized}
          labels={{
            title: t('scratch.title'),
            hint: t('scratch.hint'),
            placeholder: t('scratch.placeholder'),
            submit: t('scratch.submit'),
            verified: t('scratch.verified'),
            already: t('scratch.already', { date: '{date}' }),
            invalid: t('scratch.invalid'),
            locked: t('scratch.locked'),
          }}
        />
      )}

      {isLite && config.story?.body && (
        <section className="rounded-lg border border-etch bg-basalt-deep p-5">
          <h2 className="font-display text-lg">{config.story.title ?? t('story.title')}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-limestone-dim">
            {config.story.body}
          </p>
        </section>
      )}

      {showTrace && (
        <section className="rounded-lg border border-etch bg-basalt-deep p-5">
          <h2 className="font-display text-lg">{t('trace.title')}</h2>
          <ol className="mt-3 space-y-3 border-l border-etch pl-4">
            {data?.trace.map((step, i) => (
              <li key={i} className="relative text-sm">
                <span
                  aria-hidden
                  className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-jade-deep"
                />
                <p className="font-medium capitalize">{step.step.replace(/_/g, ' ')}</p>
                <p className="text-xs text-limestone-dim">
                  {[step.location, step.date.slice(0, 10)].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className="mt-auto pt-4 text-center text-[11px] tracking-widest text-limestone-dim/60">
        {t('poweredBy')}
      </footer>
    </main>
  );
}
