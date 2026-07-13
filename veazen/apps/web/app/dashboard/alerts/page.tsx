'use client';

import { useEffect, useState } from 'react';

import { api, friendlyMessage } from '../../../lib/dashboard/client';

interface Alert {
  id: string;
  rule: string;
  severity: 'info' | 'warning' | 'critical';
  payload: Record<string, unknown>;
  acknowledgedAt: string | null;
  createdAt: string;
}

const SEVERITY_COLOR: Record<Alert['severity'], string> = {
  info: 'text-limestone-dim',
  warning: 'text-state-warn',
  critical: 'text-state-alert',
};

/** Alerts (§6.4): list + acknowledge. */
export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');

  const load = (all: boolean) =>
    api<Alert[]>(`/alerts${all ? '' : '?status=open'}`)
      .then(setAlerts)
      .catch((e) => setError(friendlyMessage(e)));

  useEffect(() => {
    void load(showAll);
  }, [showAll]);

  async function acknowledge(id: string) {
    try {
      await api(`/alerts/${id}/acknowledge`, { method: 'POST', body: {} });
      await load(showAll);
    } catch (e) {
      setError(friendlyMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl">Alerts</h1>
        <label className="flex items-center gap-2 text-xs text-limestone-dim">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show acknowledged
        </label>
      </div>
      {error && <p className="text-xs text-state-alert">{error}</p>}
      <ul className="flex flex-col gap-2.5">
        {alerts.map((alert) => (
          <li key={alert.id} className="rounded-lg border border-etch bg-basalt-deep p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                <span className={`font-semibold uppercase ${SEVERITY_COLOR[alert.severity]}`}>
                  {alert.severity}
                </span>
                <span className="ml-3 font-mono text-xs">{alert.rule}</span>
                <span className="ml-3 text-xs text-limestone-dim">
                  {alert.createdAt.slice(0, 16).replace('T', ' ')}
                </span>
              </p>
              {!alert.acknowledgedAt && (
                <button
                  onClick={() => acknowledge(alert.id)}
                  className="rounded border border-etch px-2.5 py-1 text-xs hover:border-jade hover:text-jade"
                >
                  Acknowledge
                </button>
              )}
            </div>
            <pre className="mt-2 overflow-x-auto rounded bg-basalt p-2 text-[11px] text-limestone-dim">
              {JSON.stringify(alert.payload, null, 2)}
            </pre>
          </li>
        ))}
        {alerts.length === 0 && (
          <li className="py-8 text-center text-xs text-limestone-dim">No alerts. Quiet is good.</li>
        )}
      </ul>
    </div>
  );
}
