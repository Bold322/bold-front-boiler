import type { TenantTier } from '@app/api';

const MNT = new Intl.NumberFormat('mn-MN');

export function formatMnt(value: number): string {
  return `₮${MNT.format(value)}`;
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return MNT.format(Math.round(value));
}



const RTF = new Intl.RelativeTimeFormat('mn', { numeric: 'auto' });

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s өмнө`;
  const min = Math.round(sec / 60);
  if (min < 60) return RTF.format(-min, 'minute');
  const hr = Math.round(min / 60);
  if (hr < 24) return RTF.format(-hr, 'hour');
  const day = Math.round(hr / 24);
  if (day < 30) return RTF.format(-day, 'day');
  const month = Math.round(day / 30);
  if (month < 12) return RTF.format(-month, 'month');
  return RTF.format(-Math.round(month / 12), 'year');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('mn-MN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('mn-MN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const TIER_LABEL: Record<TenantTier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  business: 'Business',
  enterprise: 'Enterprise',
};

export const TIER_ACCENT: Record<TenantTier, string> = {
  starter: 'bg-slate-500/10 text-slate-300 border-slate-400/20',
  growth: 'bg-[#C5F135]/10 text-[#C5F135] border-[#C5F135]/30',
  business: 'bg-sky-500/10 text-sky-300 border-sky-400/30',
  enterprise: 'bg-violet-500/10 text-violet-300 border-violet-400/30',
};
