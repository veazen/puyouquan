'use client';

import { useEffect, useState } from 'react';

import { api, friendlyMessage } from '../../../lib/dashboard/client';

interface Me {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    settings: {
      mode?: string;
      brandColor?: string;
      logoUrl?: string;
      story?: { title?: string; body?: string };
      rma_display_policy?: string;
    };
  };
  user: { id: string; email: string; role: string } | null;
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

interface Member {
  id: string;
  email: string;
  role: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

/** E1: roles an owner can hand out — never a second owner via invite. */
const INVITE_ROLES = [
  { value: 'admin', label: 'Admin — everything except team & API keys' },
  { value: 'viewer', label: 'Viewer — read-only' },
  { value: 'warehouse', label: 'Warehouse — Returns desk only' },
];

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
  const [team, setTeam] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  /** accept URLs of invites created in this session (id → url) — the token
   *  is hashed server-side, so the link is only ever visible at creation */
  const [inviteUrls, setInviteUrls] = useState<Record<string, string>>({});
  const [copiedInvite, setCopiedInvite] = useState('');
  const [sites, setSites] = useState<Array<{ siteUrl: string; pluginVersion: string | null; lastSeenAt: string }>>([]);
  const [freshKey, setFreshKey] = useState('');
  const [freshSecret, setFreshSecret] = useState('');
  const [message, setMessage] = useState('');

  // allSettled, not all: during a deploy window the API may briefly lack the
  // newest endpoints (404) — the rest of the page must still render, and the
  // failure must surface instead of an eternal "Loading…".
  const load = () =>
    Promise.allSettled([
      api<Me>('/tenant/me'),
      api<ApiKeyRow[]>('/auth/api-keys'),
      api<Webhook[]>('/webhooks'),
      api<Member[]>('/tenant/users'),
      api<Invite[]>('/tenant/invites'),
      api<Array<{ siteUrl: string; pluginVersion: string | null; lastSeenAt: string }>>('/tenant/sites'),
    ]).then(([m, k, w, u, inv, s]) => {
      if (m.status === 'fulfilled') setMe(m.value);
      if (k.status === 'fulfilled') setKeys(k.value);
      if (w.status === 'fulfilled') setWebhooks(w.value);
      if (u.status === 'fulfilled') setTeam(u.value);
      if (inv.status === 'fulfilled') setInvites(inv.value);
      if (s.status === 'fulfilled') setSites(s.value);
      const failed = [m, k, w, u, inv, s].find(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      if (failed) {
        setMessage(`Some data failed to load: ${friendlyMessage(failed.reason)}`);
      }
    });

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
      setMessage(friendlyMessage(e));
    }
  }

  async function saveReturnsPolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const policy = String(new FormData(event.currentTarget).get('rma_display_policy') ?? 'fresh');
    setMessage('');
    try {
      await api('/tenant/settings', {
        method: 'PATCH',
        body: { settings: { rma_display_policy: policy } },
      });
      setMessage('Returns display policy saved.');
      await load();
    } catch (e) {
      setMessage(`Returns policy save failed: ${friendlyMessage(e)}`);
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
      setMessage(`Create key failed: ${friendlyMessage(e)}`);
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
      setMessage(friendlyMessage(e));
    }
  }

  /** E1 team invites (owner-only): create, keep the accept URL copyable. */
  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setMessage('');
    try {
      const res = await api<Invite & { accept_url: string }>('/tenant/invites', {
        method: 'POST',
        body: { email: fd.get('email'), role: fd.get('role') },
      });
      setInviteUrls((urls) => ({ ...urls, [res.id]: res.accept_url }));
      setMessage(`Invite created for ${res.email} — the email is on its way; you can also copy the link below.`);
      form.reset();
      await load();
    } catch (e) {
      setMessage(`Invite failed: ${friendlyMessage(e)}`);
    }
  }

  function copyInviteUrl(id: string) {
    const url = inviteUrls[id];
    if (!url) {
      return;
    }
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedInvite(id);
      setTimeout(() => setCopiedInvite(''), 2000);
    });
  }

  async function revokeInvite(id: string) {
    setMessage('');
    try {
      await api(`/tenant/invites/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setMessage(`Revoke invite failed: ${friendlyMessage(e)}`);
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Remove ${member.email} from the team?`)) {
      return;
    }
    setMessage('');
    try {
      await api(`/tenant/users/${member.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setMessage(`Remove member failed: ${friendlyMessage(e)}`);
    }
  }

  if (!me) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-limestone-dim">{message ? 'Failed to load.' : 'Loading…'}</p>
        {message && (
          <>
            <p className="text-xs text-state-warn">{message}</p>
            <button
              type="button"
              onClick={() => {
                setMessage('');
                void load();
              }}
              className={btn}
            >
              Retry
            </button>
          </>
        )}
      </div>
    );
  }

  // E1 role gates (UI layer only — the API enforces the real matrix)
  const role = me.user?.role ?? 'viewer';
  const isOwner = role === 'owner';
  const canWrite = role === 'owner' || role === 'admin';

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
          <button
            disabled={!canWrite}
            className="col-span-2 rounded bg-jade px-4 py-2 text-sm font-semibold text-basalt hover:bg-jade-deep disabled:opacity-50"
          >
            Save
          </button>
        </form>
        <p className="mt-2 text-[11px] text-limestone-dim/70">
          Tenant: <span className="font-mono">{me.tenant.slug}</span> · plan {me.tenant.plan} · white-label center (custom domains, serial profiles) opens in Phase 4
        </p>
      </section>

      <section className="rounded-lg border border-etch bg-basalt-deep p-4">
        <h2 className="text-sm text-limestone-dim">Returns display policy</h2>
        <p className="mt-1 text-[11px] text-limestone-dim/70">
          What the verify page shows after a returned item is released for resale (Returns desk):
          a fresh first scan, or an &quot;officially refurbished&quot; endorsement with the
          verification history.
        </p>
        <form onSubmit={saveReturnsPolicy} className="mt-3 flex gap-2">
          <select
            name="rma_display_policy"
            key={me.tenant.settings.rma_display_policy ?? 'fresh'}
            defaultValue={me.tenant.settings.rma_display_policy ?? 'fresh'}
            data-testid="rma-display-policy"
            className={`flex-1 ${input}`}
          >
            <option value="fresh">Fresh (default) — released codes scan green as new</option>
            <option value="refurbished">Refurbished — released codes show the brand endorsement</option>
          </select>
          <button disabled={!canWrite} className={`${btn} disabled:opacity-50`}>
            Save policy
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-etch bg-basalt-deep p-4">
        <h2 className="text-sm text-limestone-dim">API keys</h2>
        {freshKey && (
          <SecretReveal value={freshKey} hint="Copy it now — it is shown only once." testId="fresh-api-key" />
        )}
        {isOwner ? (
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
        ) : (
          <p className="mt-2 text-[11px] text-limestone-dim/70">
            Only the owner can create or revoke API keys.
          </p>
        )}
        <ul className="mt-3 flex flex-col gap-1.5 text-xs">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between border-t border-etch py-1.5">
              <span className="font-mono">vz_{k.keyPrefix}…</span>
              <span className="text-limestone-dim">{k.label}</span>
              {k.revokedAt ? (
                <span className="text-state-alert">revoked</span>
              ) : isOwner ? (
                <button
                  onClick={() =>
                    api(`/auth/api-keys/${k.id}`, { method: 'DELETE' })
                      .then(load)
                      .catch((e) => setMessage(`Revoke failed: ${friendlyMessage(e)}`))
                  }
                  className="text-limestone-dim hover:text-state-alert"
                >
                  Revoke
                </button>
              ) : (
                <span className="text-limestone-dim/50">active</span>
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
          <button disabled={!canWrite} className={`self-start ${btn} disabled:opacity-50`}>
            Add endpoint
          </button>
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
                  disabled={!canWrite}
                  onClick={() =>
                    api(`/webhooks/${w.id}/test`, { method: 'POST', body: {} })
                      .then(() => setMessage('Test event enqueued.'))
                      .catch((e) => setMessage(`Webhook test failed: ${friendlyMessage(e)}`))
                  }
                  className="hover:text-jade disabled:opacity-50"
                >
                  Test
                </button>
                <button
                  disabled={!canWrite}
                  onClick={() =>
                    api(`/webhooks/${w.id}`, { method: 'DELETE' })
                      .then(load)
                      .catch((e) => setMessage(`Delete failed: ${friendlyMessage(e)}`))
                  }
                  className="hover:text-state-alert disabled:opacity-50"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-lg border border-etch bg-basalt-deep p-4" data-testid="team-section">
          <h2 className="text-sm text-limestone-dim">Team</h2>
          <ul className="mt-2 text-xs">
            {team.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 border-t border-etch py-1.5">
                <span className="truncate">{u.email}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-limestone-dim" data-testid={`member-role-${u.email}`}>
                    {u.role}
                  </span>
                  {isOwner && u.id !== me.user?.id && (
                    <button
                      onClick={() => void removeMember(u)}
                      data-testid={`member-remove-${u.email}`}
                      className="text-limestone-dim hover:text-state-alert"
                    >
                      Remove
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {isOwner && (
            <form onSubmit={createInvite} className="mt-3 flex flex-col gap-2" data-testid="invite-form">
              <input
                name="email"
                type="email"
                required
                placeholder="colleague@company.com"
                autoComplete="off"
                spellCheck={false}
                data-testid="invite-email"
                className={input}
              />
              <div className="flex gap-2">
                <select name="role" defaultValue="warehouse" data-testid="invite-role" className={`flex-1 ${input}`}>
                  {INVITE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button data-testid="invite-send" className={btn}>
                  Invite
                </button>
              </div>
            </form>
          )}

          {invites.length > 0 && (
            <div className="mt-3">
              <h3 className="text-[11px] uppercase tracking-wider text-limestone-dim/70">
                Pending invites
              </h3>
              <ul className="mt-1 text-xs" data-testid="pending-invites">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-2 border-t border-etch py-1.5">
                    <span className="truncate">{inv.email}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-limestone-dim">{inv.role}</span>
                      <span className="text-limestone-dim/60">
                        {new Date(inv.expiresAt) < new Date()
                          ? 'expired'
                          : `until ${inv.expiresAt.slice(0, 10)}`}
                      </span>
                      {inviteUrls[inv.id] ? (
                        <button
                          onClick={() => copyInviteUrl(inv.id)}
                          data-testid={`invite-copy-${inv.email}`}
                          className="text-jade hover:text-jade-deep"
                          title="Copy the accept link (shown only in this session — the token is stored hashed)"
                        >
                          {copiedInvite === inv.id ? 'Copied ✓' : 'Copy link'}
                        </button>
                      ) : (
                        <span
                          className="text-limestone-dim/50"
                          title="The link was shown once at creation. Revoke and re-invite to get a new one."
                        >
                          link sent
                        </span>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => void revokeInvite(inv.id)}
                          data-testid={`invite-revoke-${inv.email}`}
                          className="text-limestone-dim hover:text-state-alert"
                        >
                          Revoke
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!isOwner && (
            <p className="mt-2 text-[11px] text-limestone-dim/70">
              Only the owner can invite or remove members.
            </p>
          )}
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
