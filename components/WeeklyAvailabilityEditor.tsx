'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WeeklyAvailabilitySlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available?: boolean;
};

type WeeklyAvailabilityEditorProps = {
  slots: WeeklyAvailabilitySlot[];
  onCreate: (slot: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  }) => void | Promise<void>;
  onDelete: (slotId: string) => void | Promise<void>;
  disabled?: boolean;
};

const HOUR_START = 7;
const HOUR_END = 21;
const HOUR_HEIGHT = 48;
const QUARTER_HEIGHT = HOUR_HEIGHT / 4;
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;
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
        <span className="absolute -top-2 right-1.5 text-[10px] font-body text-gray-400 z-[1]">
          {pad(hour)}:00
        </span>
      ) : null}
    </div>
  );
}

/** Mon → Sun with JS day_of_week (0 = Sunday) */
const WEEK_DAYS = [
  { value: 1, full: 'Montag' },
  { value: 2, full: 'Dienstag' },
  { value: 3, full: 'Mittwoch' },
  { value: 4, full: 'Donnerstag' },
  { value: 5, full: 'Freitag' },
  { value: 6, full: 'Samstag' },
  { value: 0, full: 'Sonntag' },
];

function minutesToTime(totalMinutes: number) {
  const clamped = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${pad(h)}:${pad(m)}`;
}

function timeToMinutes(time: string) {
  const [h, m] = time.substring(0, 5).split(':').map(Number);
  return h * 60 + (m || 0);
}

function snapMinutes(value: number) {
  return Math.round(value / SNAP_MINUTES) * SNAP_MINUTES;
}

function yToMinutes(y: number, columnHeight: number) {
  const totalMinutes = (HOUR_END - HOUR_START) * 60;
  const ratio = Math.max(0, Math.min(1, y / columnHeight));
  return snapMinutes(HOUR_START * 60 + ratio * totalMinutes);
}

function slotStyle(startTime: string, endTime: string) {
  const startMin = Math.max(timeToMinutes(startTime), HOUR_START * 60);
  const endMin = Math.min(timeToMinutes(endTime), HOUR_END * 60);
  const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);
  return { top, height };
}

type DragState = {
  dayOfWeek: number;
  anchorMinutes: number;
  currentMinutes: number;
};

type ContextMenuState = {
  x: number;
  y: number;
  slotId: string;
};

export function WeeklyAvailabilityEditor({
  slots,
  onCreate,
  onDelete,
  disabled = false,
}: WeeklyAvailabilityEditorProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const columnRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const creatingRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    if (!contextMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    const onPointer = () => closeContextMenu();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [contextMenu, closeContextMenu]);

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const col = columnRefs.current[current.dayOfWeek];
      if (!col) return;
      const rect = col.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const next = {
        ...current,
        currentMinutes: yToMinutes(y, rect.height),
      };
      dragRef.current = next;
      setDrag(next);
    };

    const onUp = async () => {
      const current = dragRef.current;
      setDrag(null);
      dragRef.current = null;
      if (!current || creatingRef.current || disabled) return;

      const start = Math.min(current.anchorMinutes, current.currentMinutes);
      const end = Math.max(current.anchorMinutes, current.currentMinutes);
      if (end - start < MIN_DURATION_MINUTES) return;

      creatingRef.current = true;
      try {
        await onCreate({
          day_of_week: current.dayOfWeek,
          start_time: minutesToTime(start),
          end_time: minutesToTime(end),
        });
      } finally {
        creatingRef.current = false;
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // Only rebind when a drag session starts/stops — not on every move update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null, disabled, onCreate]);

  const startDrag = (dayOfWeek: number, clientY: number) => {
    if (disabled) return;
    const col = columnRefs.current[dayOfWeek];
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const minutes = yToMinutes(clientY - rect.top, rect.height);
    setContextMenu(null);
    const next = {
      dayOfWeek,
      anchorMinutes: minutes,
      currentMinutes: minutes,
    };
    dragRef.current = next;
    setDrag(next);
  };

  const preview =
    drag &&
    (() => {
      const start = Math.min(drag.anchorMinutes, drag.currentMinutes);
      const end = Math.max(drag.anchorMinutes, drag.currentMinutes);
      if (end - start < 5) return null;
      return {
        dayOfWeek: drag.dayOfWeek,
        start_time: minutesToTime(start),
        end_time: minutesToTime(Math.max(end, start + MIN_DURATION_MINUTES)),
      };
    })();

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div
          className="min-w-[640px]"
          style={{
            display: 'grid',
            gridTemplateColumns: `52px repeat(7, minmax(0, 1fr))`,
          }}
        >
          <div className="border-b border-gray-200" />
          {WEEK_DAYS.map((day) => (
            <div
              key={`head-${day.value}`}
              className="border-b border-l border-gray-200 px-1 py-2 text-center"
            >
              <div className="text-xs font-body font-medium text-gray-600">{day.full}</div>
            </div>
          ))}

          <div className="relative border-r border-gray-100">
            {HOURS.map((hour) => (
              <HourGridLines key={hour} hour={hour} showLabel />
            ))}
          </div>

          {WEEK_DAYS.map((day) => {
            const daySlots = slots.filter((s) => s.day_of_week === day.value);
            return (
              <div
                key={`col-${day.value}`}
                ref={(el) => {
                  columnRefs.current[day.value] = el;
                }}
                className={cn(
                  'relative border-l border-gray-100 select-none',
                  !disabled && 'cursor-pointer'
                )}
                style={{ height: HOURS.length * HOUR_HEIGHT }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  if ((e.target as HTMLElement).closest('[data-avail-slot]')) return;
                  e.preventDefault();
                  startDrag(day.value, e.clientY);
                }}
              >
                <div className="pointer-events-none absolute inset-0">
                  {HOURS.map((hour) => (
                    <HourGridLines key={hour} hour={hour} />
                  ))}
                </div>

                {daySlots.map((slot) => {
                  const style = slotStyle(slot.start_time, slot.end_time);
                  return (
                    <div
                      key={slot.id}
                      data-avail-slot
                      role="button"
                      tabIndex={0}
                      className="absolute left-1 right-1 rounded-md border border-primary-blue/40 bg-primary-blue/20 px-1.5 py-1 overflow-hidden z-10 cursor-pointer"
                      style={{ top: style.top, height: style.height }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (disabled) return;
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          slotId: slot.id,
                        });
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <p className="text-[10px] sm:text-[11px] font-heading font-semibold text-text-dark leading-tight truncate">
                        {slot.start_time.substring(0, 5)}–{slot.end_time.substring(0, 5)}
                      </p>
                      <p className="text-[9px] text-gray-600 font-body truncate hidden sm:block">
                        Verfügbar
                      </p>
                    </div>
                  );
                })}

                {preview && preview.dayOfWeek === day.value && (
                  <div
                    className="absolute left-1 right-1 rounded-md border border-dashed border-primary-green bg-primary-green/25 px-1.5 py-1 overflow-hidden z-20 pointer-events-none"
                    style={slotStyle(preview.start_time, preview.end_time)}
                  >
                    <p className="text-[10px] font-heading font-semibold text-text-dark leading-tight">
                      {preview.start_time}–{preview.end_time}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-body text-red-600 hover:bg-red-50"
            onClick={() => {
              const id = contextMenu.slotId;
              closeContextMenu();
              void onDelete(id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Löschen
          </button>
        </div>
      )}
    </div>
  );
}
