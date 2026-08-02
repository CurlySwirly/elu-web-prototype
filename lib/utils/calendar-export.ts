/** Build calendar export helpers (ICS + Google Calendar). */

export interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  uid?: string;
  allDay?: boolean;
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

function toIcsDateOnly(date: Date): string {
  return date.getFullYear().toString() + pad(date.getMonth() + 1) + pad(date.getDate());
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function eventToIcsLines(event: CalendarEventInput): string[] {
  const uid = event.uid || `${Date.now()}-${Math.random().toString(36).slice(2)}@elu.app`;
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${toIcsDateOnly(event.start)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDateOnly(event.end)}`);
  } else {
    lines.push(`DTSTART:${toIcsUtc(event.start)}`);
    lines.push(`DTEND:${toIcsUtc(event.end)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  lines.push('END:VEVENT');
  return lines;
}

export function buildIcsContent(event: CalendarEventInput): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//elu//Buchung//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventToIcsLines(event),
    'END:VCALENDAR',
  ].join('\r\n');
}

export function buildIcsCalendar(events: CalendarEventInput[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//elu//Expert Calendar//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event) => eventToIcsLines(event)),
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadIcsBlob(content: string, filename: string) {
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

export function downloadIcsFile(event: CalendarEventInput, filename = 'elu-termin.ics') {
  downloadIcsBlob(buildIcsContent(event), filename);
}

export function downloadIcsCalendar(events: CalendarEventInput[], filename = 'elu-kalender.ics') {
  downloadIcsBlob(buildIcsCalendar(events), filename);
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

function parseIcsDate(value: string): Date | null {
  const cleaned = value.trim();
  if (/^\d{8}$/.test(cleaned)) {
    const y = Number(cleaned.slice(0, 4));
    const m = Number(cleaned.slice(4, 6)) - 1;
    const d = Number(cleaned.slice(6, 8));
    return new Date(y, m, d);
  }
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) return null;
  const [, ys, ms, ds, hs, mins, ss, z] = match;
  if (z) {
    return new Date(Date.UTC(+ys, +ms - 1, +ds, +hs, +mins, +ss));
  }
  return new Date(+ys, +ms - 1, +ds, +hs, +mins, +ss);
}

/** Minimal ICS importer for VEVENT blocks */
export function parseIcsEvents(icsText: string): CalendarEventInput[] {
  const normalized = icsText.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const blocks = normalized.split('BEGIN:VEVENT').slice(1);
  const events: CalendarEventInput[] = [];

  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0] || '';
    const get = (key: string) => {
      const line = body
        .split('\n')
        .find((l) => l.startsWith(`${key}:`) || l.startsWith(`${key};`));
      if (!line) return '';
      return line.slice(line.indexOf(':') + 1).trim();
    };

    const startRaw = get('DTSTART');
    const endRaw = get('DTEND') || startRaw;
    const start = parseIcsDate(startRaw);
    const end = parseIcsDate(endRaw);
    if (!start || !end) continue;

    events.push({
      title:
        get('SUMMARY').replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';') ||
        'Importierter Termin',
      description:
        get('DESCRIPTION').replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';') ||
        undefined,
      location: get('LOCATION') || undefined,
      start,
      end,
      uid: get('UID') || undefined,
      allDay: /^\d{8}$/.test(startRaw),
    });
  }

  return events;
}
