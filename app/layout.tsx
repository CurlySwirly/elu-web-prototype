import './globals.css';
import type { CSSProperties, ReactNode } from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'elu - Finde geprüfte Gesundheits­expert:innen | Physiotherapie, Coaching, Training & Ernährung',
  description:
    'Individuelle Empfehlungen für Physiotherapie, Personal Training, Coaching, Ernährung und Massage. Sichere Buchung, flexible Formate – online oder vor Ort. Nachhaltige Gesundheit und echte Prävention.',
};

/** CSS vars match tailwind font-heading / font-body; fonts load via <link> (non-blocking). */
const fontVars = {
  ['--font-league-spartan']: '"League Spartan", Avenir Next, Helvetica, Arial, sans-serif',
  ['--font-open-sans']: '"Open Sans", ui-sans-serif, system-ui, sans-serif',
} as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" style={fontVars}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body text-text-dark bg-bg-light antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
