import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';

/**
 * Renders an animated shimmer band over the children — used to indicate
 * "live" status (system health, ingestion in progress, etc.).
 */
export function Shimmer({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        'relative inline-flex overflow-hidden rounded-full',
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
    </span>
  );
}
