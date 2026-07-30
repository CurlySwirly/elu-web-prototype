import Link from 'next/link';
import { Header } from '@/components/Header';

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-bg-light">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-24 pb-12">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text-dark mb-4">
          Allgemeine Geschäftsbedingungen
        </h1>
        <div className="rounded-2xl border-2 bg-white p-4 sm:p-6 space-y-4 text-sm text-gray-600 font-body leading-relaxed">
          <p>
            Mit der Buchung eines Termins über elu akzeptierst du unsere Nutzungsbedingungen.
            Buchungen sind verbindlich. Stornierungen sind gemäß den jeweils ausgewiesenen
            Stornierungsfristen möglich.
          </p>
          <p>
            elu vermittelt Termine zwischen Klient:innen und verifizierten Expert:innen. Die
            Leistungserbringung erfolgt durch die jeweilige Expert:in.
          </p>
          <p className="text-xs text-gray-500">
            Platzhalter-Text für die Produktvorschau. Finale AGB folgen.
          </p>
        </div>
        <Link href="/app/experten" className="inline-block mt-6 text-sm text-primary-blue hover:underline font-body">
          ← Zurück zur Expertensuche
        </Link>
      </main>
    </div>
  );
}
