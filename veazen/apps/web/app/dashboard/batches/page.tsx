'use client';

import { useEffect, useState } from 'react';

import { api } from '../../../lib/dashboard/client';
import { apiBase } from '../../../lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Batch {
  id: string;
  quantity: number;
  status: string;
  kind: string;
  autoActivate: boolean;
  activatedCount: number;
  intendedMarket: string[];
  createdAt: string;
  product: { name: string; sku: string };
}

interface CodeDetail {
  serial: string;
  status: string;
  flag_reason: string | null;
  first_verified_at: string | null;
  product: { name: string; sku: string };
  scan_events: Array<{ kind: string; result: string; createdAt: string; geo: { country?: string } | null }>;
}

/** Batches (§6.3): create, progress, export, activate + single-code lookup. */
export default function BatchesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState<CodeDetail | null>(null);
  const [lookupError, setLookupError] = useState('');

  const load = () =>
    Promise.all([api<Product[]>('/products'), api<Batch[]>('/batches')])
      .then(([p, b]) => {
        setProducts(p);
        setBatches(b);
      })
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, []);

  async function createBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setError('');
    try {
      await api('/batches', {
        method: 'POST',
        body: {
          product_id: data.product_id,
          quantity: Number(data.quantity),
          ...(data.market
            ? { intended_market: String(data.market).split(',').map((c) => c.trim().toUpperCase()).filter(Boolean) }
            : {}),
          ...(data.kind === 'on_demand' ? { kind: 'on_demand' } : {}),
        },
      });
      form.reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function activate(id: string) {
    setError('');
    try {
      await api(`/batches/${id}/activate`, { method: 'POST', body: { all: true } });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function exportCsv(id: string) {
    setError('');
    try {
      const res = await api<{ downloadPath: string }>(`/batches/${id}/export?format=csv`);
      window.open(`${apiBase()}${res.downloadPath}`, '_blank');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function findCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = String(new FormData(event.currentTarget).get('serial') ?? '');
    setLookup(null);
    setLookupError('');
    try {
      setLookup(await api<CodeDetail>(`/codes/${encodeURIComponent(raw)}`));
    } catch (e) {
      setLookupError((e as Error).message);
    }
  }

  async function setFlag(serial: string, action: 'flag' | 'unflag', reason?: string) {
    setLookupError('');
    try {
      await api(`/codes/${serial}/${action}`, {
        method: 'POST',
        ...(action === 'flag' ? { body: { reason } } : { body: {} }),
      });
      setLookup(await api<CodeDetail>(`/codes/${serial}`));
    } catch (e) {
      setLookupError((e as Error).message);
    }
  }

  const input =
    'rounded border border-etch bg-basalt px-3 py-2 text-sm placeholder:text-limestone-dim/50 focus:border-jade focus:outline-none';

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-xl">Batches</h1>
      {error && <p className="text-xs text-state-alert">{error}</p>}

      <form
        onSubmit={createBatch}
        className="grid grid-cols-4 gap-3 rounded-lg border border-etch bg-basalt-deep p-4"
        data-testid="batch-form"
      >
        <select name="product_id" required className={input}>
          <option value="">Product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
        <input name="quantity" type="number" min={1} max={100000} required placeholder="Quantity *" className={input} />
        <input name="market" placeholder="Markets (US,DE…)" className={input} />
        <select name="kind" className={input}>
          <option value="bulk">Bulk (factory)</option>
          <option value="on_demand">On-demand pool (Lite)</option>
        </select>
        <button className="col-span-4 rounded bg-jade px-4 py-2 text-sm font-semibold text-basalt hover:bg-jade-deep">
          Generate batch
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-limestone-dim">
          <tr>
            <th className="py-2">Product</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Activated</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b.id} className="border-t border-etch" data-testid="batch-row" data-status={b.status}>
              <td className="py-2.5">
                {b.product.name}
                {b.kind === 'on_demand' && (
                  <span className="ml-2 rounded border border-etch px-1.5 py-0.5 text-[10px] text-limestone-dim">
                    pool
                  </span>
                )}
              </td>
              <td className="font-mono text-xs">{b.quantity}</td>
              <td>
                <span className={b.status === 'ready' ? 'text-jade' : b.status === 'exported' ? 'text-limestone-dim' : 'text-state-warn'}>
                  {b.status}
                </span>
              </td>
              <td className="font-mono text-xs">{b.activatedCount}</td>
              <td className="text-right">
                {(b.status === 'ready' || b.status === 'exported') && (
                  <span className="flex justify-end gap-2">
                    <button onClick={() => exportCsv(b.id)} className="rounded border border-etch px-2 py-1 text-xs hover:border-jade hover:text-jade">
                      CSV
                    </button>
                    {!b.autoActivate && b.activatedCount < b.quantity && (
                      <button onClick={() => activate(b.id)} className="rounded border border-etch px-2 py-1 text-xs hover:border-jade hover:text-jade">
                        Activate all
                      </button>
                    )}
                  </span>
                )}
              </td>
            </tr>
          ))}
          {batches.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-xs text-limestone-dim">
                No batches yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <section className="rounded-lg border border-etch bg-basalt-deep p-4">
        <h2 className="text-sm text-limestone-dim">Single-code lookup</h2>
        <form onSubmit={findCode} className="mt-2 flex gap-2">
          <input name="serial" placeholder="Serial (any format — auto-normalized)" className={`flex-1 font-mono ${input}`} />
          <button className="rounded border border-etch px-4 text-sm hover:border-jade hover:text-jade">Look up</button>
        </form>
        {lookupError && <p className="mt-2 text-xs text-state-alert">{lookupError}</p>}
        {lookup && (
          <div className="mt-3 text-sm">
            <p className="font-mono text-xs">{lookup.serial}</p>
            <p className="mt-1">
              <span className="text-limestone-dim">Status: </span>
              <span className={lookup.status === 'flagged' ? 'text-state-alert' : 'text-jade'}>
                {lookup.status}
                {lookup.flag_reason ? ` (${lookup.flag_reason})` : ''}
              </span>
              <span className="ml-3 text-limestone-dim">{lookup.product.name}</span>
            </p>
            <div className="mt-2 flex gap-2">
              {lookup.status !== 'flagged' ? (
                <>
                  <button onClick={() => setFlag(lookup.serial, 'flag', 'stolen')} className="rounded border border-state-alert px-2 py-1 text-xs text-state-alert">
                    Mark stolen
                  </button>
                  <button onClick={() => setFlag(lookup.serial, 'flag', 'recalled')} className="rounded border border-state-warn px-2 py-1 text-xs text-state-warn">
                    Mark recalled
                  </button>
                </>
              ) : (
                <button onClick={() => setFlag(lookup.serial, 'unflag')} className="rounded border border-etch px-2 py-1 text-xs hover:border-jade hover:text-jade">
                  Remove flag
                </button>
              )}
            </div>
            <ul className="mt-3 max-h-40 overflow-y-auto text-xs text-limestone-dim">
              {lookup.scan_events.map((e, i) => (
                <li key={i} className="border-t border-etch py-1.5">
                  {e.createdAt.slice(0, 16).replace('T', ' ')} · {e.kind} · {e.result}
                  {e.geo?.country ? ` · ${e.geo.country}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
