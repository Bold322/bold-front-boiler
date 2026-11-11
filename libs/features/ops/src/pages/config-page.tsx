import { AlertCircle, Settings2, ShieldCheck, Sparkles, UserCog } from 'lucide-react';
import {
  AmbientDotField,
  AnimatedList,
  CountUp,
  GradientText,
  SpotlightCard,
  WorkspaceShell,
  cn,
} from '@app/ui';
import { useInternalUsersQuery, usePlansQuery, useAppApi } from '@app/query';
import type { PlanDefinition } from '@app/api';
import { SuperAdminSidebar } from '../components/super-admin-sidebar';
import { TIER_ACCENT, TIER_LABEL, formatMnt, timeAgo } from '../lib/format';

export function ConfigPage() {
  const api = useAppApi();
  const plansQuery = usePlansQuery(api);
  const internalUsersQuery = useInternalUsersQuery(api);

  const plans = plansQuery.data ?? [];
  const users = internalUsersQuery.data ?? [];

  return (
    <WorkspaceShell sidebar={<SuperAdminSidebar />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col gap-8 px-8 py-8">
          <header>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              <Settings2 className="size-3" />
              Internal config
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              <GradientText>Тохиргоо</GradientText>
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Plan definition (tier үнэ + seat), super-admin эрхтэй ажилтнууд.
            </p>
          </header>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#C5F135]" />
              <h2 className="text-lg font-semibold text-white">Plan & pricing</h2>
            </div>
            {plansQuery.isLoading ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#C5F135]" />
              <h2 className="text-lg font-semibold text-white">Super-admin эрхтэй</h2>
            </div>
            <SpotlightCard className="p-0">
              {internalUsersQuery.isLoading ? (
                <div className="p-8 text-center text-sm text-white/40">Ачааллаж байна...</div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-12 text-center">
                  <AlertCircle className="size-8 text-white/20" />
                  <p className="text-sm text-white/50">Super-admin эрхтэй ажилтан алга.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  <AnimatedList
                    items={users}
                    getKey={(u) => u.id}
                    render={(user) => (
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C5F135]/30 to-emerald-500/30 text-sm font-medium text-[#C5F135] ring-1 ring-[#C5F135]/20">
                            <UserCog className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-white/40">{user.email}</p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-white/40">
                          <p>{timeAgo(user.lastActiveAt)}</p>
                          <p className="font-mono">Үүсгэсэн: {new Date(user.createdAt).toLocaleDateString('mn-MN')}</p>
                        </div>
                      </div>
                    )}
                  />
                </div>
              )}
            </SpotlightCard>
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function PlanCard({ plan }: { plan: PlanDefinition }) {
  return (
    <SpotlightCard className="p-5">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-white">{plan.name}</h3>
        <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', TIER_ACCENT[plan.id])}>
          {TIER_LABEL[plan.id]}
        </span>
      </div>
      <div className="mt-3">
        {plan.priceMnt === null ? (
          <p className="text-2xl font-semibold tracking-tight text-white">Холбогдох</p>
        ) : (
          <p className="text-2xl font-semibold tracking-tight text-white">
            <CountUp to={plan.priceMnt} format={formatMnt} />
            <span className="ml-1 text-sm font-normal text-white/40">/ сар</span>
          </p>
        )}
      </div>
      <dl className="mt-4 space-y-1.5 text-xs">
        <Row label="Seat" value={plan.seatLimit === null ? 'unlimited' : `${plan.seatLimit}`} />
      </dl>
      {plan.notes && <p className="mt-3 rounded-md border border-[#C5F135]/20 bg-[#C5F135]/[0.04] px-2.5 py-1.5 text-[11px] text-[#C5F135]">{plan.notes}</p>}
    </SpotlightCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-white/40">{label}</dt>
      <dd className="font-mono text-white/80">{value}</dd>
    </div>
  );
}
