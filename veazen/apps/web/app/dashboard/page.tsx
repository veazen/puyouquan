'use client';

import { useEffect, useState } from 'react';

import { api } from '../../lib/dashboard/client';

interface Overview {
  scan_count_30d: number;
  scans_by_day: Record<string, number>;
  scans_by_country: Record<string, number>;
  open_alerts: number;
  codes_by_status: Record<string, number>;
}

/** Overview (§6.1): 30-day scan volume, geo distribution, open alerts. */
export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Overview>('/stats/overview')
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return <p className="text-sm text-state-alert">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-limestone-dim">Loading…</p>;
  }

  const days = [...Array(30)]
    .map((_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400_000).toISOString().slice(0, 10);
      return { day: d, count: data.scans_by_day[d] ?? 0 };
    });
  const max = Math.max(1, ...days.map((d) => d.count));
  const countries = Object.entries(data.scans_by_country).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const countryMax = Math.max(1, ...countries.map(([, n]) => n));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-xl">Overview</h1>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Scans · 30 days" value={data.scan_count_30d} />
        <Stat label="Open alerts" value={data.open_alerts} alert={data.open_alerts > 0} />
        <Stat
          label="Active codes"
          value={(data.codes_by_status.active ?? 0) + (data.codes_by_status.verified ?? 0)}
        />
      </div>

      <section className="rounded-lg border border-etch bg-basalt-deep p-4">
        <h2 className="text-sm text-limestone-dim">Scan volume, last 30 days</h2>
        <svg viewBox="0 0 300 80" className="mt-3 w-full" role="img" aria-label="Daily scan volume">
          {days.map((d, i) => (
            <rect
              key={d.day}
              x={i * 10 + 1}
              y={76 - (d.count / max) * 72}
              width={8}
              height={Math.max(1, (d.count / max) * 72)}
              rx={1}
              fill={d.count > 0 ? '#3fa37c' : 'rgba(233,228,216,.12)'}
            >
              <title>{`${d.day}: ${d.count}`}</title>
            </rect>
          ))}
        </svg>
      </section>

      <section className="rounded-lg border border-etch bg-basalt-deep p-4">
        <h2 className="text-sm text-limestone-dim">Scans by country</h2>
        {countries.length === 0 ? (
          <p className="mt-3 text-xs text-limestone-dim/70">
            No geolocated scans yet (GeoIP database not configured or no scans).
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {countries.map(([code, count]) => (
              <li key={code} className="flex items-center gap-3 text-xs">
                <span className="w-8 font-mono">{code}</span>
                <span className="h-2 rounded bg-jade" style={{ width: `${(count / countryMax) * 70}%` }} />
                <span className="text-limestone-dim">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-lg border border-etch bg-basalt-deep p-4">
      <p className="text-xs text-limestone-dim">{label}</p>
      <p className={`mt-1 font-mono text-2xl ${alert ? 'text-state-warn' : ''}`}>{value}</p>
    </div>
  );
}
