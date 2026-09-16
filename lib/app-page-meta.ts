export type AppPageMeta = {
  title: string;
  description?: string;
};

export const APP_PAGE_META: Record<string, AppPageMeta> = {
  '/app': {
    title: 'Dashboard',
    description: 'Überblick über Termine, Aufgaben und Aktivität',
  },
  '/app/kalender': {
    title: 'Kalender',
    description: 'Verfügbarkeit, Sperrtage und Termine',
  },
  '/app/angebote': {
    title: 'Meine Angebote',
    description: 'Verwalte deine Services und Preise',
  },
  '/app/finanzen': {
    title: 'Finanzen',
    description: 'Einnahmen, Auszahlungen und Honorarnoten',
  },
  '/app/nachrichten': {
    title: 'Nachrichten',
    description: 'Unterhaltungen mit Klient:innen und Expert:innen',
  },
  '/app/einstellungen': {
    title: 'Einstellungen',
    description: 'Konto, Benachrichtigungen und Datenschutz',
  },
  '/app/hilfe': {
    title: 'Hilfe',
    description: 'Fragen, Wünsche und Anregungen an elu',
  },
  '/app/expert-profil': {
    title: 'Expert:innen-Profil',
    description: 'Verwalte dein öffentliches Profil',
  },
  '/app/profil': {
    title: 'Profil',
    description: 'Deine persönlichen Daten',
  },
  '/app/termine': {
    title: 'Termine',
    description: 'Alle Buchungen im Überblick',
  },
  '/app/experten': {
    title: 'Expert:innen',
    description: 'Finde passende Gesundheits­expert:innen',
  },
};

/** Normalize path (strip query/hash, trailing slash except root). */
export function normalizeAppPath(pathname: string): string {
  const bare = pathname.split('?')[0].split('#')[0];
  if (bare.length > 1 && bare.endsWith('/')) return bare.slice(0, -1);
  return bare;
}

export function getAppPageMeta(pathname: string): AppPageMeta | null {
  const path = normalizeAppPath(pathname);
  if (APP_PAGE_META[path]) return APP_PAGE_META[path];
  // Dynamic segments: /app/experten/[id], /app/buchen/[id]
  if (path.startsWith('/app/experten/')) {
    return { title: 'Expert:in', description: 'Profil und Buchung' };
  }
  if (path.startsWith('/app/buchen/')) {
    return { title: 'Buchen', description: 'Termin auswählen und bestätigen' };
  }
  return null;
}
