'use client';

import { useState } from 'react';

import { api } from '../../../lib/dashboard/client';

interface CodeDetail {
  serial: string;
  status: string;
  flag_reason: string | null;
  first_verified_at: string | null;
  scratch_redeemed_at: string | null;
  has_scratch: boolean;
  scan_count: number;
  last_scan_at: string | null;
  release_count: number;
  replaced_by: string | null;
  product: { name: string; sku: string };
  scan_events: Array<{
    kind: string;
    result: string;
    geo: { country?: string } | null;
    createdAt: string;
  }>;
}

/** Status → label + accent (SME plan M3 check page). */
const STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'border-jade text-jade' },
  verified: { label: 'Verified (locked)', className: 'border-state-warn text-state-warn' },
  retired: { label: 'Retired (relabeled)', className: 'border-etch text-limestone-dim' },
  refurbished: { label: 'Refurbished', className: 'border-jade text-jade' },
  inactive: { label: 'Inactive', className: 'border-etch text-limestone-dim/60' },
  flagged: { label: 'Flagged', className: 'border-state-alert text-state-alert' },
  voided: { label: 'Voided', className: 'border-etch text-limestone-dim/60' },
};

type Action = 'release' | 'rma' | 'relabel';

const ACTION_COPY: Record<Action, { title: string; body: string; confirm: string }> = {
  release: {
    title: 'Release for resale?',
    body: 'The first-scan lock is cleared and the next customer scan shows green again. The release is audited and counted — repeated releases of the same code raise an alert.',
    confirm: 'Release',
  },
  rma: {
    title: 'Register RMA (refurbished)?',
    body: 'The scratch coating is already revealed, so this code becomes "officially refurbished": the verify page shows a brand endorsement with the full verification history instead of a warning.',
    confirm: 'Register RMA',
  },
  relabel: {
    title: 'Relabel with a new code?',
    body: 'The old code is retired (verify page shows "recalled by the brand") and stays linked to its successor for traceability. The new code must be an active, unredeemed code of this brand.',
    confirm: 'Relabel',
  },
};

const input =
  'rounded border border-etch bg-basalt px-3 py-2 text-sm placeholder:text-limestone-dim/50 focus:border-jade focus:outline-none';
const btn = 'rounded border border-etch px-3 py-1.5 text-xs hover:border-jade hover:text-jade';

function fmt(iso: string | null): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '—';
}

/**
 * Returns desk (SME suite M3): warehouse staff scan or paste a serial,
 * see the code's full state and — depending on scratch presence and lock —
 * release it for resale, register an RMA or relabel it. The lookup itself
 * is side-effect free (no scan events, no risk).
 */
export default function ReturnsPage() {
  const [detail, setDetail] = useState<CodeDetail | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'ok' | 'error'>('ok');
  const [pending, setPending] = useState<Action | null>(null);
  const [newSerial, setNewSerial] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh(serial: string): Promise<void> {
    setDetail(await api<CodeDetail>(`/codes/${encodeURIComponent(serial)}`));
  }

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = String(new FormData(event.currentTarget).get('serial') ?? '').trim();
    if (!raw) {
      return;
    }
    setDetail(null);
    setLookupError('');
    setMessage('');
    setPending(null);
    setNewSerial('');
    try {
      await refresh(raw);
    } catch (e) {
      setLookupError((e as Error).message);
    }
  }

  async function runAction(action: Action) {
    if (!detail) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const path = `/codes/${encodeURIComponent(detail.serial)}/${action}`;
      if (action === 'relabel') {
        const res = await api<{ replaced_by: string }>(path, {
          method: 'POST',
          body: { new_serial: newSerial.trim() },
        });
        setMessage(`Relabeled — old code retired, replaced by ${res.replaced_by}.`);
      } else if (action === 'release') {
        const res = await api<{ release_count: number; status: string }>(path, {
          method: 'POST',
          body: {},
        });
        setMessage(
          `Released for resale (release #${res.release_count}, now ${res.status}) — the next scan is a fresh first scan.`,
        );
      } else {
        const res = await api<{ status: string }>(path, { method: 'POST', body: {} });
        setMessage(`RMA registered — code is now ${res.status}.`);
      }
      setMessageKind('ok');
      setPending(null);
      setNewSerial('');
      await refresh(detail.serial);
    } catch (e) {
      setMessage(`${ACTION_COPY[action].confirm} failed: ${(e as Error).message}`);
      setMessageKind('error');
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  const meta = detail
    ? (STATUS_META[detail.status] ?? { label: detail.status, className: 'border-etch text-limestone' })
    : null;

  // mirror the API's own eligibility rules (codes.controller): release is
  // scratchless + first-scan locked; RMA→refurbished is a redeemed scratch;
  // relabel starts from a live (active/verified) code
  const locked =
    detail !== null &&
    (detail.status === 'verified' || (detail.status === 'active' && detail.first_verified_at !== null));
  const canRelease = detail !== null && !detail.has_scratch && locked;
  const canRma =
    detail !== null &&
    detail.status === 'verified' &&
    detail.has_scratch &&
    detail.scratch_redeemed_at !== null;
  const canRelabel = detail !== null && (detail.status === 'active' || detail.status === 'verified');
  const readOnly = detail !== null && !canRelease && !canRma && !canRelabel;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-xl">Returns</h1>
      <p className="text-xs text-limestone-dim">
        Warehouse check desk — look up a returned item&apos;s code without touching its state, then
        release, register an RMA or relabel it. Pasted serials may keep their hyphens.
      </p>

      <form onSubmit={lookup} className="flex gap-2 rounded-lg border border-etch bg-basalt-deep p-4">
        <input
          name="serial"
          placeholder="Serial (any format — auto-normalized)"
          autoComplete="off"
          spellCheck={false}
          data-testid="returns-serial-input"
          className={`flex-1 font-mono ${input}`}
        />
        <button className="rounded border border-etch px-4 text-sm hover:border-jade hover:text-jade">
          Check
        </button>
      </form>
      {lookupError && (
        <p data-testid="returns-lookup-error" className="text-xs text-state-alert">
          Lookup failed: {lookupError}
        </p>
      )}
      {message && (
        <p
          data-testid="returns-action-message"
          className={`text-xs ${messageKind === 'ok' ? 'text-jade' : 'text-state-alert'}`}
        >
          {message}
        </p>
      )}

      {detail && meta && (
        <section
          data-testid="returns-card"
          data-status={detail.status}
          className="rounded-lg border border-etch bg-basalt-deep p-4"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              data-testid="returns-status"
              className={`rounded-full border px-2.5 py-0.5 text-xs ${meta.className}`}
            >
              {meta.label}
            </span>
            {detail.status === 'refurbished' && (
              <span className="rounded-full border border-jade/40 bg-jade/10 px-2.5 py-0.5 text-[11px] uppercase tracking-widest text-jade">
                brand endorsed
              </span>
            )}
            {detail.flag_reason && (
              <span className="text-xs text-state-alert">({detail.flag_reason})</span>
            )}
            <span className="ml-auto text-xs text-limestone-dim">
              {detail.product.name} · {detail.product.sku}
            </span>
          </div>
          <p className="mt-2 break-all font-mono text-sm tracking-wider">{detail.serial}</p>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-limestone-dim">Scans</dt>
              <dd className="font-mono">{detail.scan_count}</dd>
            </div>
            <div>
              <dt className="text-limestone-dim">Last scan</dt>
              <dd className="font-mono">{fmt(detail.last_scan_at)}</dd>
            </div>
            <div>
              <dt className="text-limestone-dim">Releases</dt>
              <dd className="font-mono" data-testid="returns-release-count">
                {detail.release_count}
              </dd>
            </div>
            <div>
              <dt className="text-limestone-dim">First verified</dt>
              <dd className="font-mono">{fmt(detail.first_verified_at)}</dd>
            </div>
            <div>
              <dt className="text-limestone-dim">Scratch layer</dt>
              <dd>
                {detail.has_scratch
                  ? detail.scratch_redeemed_at
                    ? `revealed ${fmt(detail.scratch_redeemed_at)}`
                    : 'intact'
                  : 'none (scan-only)'}
              </dd>
            </div>
            {detail.replaced_by && (
              <div>
                <dt className="text-limestone-dim">Replaced by</dt>
                <dd className="break-all font-mono">{detail.replaced_by}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-etch pt-3">
            {canRelease && (
              <button
                data-testid="returns-release"
                disabled={busy}
                onClick={() => setPending('release')}
                className="rounded bg-jade px-3 py-1.5 text-xs font-semibold text-basalt hover:bg-jade-deep disabled:opacity-50"
              >
                Release for resale
              </button>
            )}
            {canRma && (
              <button
                data-testid="returns-rma"
                disabled={busy}
                onClick={() => setPending('rma')}
                className={`${btn} disabled:opacity-50`}
              >
                Register RMA (refurbished)
              </button>
            )}
            {canRelabel && (
              <button
                data-testid="returns-relabel-toggle"
                disabled={busy}
                onClick={() => {
                  setPending(pending === 'relabel' ? null : 'relabel');
                  setNewSerial('');
                }}
                className={`${btn} disabled:opacity-50`}
              >
                Relabel…
              </button>
            )}
            {readOnly && (
              <p className="text-xs text-limestone-dim" data-testid="returns-read-only">
                Read-only: no returns action applies to a {detail.status} code.
              </p>
            )}
          </div>

          {pending === 'relabel' && (
            <div className="mt-3 flex gap-2">
              <input
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
                placeholder="New serial (active, unredeemed)"
                autoComplete="off"
                spellCheck={false}
                data-testid="returns-relabel-input"
                className={`flex-1 font-mono ${input}`}
              />
              <button
                disabled={busy || newSerial.trim().length < 4}
                onClick={() => void runAction('relabel')}
                className={`${btn} disabled:opacity-50`}
              >
                Bind new code
              </button>
            </div>
          )}

          <ul className="mt-3 max-h-40 overflow-y-auto text-xs text-limestone-dim">
            {detail.scan_events.map((e, i) => (
              <li key={i} className="border-t border-etch py-1.5">
                {fmt(e.createdAt)} · {e.kind} · {e.result}
                {e.geo?.country ? ` · ${e.geo.country}` : ''}
              </li>
            ))}
            {detail.scan_events.length === 0 && (
              <li className="border-t border-etch py-1.5">No scans recorded yet.</li>
            )}
          </ul>
        </section>
      )}

      {pending && pending !== 'relabel' && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-basalt/80 p-6">
          <div
            data-testid="returns-confirm"
            className="w-full max-w-md rounded-lg border border-etch bg-basalt-deep p-5"
          >
            <h2 className="font-display text-lg">{ACTION_COPY[pending].title}</h2>
            <p className="mt-1 break-all font-mono text-xs text-limestone-dim">{detail.serial}</p>
            <p className="mt-2 text-sm leading-relaxed text-limestone-dim">
              {ACTION_COPY[pending].body}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button disabled={busy} onClick={() => setPending(null)} className={btn}>
                Cancel
              </button>
              <button
                data-testid="returns-confirm-go"
                disabled={busy}
                onClick={() => void runAction(pending)}
                className="rounded bg-jade px-3 py-1.5 text-xs font-semibold text-basalt hover:bg-jade-deep disabled:opacity-50"
              >
                {busy ? 'Working…' : ACTION_COPY[pending].confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
