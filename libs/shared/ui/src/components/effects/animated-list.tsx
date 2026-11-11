import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export interface AnimatedListProps<T> {
  items: T[];
  getKey: (item: T, index: number) => string;
  render: (item: T, index: number) => ReactNode;
  /** Stagger delay between items in seconds. */
  stagger?: number;
  className?: string;
}

export function AnimatedList<T>({
  items,
  getKey,
  render,
  stagger = 0.04,
  className,
}: AnimatedListProps<T>) {
  return (
    <div className={className}>
      {items.map((item, i) => (
        <motion.div
          key={getKey(item, i)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * stagger, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {render(item, i)}
        </motion.div>
      ))}
    </div>
  );
}
