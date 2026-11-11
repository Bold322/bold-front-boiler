import type { ServiceStatus, TenantStatus, BillingStatus } from '@app/api';
import { cn, Shimmer } from '@app/ui';

const SERVICE_MAP: Record<ServiceStatus, { label: string; cls: string; dotCls: string }> = {
  healthy: { label: 'Healthy', cls: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/20', dotCls: 'bg-emerald-400' },
  degraded: { label: 'Degraded', cls: 'text-amber-300 bg-amber-500/10 ring-amber-400/20', dotCls: 'bg-amber-400' },
  down: { label: 'Down', cls: 'text-rose-300 bg-rose-500/10 ring-rose-400/20', dotCls: 'bg-rose-400' },
};

export function ServicePill({ status, label, className }: { status: ServiceStatus; label?: string; className?: string }) {
  const cfg = SERVICE_MAP[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1', cfg.cls, className)}>
      <Shimmer className={cn('size-1.5', cfg.dotCls)} />
      {label ?? cfg.label}
    </span>
  );
}

const TENANT_STATUS_MAP: Record<TenantStatus, { label: string; cls: string }> = {
  active: { label: 'Идэвхтэй', cls: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/20' },
  paused: { label: 'Түр зогссон', cls: 'text-amber-300 bg-amber-500/10 ring-amber-400/20' },
  onboarding: { label: 'Onboarding', cls: 'text-sky-300 bg-sky-500/10 ring-sky-400/20' },
  archived: { label: 'Архивлагдсан', cls: 'text-white/40 bg-white/5 ring-white/10' },
};

export function TenantStatusPill({ status, className }: { status: TenantStatus; className?: string }) {
  const cfg = TENANT_STATUS_MAP[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1', cfg.cls, className)}>
      {cfg.label}
    </span>
  );
}

const BILLING_MAP: Record<BillingStatus, { label: string; cls: string }> = {
  current: { label: 'Current', cls: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/20' },
  past_due: { label: 'Past due', cls: 'text-rose-300 bg-rose-500/10 ring-rose-400/20' },
  trial: { label: 'Trial', cls: 'text-sky-300 bg-sky-500/10 ring-sky-400/20' },
  manual: { label: 'Manual', cls: 'text-violet-300 bg-violet-500/10 ring-violet-400/20' },
};

export function BillingPill({ status, className }: { status: BillingStatus; className?: string }) {
  const cfg = BILLING_MAP[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1', cfg.cls, className)}>
      {cfg.label}
    </span>
  );
}
