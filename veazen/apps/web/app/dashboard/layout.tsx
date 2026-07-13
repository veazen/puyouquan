'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { clearTokens, getRole, getTokens } from '../../lib/dashboard/client';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/batches', label: 'Batches' },
  { href: '/dashboard/returns', label: 'Returns' },
  { href: '/dashboard/alerts', label: 'Alerts' },
  { href: '/dashboard/settings', label: 'Settings' },
];

/** E1: warehouse accounts live on the Returns desk and see nothing else. */
const WAREHOUSE_NAV = [{ href: '/dashboard/returns', label: 'Returns' }];

/** Tenant console shell (§6): client-side JWT session + role-aware nav (E1). */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/dashboard/login';
  // the invite-accept page is public by design (the token *is* the credential)
  const isInvite = pathname.startsWith('/dashboard/invite/');
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (isLogin || isInvite) {
      return;
    }
    if (!getTokens().access) {
      router.replace('/dashboard/login');
      return;
    }
    const r = getRole();
    // warehouse: the Returns desk is the whole console — everything else
    // would only produce 403s, so route straight there
    if (r === 'warehouse' && pathname !== '/dashboard/returns') {
      router.replace('/dashboard/returns');
      return;
    }
    setRole(r);
    setReady(true);
  }, [isLogin, isInvite, pathname, router]);

  if (isLogin || isInvite) {
    return <>{children}</>;
  }
  if (!ready) {
    return <div className="p-10 text-sm text-limestone-dim">Loading…</div>;
  }

  const nav = role === 'warehouse' ? WAREHOUSE_NAV : NAV;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl">
      <aside className="flex w-48 shrink-0 flex-col gap-1 border-r border-etch px-3 py-6">
        <p className="mb-4 px-2 font-display text-sm uppercase tracking-[0.3em]">Veazen</p>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded px-2 py-1.5 text-sm ${
              pathname === item.href
                ? 'bg-basalt-deep text-jade'
                : 'text-limestone-dim hover:text-limestone'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => {
            clearTokens();
            router.replace('/dashboard/login');
          }}
          className="mt-auto rounded px-2 py-1.5 text-left text-sm text-limestone-dim hover:text-state-alert"
        >
          Sign out
        </button>
      </aside>
      <div className="min-w-0 flex-1 px-6 py-6">{children}</div>
    </div>
  );
}
