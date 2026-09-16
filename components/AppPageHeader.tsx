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

/**
 * Page chrome under the global AppHeader.
 * Title + subtitle live in AppHeader (getAppPageMeta) – do not duplicate them here.
 */
export function AppPageHeader({
  title: _title,
  description: _description,
  action,
}: {
  /** @deprecated Visual title is in AppHeader; kept for call-site compatibility */
  title?: string;
  /** @deprecated Visual subtitle is in AppHeader; kept for call-site compatibility */
  description?: string;
  action?: ReactNode;
}) {
  if (!action) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-end gap-3">
      <div className="shrink-0 w-full sm:w-auto">{action}</div>
    </div>
  );
}
