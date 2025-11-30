import './globals.css';
import type { Metadata } from 'next';
import { League_Spartan, Open_Sans } from 'next/font/google';
import { Providers } from './providers';

const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  variable: '--font-league-spartan',
  display: 'swap',
});

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'elu - Finde geprüfte Gesundheits­expert:innen | Physiotherapie, Coaching, Training & Ernährung',
  description: 'Individuelle Empfehlungen für Physiotherapie, Personal Training, Coaching, Ernährung und Massage. Sichere Buchung, flexible Formate – online oder vor Ort. Nachhaltige Gesundheit und echte Prävention.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${leagueSpartan.variable} ${openSans.variable}`}>
      <body className="font-body text-text-dark bg-bg-light antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
