import { animate, useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

export interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
  /** Don't animate, render the final value immediately. Useful for SSR / a11y prefs. */
  immediate?: boolean;
}

const defaultFormat = (value: number) => Math.round(value).toLocaleString('mn-MN');

export function CountUp({
  to,
  from = 0,
  duration = 1.2,
  format = defaultFormat,
  className,
  immediate = false,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [display, setDisplay] = useState(() => format(immediate ? to : from));

  useEffect(() => {
    if (!inView || immediate) {
      setDisplay(format(to));
      return;
    }
    const controls = animate(from, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    return () => controls.stop();
  }, [from, to, duration, format, inView, immediate]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
