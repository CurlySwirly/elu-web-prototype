/** First token of a display name (Vorname). */
export function firstNameFrom(fullName?: string | null): string {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] || '';
}
