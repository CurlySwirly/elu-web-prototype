'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { segmentButtonClass, segmentTrackClass } from '@/components/ui/tabs';

export type FinanceChartMode = 'month' | 'week';

export type FinanceChartRow = {
  label: string;
  paid: number;
  expected: number;
};

function formatEuroDe(amount: number) {
  return amount.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

export function FinanceOverviewChart({
  data,
  selectedIndex,
  onSelectIndex,
  mode = 'month',
  onModeChange,
}: {
  data: FinanceChartRow[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  mode?: FinanceChartMode;
  onModeChange?: (mode: FinanceChartMode) => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxValue = useMemo(() => {
    const peak = Math.max(0, ...data.map((d) => d.paid + d.expected));
    return peak > 0 ? peak : 1;
  }, [data]);

  const yTicks = useMemo(() => {
    const step = maxValue / 4;
    return [0, 1, 2, 3, 4].map((i) => Math.round(step * i));
  }, [maxValue]);

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const isWeek = mode === 'week';

  return (
    <div className="w-full">
      {onModeChange && (
        <div className="flex justify-end mb-3 px-1">
          <div className={cn(segmentTrackClass)}>
            {(
              [
                { id: 'week' as const, label: 'Woche' },
                { id: 'month' as const, label: 'Monat' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onModeChange(opt.id)}
                className={segmentButtonClass(mode === opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative h-[220px] sm:h-[260px] w-full flex">
        <div className="w-10 sm:w-12 shrink-0 flex flex-col justify-between py-1 pr-1">
          {[...yTicks].reverse().map((tick) => (
            <span
              key={tick}
              className="text-[10px] sm:text-[11px] text-gray-400 font-body leading-none text-right tabular-nums"
            >
              {tick}€
            </span>
          ))}
        </div>

        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yTicks.map((tick) => (
              <div key={tick} className="border-t border-dashed border-gray-200 w-full" />
            ))}
          </div>

          <div
            className={cn(
              'absolute inset-0 flex items-end px-0.5',
              isWeek ? 'gap-0.5 sm:gap-1 overflow-x-auto' : 'gap-1.5 sm:gap-2'
            )}
          >
            {data.map((row, index) => {
              const total = row.paid + row.expected;
              const totalH = total > 0 ? `${(total / maxValue) * 100}%` : '0%';
              const paidShare = total > 0 ? (row.paid / total) * 100 : 0;
              const expectedShare = total > 0 ? (row.expected / total) * 100 : 0;
              const isSelected = index === selectedIndex;
              const dimmed = hoverIndex !== null && hoverIndex !== index;
              return (
                <button
                  key={`${row.label}-${index}`}
                  type="button"
                  className={cn(
                    'h-full flex items-end justify-center cursor-pointer bg-transparent border-0 p-0',
                    isWeek ? 'min-w-[14px] flex-1' : 'flex-1 min-w-0'
                  )}
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onClick={() => onSelectIndex(index)}
                  aria-pressed={isSelected}
                  aria-label={`${row.label} auswählen`}
                >
                  <div
                    className={cn(
                      'flex flex-col justify-end overflow-hidden rounded-t-sm transition-opacity',
                      isWeek
                        ? 'w-[80%] max-w-[16px]'
                        : 'w-[70%] max-w-[22px] sm:max-w-[28px]',
                      dimmed && 'opacity-40'
                    )}
                    style={{ height: totalH, minHeight: total > 0 ? 2 : 0 }}
                    title={`Ausgezahlt: ${formatEuroDe(row.paid)} · Erwartet: ${formatEuroDe(row.expected)}`}
                  >
                    {row.expected > 0 && (
                      <div
                        className="w-full bg-gray-300"
                        style={{
                          height: `${expectedShare}%`,
                          minHeight: row.expected > 0 && paidShare === 0 ? 2 : undefined,
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                          borderBottomLeftRadius: row.paid > 0 ? 0 : 4,
                          borderBottomRightRadius: row.paid > 0 ? 0 : 4,
                        }}
                      />
                    )}
                    {row.paid > 0 && (
                      <div
                        className="w-full bg-primary-green"
                        style={{
                          height: `${paidShare}%`,
                          minHeight: row.paid > 0 && expectedShare === 0 ? 2 : undefined,
                          borderTopLeftRadius: row.expected > 0 ? 0 : 4,
                          borderTopRightRadius: row.expected > 0 ? 0 : 4,
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {hovered && (
            <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md font-body text-xs pointer-events-none">
              <p className="font-heading font-semibold text-text-dark mb-1">{hovered.label}</p>
              <p className="text-gray-600">
                Ausgezahlt:{' '}
                <span className="font-medium text-text-dark">{formatEuroDe(hovered.paid)}</span>
              </p>
              <p className="text-gray-600">
                Erwartet:{' '}
                <span className="font-medium text-text-dark">
                  {formatEuroDe(hovered.expected)}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          'flex ml-10 sm:ml-12 mt-2',
          isWeek ? 'gap-0.5 sm:gap-1 overflow-x-auto' : 'gap-1.5 sm:gap-2'
        )}
      >
        {data.map((row, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={`${row.label}-lbl-${index}`}
              type="button"
              onClick={() => onSelectIndex(index)}
              className={cn(
                'min-w-0 text-center text-[9px] sm:text-[11px] font-body truncate py-0.5 rounded-full transition-colors',
                isWeek ? 'flex-1 min-w-[14px]' : 'flex-1',
                isSelected
                  ? 'bg-white text-text-dark font-medium shadow-sm'
                  : 'text-gray-400 hover:text-text-dark'
              )}
            >
              {isWeek ? row.label.replace('KW ', '') : row.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-5 mt-4 text-xs font-body text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary-green" />
          Ausgezahlt
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-300" />
          Erwartet
        </div>
      </div>
    </div>
  );
}
