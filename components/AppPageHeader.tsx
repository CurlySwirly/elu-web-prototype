import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Shared page chrome for authenticated app views (matches dashboard section scale). */
export function AppPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('p-3 sm:p-4 lg:p-5 space-y-4 max-w-7xl mx-auto', className)}>
      {children}
    </div>
  );
}

export function AppPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="font-heading text-lg sm:text-xl font-bold text-text-dark leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="font-body text-gray-500 text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 w-full sm:w-auto">{action}</div> : null}
    </div>
  );
}
