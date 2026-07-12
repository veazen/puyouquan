'use client';

import { useState } from 'react';

import { apiBase } from '../../lib/api';

interface ScratchLabels {
  title: string;
  hint: string;
  placeholder: string;
  submit: string;
  verified: string;
  already: string;
  invalid: string;
  locked: string;
}

/** One-time hidden-code redemption (§5.1 POST /verify/:serial/scratch). */
export function ScratchForm({ serial, labels }: { serial: string; labels: ScratchLabels }) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'verified' | 'already' | 'invalid' | 'locked'>(
    'idle',
  );
  const [firstDate, setFirstDate] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.trim() || state === 'busy') {
      return;
    }
    setState('busy');
    try {
      const res = await fetch(`${apiBase()}/verify/${encodeURIComponent(serial)}/scratch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scratch_code: value.trim() }),
      });
      if (res.status === 429) {
        setState('locked');
        return;
      }
      const body = (await res.json()) as { result?: string; first_verified_at?: string | null };
      if (body.result === 'verified') {
        setState('verified');
      } else if (body.result === 'already_verified') {
        setFirstDate(body.first_verified_at ? body.first_verified_at.slice(0, 10) : null);
        setState('already');
      } else {
        setState('invalid');
      }
    } catch {
      setState('invalid');
    }
  }

  if (state === 'verified') {
    return (
      <section
        data-testid="scratch-result"
        className="rounded-lg border border-jade bg-basalt-deep p-5 text-sm text-jade"
      >
        {labels.verified}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-etch bg-basalt-deep p-5">
      <h2 className="font-display text-lg">{labels.title}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-limestone-dim">{labels.hint}</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={labels.placeholder}
          autoComplete="off"
          spellCheck={false}
          className="rounded border border-etch bg-basalt px-3 py-2.5 font-mono text-sm uppercase tracking-[0.15em] text-limestone placeholder:normal-case placeholder:tracking-normal placeholder:text-limestone-dim/50 focus:border-jade focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'busy'}
          className="rounded bg-jade px-4 py-2.5 text-sm font-semibold text-basalt transition-colors hover:bg-jade-deep disabled:opacity-60"
        >
          {labels.submit}
        </button>
      </form>
      {state === 'already' && (
        <p data-testid="scratch-result" className="mt-2.5 text-xs text-state-warn">
          {labels.already.replace('{date}', firstDate ?? '—')}
        </p>
      )}
      {state === 'invalid' && (
        <p data-testid="scratch-result" className="mt-2.5 text-xs text-state-alert">
          {labels.invalid}
        </p>
      )}
      {state === 'locked' && (
        <p data-testid="scratch-result" className="mt-2.5 text-xs text-state-alert">
          {labels.locked}
        </p>
      )}
    </section>
  );
}
