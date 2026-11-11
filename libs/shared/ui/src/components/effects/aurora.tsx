import { cn } from '../../lib/cn';

/**
 * Soft animated gradient background used on hero / access-gate surfaces.
 * Lime, sky, violet blobs drifting with a long, low-motion cycle.
 */
export function Aurora({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 opacity-60 mix-blend-screen">
        <div className="absolute -top-32 left-1/4 h-[36rem] w-[36rem] rounded-full bg-[#C5F135]/30 blur-[120px] animate-[aurora-1_18s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-sky-400/30 blur-[110px] animate-[aurora-2_22s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-1/3 h-[32rem] w-[32rem] rounded-full bg-violet-500/25 blur-[120px] animate-[aurora-3_26s_ease-in-out_infinite]" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.7)_70%)]" />
    </div>
  );
}
