import Link from 'next/link';
import { Button } from './ui/button';

export function Header() {
  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-heading font-bold text-text-dark">
            elu
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/experts" className="text-text-dark hover:text-primary-blue transition-colors">
              Für Expert:innen
            </Link>
            <Link href="/spaces" className="text-text-dark hover:text-primary-blue transition-colors">
              Für Anbieter
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-text-dark hover:text-primary-blue">
                Anmelden
              </Button>
            </Link>
            <Link href="/signup/client">
              <Button className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity">
                Registrieren
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
