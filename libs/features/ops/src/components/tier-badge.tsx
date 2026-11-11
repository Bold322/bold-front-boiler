import type { TenantTier } from '@app/api';
import { cn } from '@app/ui';
import { TIER_ACCENT, TIER_LABEL } from '../lib/format';

export function TierBadge({ tier, className }: { tier: TenantTier; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        TIER_ACCENT[tier],
        className,
      )}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
