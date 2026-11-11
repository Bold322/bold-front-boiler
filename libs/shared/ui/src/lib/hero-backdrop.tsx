import { useState } from 'react';
import { cn } from './cn';
import { pickRandomHero } from './hero-images';

export interface HeroBackdropProps {
  imageSrc?: string;
  blur?: number;
  overlay?: 'light' | 'dark' | 'none';
  className?: string;
}

export function HeroBackdrop({
  imageSrc,
  blur = 48,
  overlay = 'dark',
  className,
}: HeroBackdropProps) {
  // Stable random fallback used only when `imageSrc` is omitted.
  // If a caller passes an explicit src (even later via state), we use it directly,
  // so user-selected heroes update reactively.
  const [randomFallback] = useState(() => pickRandomHero());
  const resolvedSrc = imageSrc ?? randomFallback;

  return (
    <>
      <div
        aria-hidden="true"
        className={cn('absolute inset-0 -z-20 scale-110 bg-cover bg-center', className)}
        style={{
          backgroundImage: `url(${resolvedSrc})`,
          filter: `blur(${blur}px) saturate(1.1)`,
        }}
      />
      {overlay !== 'none' && (
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-0 -z-10',
            overlay === 'dark' &&
              'bg-gradient-to-b from-black/50 via-black/30 to-black/60',
            overlay === 'light' &&
              'bg-gradient-to-b from-white/30 via-white/10 to-white/40',
          )}
        />
      )}
    </>
  );
}
