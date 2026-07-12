import type { Metadata, Viewport } from 'next';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

// §2.5 fonts, self-hosted via @fontsource (no remote assets, offline builds)
import '@fontsource/marcellus/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veazen — Trust, set in stone.',
  description:
    'One-code-per-item anti-counterfeit verification and supply-chain traceability for brands.',
};

export const viewport: Viewport = {
  themeColor: '#16191d',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen bg-basalt font-sans text-limestone antialiased">
        {children}
      </body>
    </html>
  );
}
