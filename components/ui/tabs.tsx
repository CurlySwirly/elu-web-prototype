'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

/** Shared segmented-control / pill-toggle look used across the app. */
export const segmentTrackClass =
  'inline-flex h-auto items-center justify-center gap-0.5 rounded-full bg-gray-100 p-0.5 text-gray-500';

export const segmentItemClass =
  'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-body font-medium text-gray-500 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-text-dark data-[state=active]:bg-white data-[state=active]:text-text-dark data-[state=active]:font-semibold data-[state=active]:shadow-sm';

/** For custom <button> toggles that mirror TabsTrigger active state. */
export function segmentButtonClass(active: boolean) {
  return cn(
    'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-body font-medium transition-all',
    active
      ? 'bg-white text-text-dark font-semibold shadow-sm'
      : 'text-gray-500 hover:text-text-dark'
  );
}

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(segmentTrackClass, className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(segmentItemClass, className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
