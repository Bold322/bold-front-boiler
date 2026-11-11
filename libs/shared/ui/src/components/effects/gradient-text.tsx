import type { ElementType, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface GradientTextProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Tailwind from/via/to classes — defaults to lime → sky. */
  gradient?: string;
}

export function GradientText({
  children,
  as: Tag = 'span',
  className,
  gradient = 'from-[#C5F135] via-emerald-300 to-sky-300',
}: GradientTextProps) {
  return (
    <Tag
      className={cn(
        'bg-clip-text text-transparent bg-gradient-to-r',
        gradient,
        className,
      )}
    >
      {children}
    </Tag>
  );
}
