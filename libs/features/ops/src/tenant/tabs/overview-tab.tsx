import { Activity, CreditCard, Mail, ShieldCheck, Users } from 'lucide-react';
import { CountUp, SpotlightCard, cn } from '@app/ui';
import type { Tenant } from '@app/api';
import { useTenantMembersQuery, useAppApi } from '@app/query';
import { formatMnt, timeAgo } from '../../lib/format';

export function OverviewTab({ tenant }: { tenant: Tenant }) {
  const api = useAppApi();
  const membersQuery = useTenantMembersQuery(api, tenant.id);
  const members = membersQuery.data ?? [];
  const admins = members.filter((m) => m.userType !== 'worker').length;
  const seatPct =
    tenant.seatsLimit > 0 ? Math.min(100, Math.round((tenant.seatsUsed / tenant.seatsLimit) * 100)) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SpotlightCard className="p-5 lg:col-span-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">MRR</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-white">
              <CountUp to={tenant.mrrMnt} format={formatMnt} />
            </p>
            <p className="mt-1 text-xs text-white/50">Billing: {tenant.billingStatus}</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#C5F135]/10 text-[#C5F135] ring-1 ring-[#C5F135]/20">
            <CreditCard className="size-6" />
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-white/60">Seat</span>
            <span className="font-mono text-white">
              {tenant.seatsUsed.toLocaleString('mn-MN')}
              <span className="text-white/40">
                {' '}
                / {tenant.seatsLimit > 0 ? tenant.seatsLimit.toLocaleString('mn-MN') : '∞'}
              </span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className={cn(
                'h-full rounded-full',
                seatPct >= 95 ? 'bg-rose-400' : seatPct >= 80 ? 'bg-amber-400' : 'bg-[#C5F135]',
              )}
              style={{ width: `${seatPct}%` }}
            />
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Сүүлийн идэвх</p>
          <Activity className="size-4 text-white/30" />
        </div>
        <p className="mt-2 text-2xl font-semibold text-white">{timeAgo(tenant.lastActiveAt)}</p>
        <p className="mt-1 text-xs text-white/40">{new Date(tenant.lastActiveAt).toLocaleString('mn-MN')}</p>

        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Primary contact</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-violet-500/15 text-sm font-medium text-violet-200 ring-1 ring-violet-400/20">
              {tenant.primaryContact.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{tenant.primaryContact.name}</p>
              <a
                href={`mailto:${tenant.primaryContact.email}`}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white"
              >
                <Mail className="size-3" />
                {tenant.primaryContact.email}
              </a>
            </div>
          </div>
        </div>
      </SpotlightCard>

      <KpiSmall icon={Users} label="Members" value={membersQuery.isLoading ? tenant.seatsUsed : members.length} accent="#a78bfa" />
      <KpiSmall icon={ShieldCheck} label="Admins" value={admins} accent="#7dd3fc" />
      <KpiSmall
        icon={Activity}
        label="Active flags"
        value={Object.values(tenant.flags).filter(Boolean).length}
        accent="#C5F135"
      />
    </div>
  );
}

function KpiSmall({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <SpotlightCard className="p-5">
      <div className="flex size-10 items-center justify-center rounded-lg" style={{ background: `${accent}1a`, color: accent }}>
        <Icon className="size-5" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        <CountUp to={value} />
      </p>
      <p className="text-sm text-white/60">{label}</p>
    </SpotlightCard>
  );
}
