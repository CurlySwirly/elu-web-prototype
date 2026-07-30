/** Build calendar export helpers (ICS + Google Calendar). */

export interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  uid?: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Format as UTC ICS timestamp: YYYYMMDDTHHMMSSZ */
export function toIcsUtc(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function buildIcsContent(event: CalendarEventInput): string {
  const uid = event.uid || `${Date.now()}@elu.app`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//elu//Buchung//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(event.start)}`,
    `DTEND:${toIcsUtc(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(event: CalendarEventInput, filename = 'elu-termin.ics') {
  const content = buildIcsContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toIcsUtc(event.start)}/${toIcsUtc(event.end)}`,
  });
  if (event.description) params.set('details', event.description);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
