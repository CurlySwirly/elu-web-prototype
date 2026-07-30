import { format } from 'date-fns';

export interface ExpertAvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface ExpertAbsence {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export interface BusyInterval {
  start: Date;
  end: Date;
  id?: string;
}

function parseTimeToMinutes(time: string): number {
  const normalized = time.slice(0, 5);
  const [h, m] = normalized.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isDateAbsent(date: Date, absences: ExpertAbsence[]): boolean {
  const day = format(date, 'yyyy-MM-dd');
  return absences.some((absence) => day >= absence.start_date && day <= absence.end_date);
}

export function hasAvailabilityOnDate(
  date: Date,
  availability: ExpertAvailabilitySlot[],
  absences: ExpertAbsence[] = []
): boolean {
  if (isDateAbsent(date, absences)) return false;
  const dayOfWeek = date.getDay();
  return availability.some(
    (slot) => slot.is_available !== false && slot.day_of_week === dayOfWeek
  );
}

/**
 * Build bookable start times for a day from expert weekly availability.
 * Slots must fully fit into an availability window and not overlap busy intervals.
 */
export function getAvailableTimeSlotsForDate(options: {
  date: Date;
  availability: ExpertAvailabilitySlot[];
  absences?: ExpertAbsence[];
  durationMinutes: number;
  busyIntervals?: BusyInterval[];
  stepMinutes?: number;
  now?: Date;
}): string[] {
  const {
    date,
    availability,
    absences = [],
    durationMinutes,
    busyIntervals = [],
    stepMinutes = 30,
    now = new Date(),
  } = options;

  if (durationMinutes <= 0) return [];
  if (isDateAbsent(date, absences)) return [];

  const dayOfWeek = date.getDay();
  const windows = availability.filter(
    (slot) => slot.is_available !== false && slot.day_of_week === dayOfWeek
  );

  if (windows.length === 0) return [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  const slots = new Set<string>();

  for (const window of windows) {
    const windowStart = parseTimeToMinutes(window.start_time);
    const windowEnd = parseTimeToMinutes(window.end_time);
    if (windowEnd - windowStart < durationMinutes) continue;

    for (
      let startMin = windowStart;
      startMin + durationMinutes <= windowEnd;
      startMin += stepMinutes
    ) {
      const slotStart = new Date(dayStart);
      slotStart.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

      if (isSameDay && slotStart <= now) continue;

      const overlapsBusy = busyIntervals.some(
        (busy) => slotStart < busy.end && slotEnd > busy.start
      );
      if (overlapsBusy) continue;

      slots.add(minutesToTimeLabel(startMin));
    }
  }

  return Array.from(slots).sort();
}
