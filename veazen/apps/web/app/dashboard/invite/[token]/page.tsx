'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiBase } from '../../../../lib/api';
import { getRole, setTokens } from '../../../../lib/dashboard/client';

/**
 * E1 invite acceptance (public — the URL token is the credential): set a
 * password, redeem the invite, get signed in and land on the role's home
 * (warehouse → Returns desk, everyone else → Overview).
 */
export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    if (password !== String(data.get('confirm') ?? '')) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${apiBase()}/auth/accept-invite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: params.token, password }),
      });
      const body = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
        message?: string | string[];
      };
      if (!res.ok || !body.accessToken || !body.refreshToken) {
        setError(
          Array.isArray(body.message)
            ? body.message.join('; ')
            : (body.message ?? 'This invite is invalid or has expired — ask for a new one.'),
        );
        return;
      }
      setTokens(body.accessToken, body.refreshToken);
      router.replace(getRole() === 'warehouse' ? '/dashboard/returns' : '/dashboard');
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
        <h1 className="mt-1 font-display text-2xl">Join the team</h1>
        <p className="mt-2 text-xs text-limestone-dim">
          You were invited to a brand console. Set a password to activate your account.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          name="password"
          type="password"
          required
          minLength={10}
          placeholder="Password (min. 10 characters)"
          data-testid="invite-password"
          className={input}
        />
        <input
          name="confirm"
          type="password"
          required
          minLength={10}
          placeholder="Repeat password"
          data-testid="invite-confirm"
          className={input}
        />
        {error && (
          <p data-testid="invite-error" className="text-xs text-state-alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          data-testid="invite-submit"
          className="rounded bg-jade px-4 py-2.5 text-sm font-semibold text-basalt hover:bg-jade-deep disabled:opacity-60"
        >
          {busy ? 'Activating…' : 'Set password & sign in'}
        </button>
      </form>
    </main>
  );
}
