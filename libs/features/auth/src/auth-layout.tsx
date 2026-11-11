import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { cn, pickRandomHero } from '@app/ui';
import { AuthShowcase, type AuthShowcaseProps } from './auth-showcase';

function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="App"
      className={cn(
        'inline-flex items-baseline gap-1.5 text-foreground transition hover:opacity-80',
        className,
      )}
    >
      <span
        style={{ fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 800 }}
        className="text-2xl leading-none tracking-tight"
      >
        App.
      </span>
      <span className="text-base font-medium leading-none tracking-tight text-muted-foreground">
        Platform
      </span>
    </Link>
  );
}

export interface AuthLayoutProps {
  children: ReactNode;
  showcase?: AuthShowcaseProps;
  imageSrc?: string;
  className?: string;
}

export function AuthLayout({
  children,
  showcase,
  imageSrc,
  className,
}: AuthLayoutProps) {
  const [randomFallback] = useState(() => pickRandomHero());
  const resolvedImageSrc = imageSrc ?? randomFallback;
  const resolvedShowcase: AuthShowcaseProps = { imageSrc: resolvedImageSrc, ...showcase };

  return (
    <div
      className={cn(
        'relative flex min-h-dvh items-center justify-center overflow-x-hidden p-4 sm:overflow-hidden sm:p-6 lg:p-8',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-20 scale-110 bg-cover bg-center"
        style={{
          backgroundImage: `url(${resolvedImageSrc})`,
          filter: 'blur(10px) saturate(1.1)',
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/30 to-black/60"
      />

      <div className="relative w-full max-w-[1280px] rounded-3xl bg-background p-3 shadow-2xl ring-1 ring-white/10 lg:rounded-[28px] lg:p-4">
        <div className="grid grid-cols-1 gap-3 lg:min-h-[680px] lg:grid-cols-2 lg:gap-4">
          <section className="relative flex items-center justify-center px-5 pt-20 pb-10 sm:px-8 sm:pt-24 sm:pb-12 lg:px-12 lg:py-12">
            <BrandLogo className="absolute top-6 left-6 sm:top-8 sm:left-8 lg:top-10 lg:left-12" />
            <div className="w-full max-w-sm">{children}</div>
          </section>

          <AuthShowcase className="hidden lg:block" {...resolvedShowcase} />
        </div>
      </div>
    </div>
  );
}
