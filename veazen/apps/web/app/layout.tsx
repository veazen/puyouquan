import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

// No next/font or any remote asset: builds must work fully offline.
// The verify page carries a strict JS budget later (< 100KB first load),
// so this layout stays dependency-free and uses the system font stack.

export const metadata: Metadata = {
  title: 'Veazen — Trust, set in stone.',
  description:
    'One-code-per-item anti-counterfeit verification and supply-chain traceability for brands.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
