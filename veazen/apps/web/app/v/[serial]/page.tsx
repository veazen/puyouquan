import { formatForDisplay, isCanonicalCrockford, normalizeInput } from '@veazen/crypto/format';

// PHASE 2 PLACEHOLDER — consumer verify page (PROJECT_PLAN §2.2, §6).
// No data fetching here yet: the real page will SSR against
// GET /api/v1/verify/:serial and render the three-state result
// (green = authentic first scan / yellow = scanned before / red = invalid),
// tenant branding, and localized copy. First-load JS budget: < 100KB.

interface VerifyPageProps {
  params: Promise<{ serial: string }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { serial } = await params;
  // §2.4: every verification entry point normalizes raw input (strip
  // separators, uppercase, map I/L→1 O→0) before doing anything with it.
  const normalized = normalizeInput(decodeURIComponent(serial));
  const displaySerial = isCanonicalCrockford(normalized)
    ? formatForDisplay(normalized)
    : normalized;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
        Veazen verification
      </p>
      <p className="break-all font-mono text-2xl font-semibold tracking-wider">
        {displaySerial || '—'}
      </p>
      <p className="rounded border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500">
        Placeholder — verification lands in Phase 2.
      </p>
    </main>
  );
}
