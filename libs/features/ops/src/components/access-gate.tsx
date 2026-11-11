import { ShieldAlert } from 'lucide-react';
import { Aurora, GradientText } from '@app/ui';

export function AccessGate({ message }: { message?: string }) {
  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-neutral-950 text-white">
      <Aurora />
      <div className="relative z-10 max-w-md rounded-2xl border border-white/10 bg-neutral-950/60 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-400/30">
          <ShieldAlert className="size-6 text-rose-300" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          <GradientText>Super-admin эрх</GradientText> шаардлагатай
        </h1>
        <p className="mt-2 text-sm text-white/60">
          {message ?? 'Энэ console-д зөвхөн платформын дотоод операторын эрхтэй хүн нэвтэрнэ.'}
        </p>
      </div>
    </div>
  );
}
