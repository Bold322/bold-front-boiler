import type { MouseEvent, PropsWithChildren } from 'react';
import { useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export interface SpotlightCardProps {
  className?: string;
  /** Accent color used by the spotlight gradient. Defaults to lime. */
  accent?: string;
}

export function SpotlightCard({
  children,
  className,
  accent = '197 241 53',
}: PropsWithChildren<SpotlightCardProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [opacity, setOpacity] = useState(0);

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setOpacity(0.45)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]',
        'transition-colors hover:border-white/20',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, rgba(${accent} / 0.18), transparent 60%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
