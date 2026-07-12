'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiBase } from '../../../lib/api';
import { setTokens } from '../../../lib/dashboard/client';

/** Login / registration with the §7.5 onboarding mode fork. */
export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const path = tab === 'login' ? '/auth/login' : '/auth/register';
    try {
      const res = await fetch(`${apiBase()}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
        message?: string | string[];
      };
      if (!res.ok || !body.accessToken || !body.refreshToken) {
        setError(Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? 'failed'));
        return;
      }
      setTokens(body.accessToken, body.refreshToken);
      router.replace('/dashboard');
    } catch {
      setError('network error');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'rounded border border-etch bg-basalt px-3 py-2 text-sm text-limestone placeholder:text-limestone-dim/50 focus:border-jade focus:outline-none';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-5 px-5">
      <div className="text-center">
        <p className="font-display text-xs uppercase tracking-[0.35em] text-limestone-dim">Veazen</p>
        <h1 className="mt-1 font-display text-2xl">Brand console</h1>
      </div>
      <div className="flex rounded border border-etch p-1 text-sm">
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded py-1.5 capitalize ${
              tab === t ? 'bg-basalt-deep text-jade' : 'text-limestone-dim'
            }`}
          >
            {t === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {tab === 'register' && (
          <>
            <input name="tenantName" required placeholder="Brand / company name" className={input} />
            <input
              name="slug"
              required
              pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
              placeholder="Subdomain slug (e.g. acme)"
              className={input}
            />
            <fieldset className="rounded border border-etch p-3 text-xs text-limestone-dim">
              <legend className="px-1">How do you produce? (§ Lite mode)</legend>
              <label className="flex items-center gap-2 py-1">
                <input type="radio" name="mode" value="standard" defaultChecked /> I have a
                factory / print shop (Standard)
              </label>
              <label className="flex items-center gap-2 py-1">
                <input type="radio" name="mode" value="lite" /> I pack and ship myself (Lite)
              </label>
            </fieldset>
          </>
        )}
        <input name="email" type="email" required placeholder="Email" className={input} />
        <input
          name="password"
          type="password"
          required
          minLength={tab === 'register' ? 10 : 1}
          placeholder="Password"
          className={input}
        />
        {error && <p className="text-xs text-state-alert">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-jade px-4 py-2.5 text-sm font-semibold text-basalt hover:bg-jade-deep disabled:opacity-60"
        >
          {tab === 'login' ? 'Sign in' : 'Create tenant'}
        </button>
      </form>
    </main>
  );
}
