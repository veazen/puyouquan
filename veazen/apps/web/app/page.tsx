// Platform root: the consumer-facing entry is /v/[serial] (QR codes);
// the tenant console lives at /dashboard.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-xs uppercase tracking-[0.35em] text-limestone-dim">Veazen</p>
      <h1 className="font-display text-3xl tracking-wide">Trust, set in stone.</h1>
      <p className="text-sm text-limestone-dim">
        Scan a product&apos;s QR code to verify it, or sign in to your brand console.
      </p>
      <a
        href="/dashboard"
        className="mt-2 rounded border border-jade px-5 py-2 text-sm text-jade transition-colors hover:bg-jade hover:text-basalt"
      >
        Open dashboard
      </a>
    </main>
  );
}
