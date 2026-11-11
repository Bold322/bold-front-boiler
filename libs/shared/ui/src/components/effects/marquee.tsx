import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';

export interface MarqueeProps {
  /** Time for one loop (s). Lower = faster. */
  durationSec?: number;
  reverse?: boolean;
  className?: string;
  pauseOnHover?: boolean;
}

/**
 * Infinite horizontal marquee. The children are duplicated so the loop is
 * seamless — make sure the rendered content is at least viewport-wide.
 */
export function Marquee({
  children,
  durationSec = 40,
  reverse = false,
  className,
  pauseOnHover = true,
}: PropsWithChildren<MarqueeProps>) {
  return (
    <div className={cn('group relative flex overflow-hidden', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center gap-8 pr-8 will-change-transform',
          reverse ? 'animate-[marquee-reverse_var(--marquee-duration)_linear_infinite]' : 'animate-[marquee_var(--marquee-duration)_linear_infinite]',
          pauseOnHover && 'group-hover:[animation-play-state:paused]',
        )}
        style={{ '--marquee-duration': `${durationSec}s` } as React.CSSProperties}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          'flex shrink-0 items-center gap-8 pr-8 will-change-transform',
          reverse ? 'animate-[marquee-reverse_var(--marquee-duration)_linear_infinite]' : 'animate-[marquee_var(--marquee-duration)_linear_infinite]',
          pauseOnHover && 'group-hover:[animation-play-state:paused]',
        )}
        style={{ '--marquee-duration': `${durationSec}s` } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
