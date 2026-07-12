'use client';

import { useEffect, useState } from 'react';

import { api } from '../../../lib/dashboard/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  gtin: string | null;
  description: string | null;
}

/** Products (§6.2): CRUD; trace-template config arrives with white-label work. */
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<Product[]>('/products')
      .then(setProducts)
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setError('');
    try {
      await api('/products', {
        method: 'POST',
        body: {
          name: data.name,
          sku: data.sku,
          ...(data.gtin ? { gtin: data.gtin } : {}),
          ...(data.description ? { description: data.description } : {}),
        },
      });
      form.reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input =
    'rounded border border-etch bg-basalt px-3 py-2 text-sm placeholder:text-limestone-dim/50 focus:border-jade focus:outline-none';

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-xl">Products</h1>

      <form
        onSubmit={submit}
        className="grid grid-cols-2 gap-3 rounded-lg border border-etch bg-basalt-deep p-4"
        data-testid="product-form"
      >
        <input name="name" required placeholder="Product name *" className={input} />
        <input name="sku" required placeholder="SKU * (upsert key)" className={input} />
        <input name="gtin" placeholder="GTIN (optional, enables GS1 links)" className={input} />
        <input name="description" placeholder="Description" className={input} />
        {error && <p className="col-span-2 text-xs text-state-alert">{error}</p>}
        <button
          disabled={busy}
          className="col-span-2 rounded bg-jade px-4 py-2 text-sm font-semibold text-basalt hover:bg-jade-deep disabled:opacity-60"
        >
          Save product
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-limestone-dim">
          <tr>
            <th className="py-2">Name</th>
            <th>SKU</th>
            <th>GTIN</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t border-etch">
              <td className="py-2.5">{p.name}</td>
              <td className="font-mono text-xs">{p.sku}</td>
              <td className="font-mono text-xs">{p.gtin ?? '—'}</td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-xs text-limestone-dim">
                No products yet — create the first one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
