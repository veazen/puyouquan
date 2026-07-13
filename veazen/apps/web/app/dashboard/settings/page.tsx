'use client';

import { useEffect, useState } from 'react';

import { api } from '../../../lib/dashboard/client';

interface Me {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    settings: { mode?: string; brandColor?: string; logoUrl?: string; story?: { title?: string; body?: string } };
  };
  user: { email: string; role: string } | null;
}

interface ApiKeyRow {
  id: string;
  keyPrefix: string;
  label: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  failureCount: number;
}

const WEBHOOK_EVENTS = [
  'code.verified',
  'code.duplicate_attempt',
  'code.flagged',
  'batch.ready',
  'alert.created',
];

const input =
  'rounded border border-etch bg-basalt px-3 py-2 text-sm placeholder:text-limestone-dim/50 focus:border-jade focus:outline-none';
const btn =
  'rounded border border-etch px-3 py-1.5 text-xs hover:border-jade hover:text-jade';

/** One-time secret reveal: the value alone in a copy-safe box + copy button. */
function SecretReveal({ value, hint, testId }: { value: string; hint: string; testId?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 rounded border border-jade bg-basalt p-2" data-testid={testId}>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all font-mono text-xs text-jade">{value}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="shrink-0 rounded border border-jade px-2.5 py-1 text-xs text-jade hover:bg-jade hover:text-basalt"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-limestone-dim">{hint}</p>
    </div>
  );
}

/** Settings (§6.5): branding, mode, API keys, webhooks, team, sites. */
export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [team, setTeam] = useState<Array<{ email: string; role: string }>>([]);
  const [sites, setSites] = useState<Array<{ siteUrl: string; pluginVersion: string | null; lastSeenAt: string }>>([]);
  const [freshKey, setFreshKey] = useState('');
  const [freshSecret, setFreshSecret] = useState('');
  const [message, setMessage] = useState('');

  const load = () =>
    Promise.all([
      api<Me>('/tenant/me'),
      api<ApiKeyRow[]>('/auth/api-keys'),
      api<Webhook[]>('/webhooks'),
      api<Array<{ email: string; role: string }>>('/tenant/users'),
      api<Array<{ siteUrl: string; pluginVersion: string | null; lastSeenAt: string }>>('/tenant/sites'),
    ])
      .then(([m, k, w, u, s]) => {
        setMe(m);
        setKeys(k);
        setWebhooks(w);
        setTeam(u);
        setSites(s);
      })
      .catch((e: Error) => setMessage(e.message));

  useEffect(() => {
    void load();
  }, []);

  async function saveBranding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setMessage('');
    try {
      await api('/tenant/settings', {
        method: 'PATCH',
        body: {
          name: data.name,
          mode: data.mode,
          settings: {
            brandColor: data.brandColor || undefined,
            logoUrl: data.logoUrl || undefined,
            story: data.storyBody ? { title: String(data.storyTitle ?? ''), body: data.storyBody } : undefined,
          },
        },
      });
      setMessage('Saved.');
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function createKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const label = String(new FormData(form).get('label') ?? 'default');
    setMessage('');
    try {
      const res = await api<{ apiKey: string }>('/auth/api-keys', { method: 'POST', body: { label } });
      setFreshKey(res.apiKey);
      form.reset();
      await load();
    } catch (e) {
      setMessage(`Create key failed: ${(e as Error).message}`);
    }
  }

  async function createWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const events = WEBHOOK_EVENTS.filter((e) => fd.get(`ev_${e}`));
    try {
      const res = await api<{ secret: string }>('/webhooks', {
        method: 'POST',
        body: { url: fd.get('url'), events: events.length ? events : ['alert.created'] },
      });
      setFreshSecret(res.secret);
      form.reset();
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  if (!me) {
    return <p className="text-sm text-limestone-dim">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl">Settings</h1>
      {message && <p className="text-xs text-state-warn">{message}</p>}

      <section className="rounded-lg border border-etch bg-basalt-deep p-4">
        <h2 className="text-sm text-limestone-dim">Brand & verify page</h2>
        <form onSubmit={saveBranding} className="mt-3 grid grid-cols-2 gap-3">
          <input name="name" defaultValue={me.tenant.name} placeholder="Brand name" className={input} />
          <select name="mode" defaultValue={me.tenant.settings.mode ?? 'standard'} className={input}>
            <option value="standard">Standard (factory & scratch codes)</option>
            <option value="lite">Lite (self-print, first-scan lock)</option>
          </select>
          <input name="brandColor" defaultValue={me.tenant.settings.brandColor ?? ''} placeholder="Brand accent color (#3fa37c)" className={input} />
          <input name="logoUrl" defaultValue={me.tenant.settings.logoUrl ?? ''} placeholder="Logo URL" className={input} />
          <input name="storyTitle" defaultValue={me.tenant.settings.story?.title ?? ''} placeholder="Story title (Lite verify page)" className={input} />
          <textarea name="storyBody" defaultValue={me.tenant.settings.story?.body ?? ''} placeholder="Brand story (Lite verify page)" className={`${input} col-span-2 min-h-20`} />
          <button className="col-span-2 rounded bg-jade px-4 py-2 text-sm font-semibold text-basalt hover:bg-jade-deep">
            Save
          </button>
        </form>
        <p className="mt-2 text-[11px] text-limestone-dim/70">
          Tenant: <span className="font-mono">{me.tenant.slug}</span> · plan {me.tenant.plan} · white-label center (custom domains, serial profiles) opens in Phase 4
        </p>
      </section>

      <section className="rounded-lg border border-etch bg-basalt-deep p-4">
        <h2 className="text-sm text-limestone-dim">API keys</h2>
        {freshKey && (
          <SecretReveal value={freshKey} hint="Copy it now — it is shown only once." testId="fresh-api-key" />
        )}
        <form onSubmit={createKey} className="mt-3 flex gap-2">
          <input
            name="label"
            placeholder="Label (e.g. woocommerce)"
            autoComplete="off"
            spellCheck={false}
            className={`flex-1 ${input}`}
          />
          <button className={btn}>Create key</button>
        </form>
        <ul className="mt-3 flex flex-col gap-1.5 text-xs">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between border-t border-etch py-1.5">
              <span className="font-mono">vz_{k.keyPrefix}…</span>
              <span className="text-limestone-dim">{k.label}</span>
              {k.revokedAt ? (
                <span className="text-state-alert">revoked</span>
              ) : (
                <button
                  onClick={() =>
                    api(`/auth/api-keys/${k.id}`, { method: 'DELETE' })
                      .then(load)
                      .catch((e: Error) => setMessage(`Revoke failed: ${e.message}`))
                  }
                  className="text-limestone-dim hover:text-state-alert"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-etch bg-basalt-deep p-4">
        <h2 className="text-sm text-limestone-dim">Webhooks</h2>
        {freshSecret && (
          <SecretReveal value={freshSecret} hint="Webhook signing secret — shown only once." />
        )}
        <form onSubmit={createWebhook} className="mt-3 flex flex-col gap-2">
          <input name="url" required placeholder="https://example.com/hooks/veazen" autoComplete="off" spellCheck={false} className={input} />
          <div className="flex flex-wrap gap-3 text-xs text-limestone-dim">
            {WEBHOOK_EVENTS.map((e) => (
              <label key={e} className="flex items-center gap-1.5">
                <input type="checkbox" name={`ev_${e}`} defaultChecked={e === 'alert.created'} />
                {e}
              </label>
            ))}
          </div>
          <button className={`self-start ${btn}`}>Add endpoint</button>
        </form>
        <ul className="mt-3 flex flex-col gap-1.5 text-xs">
          {webhooks.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-2 border-t border-etch py-1.5">
              <span className="truncate font-mono">{w.url}</span>
              <span className="shrink-0 text-limestone-dim">{w.events.length} events</span>
              <span className={`shrink-0 ${w.active ? 'text-jade' : 'text-state-alert'}`}>
                {w.active ? 'active' : 'disabled'}
              </span>
              <span className="flex shrink-0 gap-2">
                <button
                  onClick={() =>
                    api(`/webhooks/${w.id}/test`, { method: 'POST', body: {} })
                      .then(() => setMessage('Test event enqueued.'))
                      .catch((e: Error) => setMessage(`Webhook test failed: ${e.message}`))
                  }
                  className="hover:text-jade"
                >
                  Test
                </button>
                <button
                  onClick={() =>
                    api(`/webhooks/${w.id}`, { method: 'DELETE' })
                      .then(load)
                      .catch((e: Error) => setMessage(`Delete failed: ${e.message}`))
                  }
                  className="hover:text-state-alert"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-lg border border-etch bg-basalt-deep p-4">
          <h2 className="text-sm text-limestone-dim">Team</h2>
          <ul className="mt-2 text-xs">
            {team.map((u) => (
              <li key={u.email} className="flex justify-between border-t border-etch py-1.5">
                <span>{u.email}</span>
                <span className="text-limestone-dim">{u.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-limestone-dim/70">Invites arrive with Phase 4 polish.</p>
        </section>
        <section className="rounded-lg border border-etch bg-basalt-deep p-4">
          <h2 className="text-sm text-limestone-dim">Connected stores</h2>
          {sites.length === 0 ? (
            <p className="mt-2 text-xs text-limestone-dim/70">
              No WooCommerce stores connected yet — install the Veazen plugin (Phase 3) and paste an API key.
            </p>
          ) : (
            <ul className="mt-2 text-xs">
              {sites.map((s) => (
                <li key={s.siteUrl} className="flex justify-between border-t border-etch py-1.5">
                  <span className="truncate">{s.siteUrl}</span>
                  <span className="text-limestone-dim">v{s.pluginVersion ?? '?'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
