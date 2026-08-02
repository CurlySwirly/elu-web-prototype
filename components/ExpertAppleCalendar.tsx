'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Unlock,
  X,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  downloadIcsCalendar,
  parseIcsEvents,
  type CalendarEventInput,
} from '@/lib/utils/calendar-export';

export type CalendarViewMode = 'day' | 'week' | 'month';

export type ExpertCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'amber';
  synced?: boolean;
  source?: 'elu' | 'external';
  meta?: string;
  /** Extra lines shown in the hover preview */
  hoverLines?: string[];
};

type ExpertAppleCalendarProps = {
  events: ExpertCalendarEvent[];
  onSelectEvent?: (eventId: string) => void;
  onAddEvent?: () => void;
  onImportEvents?: (events: CalendarEventInput[]) => void;
  syncEnabled: boolean;
  onSyncEnabledChange: (enabled: boolean) => void;
  /** Month view: whether a calendar day is blocked */
  isDayBlocked?: (date: Date) => boolean;
  /** Month view: block a single day (right-click) */
  onBlockDay?: (date: Date) => void;
  /** Month view: unblock a day (right-click) */
  onUnblockDay?: (date: Date) => void;
};

const HOUR_START = 7;
const HOUR_END = 21;
const HOUR_HEIGHT = 56;
const QUARTER_HEIGHT = HOUR_HEIGHT / 4;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function HourGridLines({ showLabel, hour }: { showLabel?: boolean; hour: number }) {
  return (
    <div className="relative border-b border-gray-200" style={{ height: HOUR_HEIGHT }}>
      {[1, 2, 3].map((quarter) => (
        <div
          key={quarter}
          className={cn(
            'absolute left-0 right-0 border-b pointer-events-none',
            quarter === 2 ? 'border-gray-100' : 'border-gray-50'
          )}
          style={{ top: quarter * QUARTER_HEIGHT }}
        />
      ))}
      {showLabel ? (
        <span className="absolute -top-2 right-2 text-[10px] font-body text-gray-400 z-[1]">
          {pad(hour)}:00
        </span>
      ) : null}
    </div>
  );
}

const COLOR_STYLES: Record<
  NonNullable<ExpertCalendarEvent['color']>,
  { bar: string; bg: string; text: string }
> = {
  blue: {
    bar: 'bg-primary-blue',
    bg: 'bg-primary-blue/25',
    text: 'text-text-dark',
  },
  green: {
    bar: 'bg-primary-green',
    bg: 'bg-primary-green/25',
    text: 'text-text-dark',
  },
  purple: {
    bar: 'bg-[#8B7CF6]',
    bg: 'bg-[#8B7CF6]/20',
    text: 'text-text-dark',
  },
  amber: {
    bar: 'bg-amber-500',
    bg: 'bg-amber-100',
    text: 'text-amber-950',
  },
};

function minutesFromDayStart(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

type LaidOutTimedEvent = {
  event: ExpertCalendarEvent;
  top: number;
  height: number;
  columnIndex: number;
  columnCount: number;
};

/** Pack overlapping events into side-by-side columns (calendar lane layout). */
function layoutTimedEvents(dayEvents: ExpertCalendarEvent[]): LaidOutTimedEvent[] {
  const items = dayEvents
    .map((event) => {
      const startMin = Math.max(minutesFromDayStart(event.start), HOUR_START * 60);
      const endMin = Math.min(minutesFromDayStart(event.end), HOUR_END * 60);
      const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
      const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 22);
      return {
        event,
        startMin,
        endMin: Math.max(endMin, startMin + 1),
        top,
        height,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const columnEnds: number[] = [];
  const withCols: Array<(typeof items)[number] & { columnIndex: number }> = [];

  for (const item of items) {
    let col = columnEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(item.endMin);
    } else {
      columnEnds[col] = item.endMin;
    }
    withCols.push({ ...item, columnIndex: col });
  }

  const result: LaidOutTimedEvent[] = [];
  let cluster: typeof withCols = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnCount = Math.max(...cluster.map((c) => c.columnIndex)) + 1;
    for (const c of cluster) {
      result.push({
        event: c.event,
        top: c.top,
        height: c.height,
        columnIndex: c.columnIndex,
        columnCount,
      });
    }
    cluster = [];
  };

  for (const item of withCols) {
    if (cluster.length > 0 && item.startMin < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      flushCluster();
      cluster = [item];
      clusterEnd = item.endMin;
    }
  }
  flushCluster();

  return result;
}

export function ExpertAppleCalendar({
  events,
  onSelectEvent,
  onAddEvent,
  onImportEvents,
  syncEnabled,
  onSyncEnabledChange,
  isDayBlocked,
  onBlockDay,
  onUnblockDay,
}: ExpertAppleCalendarProps) {
  const [view, setView] = useState<CalendarViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [syncOpen, setSyncOpen] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [dayMenu, setDayMenu] = useState<{
    x: number;
    y: number;
    day: Date;
    blocked: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeDayMenu = useCallback(() => setDayMenu(null), []);

  useEffect(() => {
    if (!dayMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDayMenu();
    };
    const onPointer = () => closeDayMenu();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [dayMenu, closeDayMenu]);

  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(anchorDate, { weekStartsOn: 1 }),
  });

  const titleLabel = useMemo(() => {
    if (view === 'day') {
      return format(anchorDate, 'd. MMMM yyyy', { locale: de });
    }
    if (view === 'week') {
      return format(weekStart, 'MMMM yyyy', { locale: de });
    }
    return format(anchorDate, 'MMMM yyyy', { locale: de });
  }, [anchorDate, view, weekStart]);

  const goPrev = () => {
    if (view === 'day') setAnchorDate((d) => addDays(d, -1));
    else if (view === 'week') setAnchorDate((d) => subWeeks(d, 1));
    else setAnchorDate((d) => subMonths(d, 1));
  };

  const goNext = () => {
    if (view === 'day') setAnchorDate((d) => addDays(d, 1));
    else if (view === 'week') setAnchorDate((d) => addWeeks(d, 1));
    else setAnchorDate((d) => addMonths(d, 1));
  };

  const handleExport = () => {
    const payload: CalendarEventInput[] = events.map((e) => ({
      title: e.title,
      description: e.meta,
      start: e.start,
      end: e.end,
      uid: e.id,
      allDay: e.allDay,
    }));
    downloadIcsCalendar(payload, `elu-kalender-${format(new Date(), 'yyyy-MM-dd')}.ics`);
    setImportMessage('Kalender als ICS exportiert.');
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseIcsEvents(text);
    if (parsed.length === 0) {
      setImportMessage('Keine Termine in der Datei gefunden.');
      return;
    }
    onImportEvents?.(parsed);
    setImportMessage(`${parsed.length} Termin(e) importiert.`);
  };

  const dayColumns = view === 'day' ? [anchorDate] : weekDays;

  const renderEventHover = (event: ExpertCalendarEvent, trigger: ReactNode) => {
    const timeLabel = event.allDay
      ? 'Ganztägig'
      : `${format(event.start, 'HH:mm')} – ${format(event.end, 'HH:mm')} Uhr`;
    const lines = [
      timeLabel,
      ...(event.hoverLines || []),
      ...(event.meta && !(event.hoverLines || []).includes(event.meta) ? [event.meta] : []),
    ].filter(Boolean);

    return (
      <HoverCard openDelay={120} closeDelay={80}>
        <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="w-64 p-3 font-body border-gray-200 shadow-lg"
        >
          <p className="font-heading text-sm font-semibold text-text-dark leading-snug">
            {event.title}
          </p>
          <ul className="mt-1.5 space-y-1">
            {lines.map((line, index) => (
              <li key={`${event.id}-line-${index}`} className="text-xs text-gray-600 leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-gray-400">Klicken für Details</p>
        </HoverCardContent>
      </HoverCard>
    );
  };

  const renderTimedEvent = ({
    event,
    top,
    height,
    columnIndex,
    columnCount,
  }: LaidOutTimedEvent) => {
    const color = COLOR_STYLES[event.color || 'blue'];
    const widthPct = 100 / columnCount;
    const leftPct = columnIndex * widthPct;
    return (
      <div
        key={event.id}
        className="absolute z-[1] px-0.5"
        style={{
          top,
          height,
          left: `${leftPct}%`,
          width: `${widthPct}%`,
        }}
      >
        {renderEventHover(
          event,
          <button
            type="button"
            onClick={() => onSelectEvent?.(event.id)}
            className={cn(
              'flex h-full w-full rounded-md overflow-hidden text-left shadow-sm border border-white/60 isolate',
              color.bg,
              color.text
            )}
          >
            <span className={cn('w-1.5 shrink-0', color.bar)} aria-hidden />
            <span className="min-w-0 flex-1 px-1.5 py-1 overflow-hidden">
              <span className="flex items-start justify-between gap-1">
                <span className="block font-heading text-[11px] font-semibold leading-tight truncate">
                  {event.title}
                </span>
                {(event.synced || event.source === 'external') && (
                  <RefreshCw
                    className="w-3 h-3 shrink-0 opacity-70 mt-0.5"
                    aria-label="Synchronisiert"
                  />
                )}
              </span>
              {height > 34 && (
                <span className="block text-[10px] font-body opacity-80 mt-0.5 truncate">
                  {format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}
                </span>
              )}
            </span>
          </button>
        )}
      </div>
    );
  };

  const allDayForDay = (day: Date) =>
    events.filter((e) => e.allDay && isSameDay(e.start, day));

  const laidOutTimedForDay = (day: Date) =>
    layoutTimedEvents(events.filter((e) => !e.allDay && isSameDay(e.start, day)));

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 }),
  });

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="relative border-b border-gray-200 px-3 sm:px-4 py-3">
        {onAddEvent ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-3 left-3 sm:left-4 h-8 w-8 rounded-full z-10"
            onClick={onAddEvent}
            aria-label="Termin hinzufügen"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        ) : null}

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 justify-self-start">
            {(
              [
                { id: 'day', label: 'Tag' },
                { id: 'week', label: 'Woche' },
                { id: 'month', label: 'Monat' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  'px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-body rounded-md transition-colors',
                  view === item.id
                    ? 'bg-white text-text-dark shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-text-dark'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <h2 className="font-heading text-xl sm:text-2xl font-bold text-text-dark tracking-tight capitalize text-center truncate px-1">
            {titleLabel}
          </h2>

          <div className="flex items-center gap-2 justify-self-end">
            <div className="inline-flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={goPrev}
                className="h-9 w-9 flex items-center justify-center hover:bg-gray-50 text-gray-600"
                aria-label="Zurück"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="h-9 w-9 flex items-center justify-center hover:bg-gray-50 text-gray-600 border-l border-gray-200"
                aria-label="Weiter"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full shrink-0"
              onClick={() => setSyncOpen(true)}
              aria-label="Kalender synchronisieren"
              title="Kalender synchronisieren"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {view !== 'month' ? (
        <div className="overflow-x-auto">
          <div
            className="min-w-[720px]"
            style={{
              display: 'grid',
              gridTemplateColumns: `56px repeat(${dayColumns.length}, minmax(0, 1fr))`,
            }}
          >
            {/* Day headers */}
            <div className="border-b border-gray-200" />
            {dayColumns.map((day) => {
              const today = isSameDay(day, new Date());
              return (
                <div
                  key={`head-${day.toISOString()}`}
                  className="border-b border-l border-gray-200 px-2 py-2 text-center"
                >
                  <div
                    className={cn(
                      'text-xs font-body text-gray-500',
                      today && 'text-primary-blue font-semibold'
                    )}
                  >
                    {format(day, 'EE', { locale: de })}
                  </div>
                  <div
                    className={cn(
                      'mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full font-heading text-lg font-semibold',
                      today ? 'bg-primary-blue text-white' : 'text-text-dark'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}

            {/* All-day row */}
            <div className="border-b border-gray-200 px-1 py-2 text-[10px] font-body text-gray-400 text-right pr-2">
              Ganztägig
            </div>
            {dayColumns.map((day) => (
              <div
                key={`allday-${day.toISOString()}`}
                className="border-b border-l border-gray-200 min-h-[36px] px-1 py-1 flex flex-col gap-1"
              >
                {allDayForDay(day).map((event) => {
                  const color = COLOR_STYLES[event.color || 'green'];
                  return renderEventHover(
                    event,
                    <button
                      type="button"
                      onClick={() => onSelectEvent?.(event.id)}
                      className={cn(
                        'w-full rounded-full px-2 py-0.5 text-left text-[11px] font-heading font-semibold truncate flex items-center gap-1',
                        color.bg,
                        color.text
                      )}
                    >
                      <span className="truncate flex-1">{event.title}</span>
                      {(event.synced || event.source === 'external') && (
                        <RefreshCw className="w-3 h-3 shrink-0 opacity-70" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Time grid */}
            <div className="relative border-r border-gray-100">
              {HOURS.map((hour) => (
                <HourGridLines key={hour} hour={hour} showLabel />
              ))}
            </div>

            {dayColumns.map((day) => (
              <div
                key={`grid-${day.toISOString()}`}
                className="relative border-l border-gray-100 isolate"
                style={{ height: HOURS.length * HOUR_HEIGHT }}
              >
                <div className="pointer-events-none absolute inset-0">
                  {HOURS.map((hour) => (
                    <HourGridLines key={hour} hour={hour} />
                  ))}
                </div>
                {laidOutTimedForDay(day).map(renderTimedEvent)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 sm:p-4">
          <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
              <div
                key={d}
                className="bg-gray-50 py-2 text-center text-xs font-body font-medium text-gray-500"
              >
                {d}
              </div>
            ))}
            {monthDays.map((day) => {
              const dayEvents = events.filter(
                (e) => isSameDay(e.start, day) && e.color !== 'amber'
              );
              const inMonth = isSameMonth(day, anchorDate);
              const today = isSameDay(day, new Date());
              const blocked = Boolean(isDayBlocked?.(day));
              const canToggleBlock = Boolean(onBlockDay || onUnblockDay);
              const canBlock = inMonth && Boolean(onBlockDay) && !blocked;
              const canUnblock = inMonth && Boolean(onUnblockDay) && blocked;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[88px] bg-white p-1.5 text-left relative',
                    !inMonth && 'bg-gray-50/80 text-gray-400',
                    blocked && 'bg-amber-50'
                  )}
                  onContextMenu={(e) => {
                    if (!canToggleBlock || !inMonth) return;
                    e.preventDefault();
                    setDayMenu({
                      x: e.clientX,
                      y: e.clientY,
                      day,
                      blocked,
                    });
                  }}
                >
                  <div className="flex items-start justify-between gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAnchorDate(day);
                        setView('day');
                      }}
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-heading font-semibold hover:bg-gray-100',
                        today && 'bg-primary-blue text-white hover:bg-primary-blue',
                        blocked && !today && 'text-amber-900'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                    {canBlock || canUnblock ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={blocked ? 'Tag entsperren' : 'Tag sperren'}
                            className={cn(
                              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors',
                              blocked && 'text-amber-500 hover:text-amber-700 hover:bg-amber-100'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (blocked) onUnblockDay?.(day);
                              else onBlockDay?.(day);
                            }}
                          >
                            <X className="w-3 h-3" strokeWidth={2.5} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-body text-xs">
                          {blocked ? 'Tag entsperren' : 'Tag sperren'}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                  {blocked && (
                    <span className="text-[9px] font-body text-amber-800 leading-none">
                      Gesperrt
                    </span>
                  )}
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) =>
                      renderEventHover(
                        event,
                        <button
                          type="button"
                          onClick={() => onSelectEvent?.(event.id)}
                          className={cn(
                            'w-full truncate rounded px-1 text-left text-[10px] font-body',
                            COLOR_STYLES[event.color || 'blue'].bg
                          )}
                        >
                          {event.title}
                        </button>
                      )
                    )}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-400 font-body pl-1">
                        +{dayEvents.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </TooltipProvider>
        </div>
      )}

      {dayMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ left: dayMenu.x, top: dayMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {dayMenu.blocked ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-body text-text-dark hover:bg-gray-50"
              onClick={() => {
                const day = dayMenu.day;
                closeDayMenu();
                onUnblockDay?.(day);
              }}
            >
              <Unlock className="w-3.5 h-3.5 text-primary-blue" />
              Tag entsperren
            </button>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-body text-text-dark hover:bg-gray-50"
              onClick={() => {
                const day = dayMenu.day;
                closeDayMenu();
                onBlockDay?.(day);
              }}
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              Tag sperren
            </button>
          )}
        </div>
      )}

      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="font-body sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Kalender synchronisieren</DialogTitle>
            <DialogDescription>
              Verbinde elu mit deinem eigenen Kalender per Import und Export (ICS).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
              <div>
                <p className="font-heading font-semibold text-text-dark text-sm">
                  Sync aktivieren
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Importierte Termine werden im Kalender mit Sync-Symbol angezeigt.
                </p>
              </div>
              <Switch checked={syncEnabled} onCheckedChange={onSyncEnabledChange} />
            </div>

            <div className="space-y-2">
              <Label className="font-body">Exportieren</Label>
              <p className="text-xs text-gray-500">
                Alle elu-Termine als ICS-Datei speichern (Apple Kalender, Google, Outlook).
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full font-body"
                onClick={handleExport}
                disabled={!syncEnabled && events.length === 0}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Kalender exportieren (.ics)
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="font-body">Importieren</Label>
              <p className="text-xs text-gray-500">
                ICS-Datei aus deinem Kalender laden – Termine erscheinen als externe Events.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,text/calendar"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void handleImportFile(file);
                }}
              />
              <Button
                type="button"
                className="w-full font-body bg-gradient-to-r from-primary-blue to-primary-green text-white"
                onClick={() => {
                  if (!syncEnabled) onSyncEnabledChange(true);
                  fileInputRef.current?.click();
                }}
              >
                Kalender importieren (.ics)
              </Button>
            </div>

            {importMessage && (
              <p className="text-sm text-primary-blue font-body">{importMessage}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSyncOpen(false)}>
              Fertig
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
