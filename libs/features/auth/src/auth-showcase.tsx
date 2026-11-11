import { useState } from 'react';
import { Mic, Plus, Search, ArrowUp, Volume2 } from 'lucide-react';
import { cn, pickRandomHero } from '@app/ui';
import { useTypewriter } from './use-typewriter';

const DEFAULT_PROMPTS = [
  'Албан томилолтын зардлыг хэрхэн нөхөн төлдөг вэ?',
  'Эмнэлгийн чөлөөг хэрхэн авах вэ?',
  'Гэрээсээ ажиллах боломжтой юу?',
  'Хэтэрсэн цагийн нэмэлт цалинг яаж тооцох вэ?',
  'Шинэ ажилтны сургалт хэдэн өдөр үргэлжлэх вэ?',
];

export interface AuthShowcaseProps {
  imageSrc?: string;
  prompts?: readonly string[];
  ctaText?: string;
  className?: string;
}

export function AuthShowcase({
  imageSrc,
  prompts = DEFAULT_PROMPTS,
  ctaText = 'Үнэгүй туршаарай',
  className,
}: AuthShowcaseProps) {
  const [randomFallback] = useState(() => pickRandomHero());
  const resolvedSrc = imageSrc ?? randomFallback;
  const { text, isTyping } = useTypewriter(prompts);

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-2xl bg-neutral-200',
        'min-h-[560px] lg:min-h-full',
        className,
      )}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${resolvedSrc}), linear-gradient(180deg, #2a3f3a 0%, #d4a574 100%)`,
        }}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

      {/* The showcase is a non-interactive marketing preview — every control
          here is decorative (see STATUS.md). Disabled + removed from the tab
          order + aria-hidden so it never traps focus or misleads. */}
      <button
        type="button"
        disabled
        tabIndex={-1}
        aria-hidden="true"
        className="absolute top-5 left-5 flex size-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
      >
        <Volume2 className="size-5" />
      </button>

      <div className="absolute right-5 bottom-5 left-5 flex flex-col gap-2">
        <div className="rounded-2xl bg-white/95 p-4 shadow-2xl ring-1 ring-black/5 backdrop-blur dark:bg-neutral-900/95 dark:ring-white/5">
          <p
            className="min-h-[2.75rem] text-sm leading-relaxed text-neutral-700 dark:text-neutral-200"
            aria-live="polite"
          >
            {text}
            <span
              className={cn(
                'ml-0.5 inline-block h-4 w-[2px] -mb-0.5 translate-y-0.5 bg-neutral-700 dark:bg-neutral-200',
                isTyping ? 'animate-pulse' : 'opacity-0',
              )}
              aria-hidden="true"
            />
          </p>

          {/* inert: the preview composer's 5 controls are decorative only. */}
          <div inert className="mt-3 flex items-center gap-2">
            <button
              type="button"
              aria-label="Файл хавсаргах"
              className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <Plus className="size-4" />
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <Search className="size-3.5 text-emerald-500" />
              Search
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              App 1.0
              <span className="text-neutral-400">▾</span>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Дуу хүлээж авах"
                className="flex size-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Mic className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Илгээх"
                className="flex size-9 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/90 drop-shadow">
          {ctaText}
        </p>
      </div>
    </div>
  );
}
