import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Building2, Check, Copy, Search, TrendingUp, Users, Sparkles, X } from 'lucide-react';
import {
  AmbientDotField,
  AnimatedList,
  CountUp,
  GradientText,
  Input,
  SpotlightCard,
  WorkspaceShell,
  cn,
} from '@app/ui';
import {
  useCreateTenantMutation,
  useSuperAdminStatsQuery,
  useTenantsQuery,
  useAppApi,
} from '@app/query';
import type { Tenant, TenantStatus, TenantTier } from '@app/api';
import { SuperAdminSidebar } from '../components/super-admin-sidebar';
import { TierBadge } from '../components/tier-badge';
import { TenantStatusPill, BillingPill } from '../components/status-pill';
import { formatCompact, formatMnt, timeAgo } from '../lib/format';

const TIER_OPTIONS: Array<{ value: 'all' | TenantTier; label: string }> = [
  { value: 'all', label: 'Бүгд' },
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'business', label: 'Business' },
  { value: 'enterprise', label: 'Enterprise' },
];

const STATUS_OPTIONS: Array<{ value: 'all' | TenantStatus; label: string }> = [
  { value: 'all', label: 'Бүх төлөв' },
  { value: 'active', label: 'Идэвхтэй' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'paused', label: 'Зогссон' },
  { value: 'archived', label: 'Архив' },
];

export function TenantsPage() {
  const api = useAppApi();
  const tenantsQuery = useTenantsQuery(api);
  const statsQuery = useSuperAdminStatsQuery(api);
  const navigate = useNavigate();
  const createMutation = useCreateTenantMutation(api);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<'all' | TenantTier>('all');
  const [status, setStatus] = useState<'all' | TenantStatus>('all');

  const tenants = useMemo(() => {
    const all = tenantsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((t) => {
      if (tier !== 'all' && t.tier !== tier) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (q && !`${t.name} ${t.domain ?? ''} ${t.primaryContact.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tenantsQuery.data, search, tier, status]);

  const stats = statsQuery.data;

  return (
    <>
    <WorkspaceShell sidebar={<SuperAdminSidebar />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col gap-8 px-8 py-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                <Sparkles className="size-3" />
                Super console
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                <GradientText>Тенант</GradientText> жагсаалт
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Бүх organization. Tier, төлөв, MRR, гишүүд нэг харцаар.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                createMutation.reset();
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C5F135] px-3.5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-[#d6f95a]"
            >
              <Building2 className="size-4" />
              Шинэ tenant
            </button>
          </header>

          <KpiRibbon stats={stats} />

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="Tenant нэр, домэйн, контакт..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 border-white/10 bg-white/[0.03] pl-9 text-white placeholder:text-white/30 focus-visible:ring-[#C5F135]/40"
              />
            </div>
            <FilterChips
              options={TIER_OPTIONS}
              value={tier}
              onChange={(v) => setTier(v as 'all' | TenantTier)}
            />
            <FilterChips
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => setStatus(v as 'all' | TenantStatus)}
            />
          </div>

          {tenantsQuery.isLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatedList
              items={tenants}
              getKey={(t) => t.id}
              className="grid gap-3 lg:grid-cols-2"
              stagger={0.03}
              render={(tenant) => (
                <TenantCard tenant={tenant} onOpen={() => navigate({ to: '/tenants/$tenantId', params: { tenantId: tenant.id } })} />
              )}
            />
          )}
        </div>
      </div>
    </WorkspaceShell>
    <CreateTenantModal
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      mutation={createMutation}
    />
    </>
  );
}

function CreateTenantModal({
  open,
  onClose,
  mutation,
}: {
  open: boolean;
  onClose: () => void;
  mutation: ReturnType<typeof useCreateTenantMutation>;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const result = mutation.data;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !slug.trim() || !adminEmail.trim()) return;
    mutation.mutate({ name: name.trim(), slug: slug.trim(), adminEmail: adminEmail.trim() });
  }

  function close() {
    setName('');
    setSlug('');
    setAdminEmail('');
    setCopied(false);
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Шинэ tenant</h2>
            <p className="mt-1 text-sm text-white/60">
              Organization үүсгээд админд урилга илгээнэ.
            </p>
          </div>
          <button type="button" onClick={close} className="text-white/40 transition hover:text-white">
            <X className="size-5" />
          </button>
        </div>

        {result ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-lg border border-[#C5F135]/30 bg-[#C5F135]/[0.06] p-3 text-sm text-[#d6f95a]">
              "{result.tenant.name}" үүслээ. Доорх урилгын холбоосыг админд илгээнэ үү
              (нэг удаа харагдана).
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/60">Урилгын холбоос</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={result.acceptUrl}
                  className="h-10 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 font-mono text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(result.acceptUrl);
                    setCopied(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-white transition hover:bg-white/[0.08]"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Хууллаа' : 'Хуулах'}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-[#C5F135] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-[#d6f95a]"
              >
                Болсон
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="t-name" className="text-xs font-medium text-white/60">
                Нэр
              </label>
              <input
                id="t-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 focus:border-[#C5F135]/40 focus:outline-none focus:ring-2 focus:ring-[#C5F135]/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="t-slug" className="text-xs font-medium text-white/60">
                Slug <span className="text-white/30">(a-z, 0-9, -)</span>
              </label>
              <input
                id="t-slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="acme"
                pattern="[a-z0-9][a-z0-9-]{1,62}"
                className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 font-mono text-sm text-white placeholder:text-white/40 focus:border-[#C5F135]/40 focus:outline-none focus:ring-2 focus:ring-[#C5F135]/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="t-email" className="text-xs font-medium text-white/60">
                Админ имэйл
              </label>
              <input
                id="t-email"
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@acme.com"
                className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 focus:border-[#C5F135]/40 focus:outline-none focus:ring-2 focus:ring-[#C5F135]/20"
              />
            </div>
            {mutation.isError && (
              <p className="text-xs text-rose-300">
                {mutation.error instanceof Error ? mutation.error.message : 'Үүсгэж чадсангүй'}
              </p>
            )}
            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                Цуцлах
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || !name.trim() || !slug.trim() || !adminEmail.trim()}
                className="rounded-lg bg-[#C5F135] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-[#d6f95a] disabled:opacity-50"
              >
                {mutation.isPending ? 'Үүсгэж байна…' : 'Үүсгэх'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs transition',
              isActive
                ? 'bg-white/10 text-white shadow-inner'
                : 'text-white/50 hover:bg-white/5 hover:text-white',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function KpiRibbon({ stats }: { stats: ReturnType<typeof useSuperAdminStatsQuery>['data'] }) {
  const cards = [
    {
      icon: Building2,
      label: 'Нийт tenant',
      value: stats?.totalTenants ?? 0,
      sub: stats ? `${stats.activeTenants} идэвхтэй · ${stats.onboardingTenants} onboarding` : '',
      accent: '#C5F135',
    },
    {
      icon: TrendingUp,
      label: 'MRR',
      value: stats?.totalMrrMnt ?? 0,
      format: (v: number) => formatMnt(v),
      sub: stats ? `${stats.trialTenants} trial` : '',
      accent: '#7dd3fc',
    },
    {
      icon: Users,
      label: 'Нийт seat',
      value: stats?.totalSeatsUsed ?? 0,
      format: (v: number) => formatCompact(v),
      sub: 'Идэвхтэй гишүүд',
      accent: '#a78bfa',
    },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <SpotlightCard key={card.label} className="p-5">
            <div className="flex items-start justify-between">
              <div
                className="flex size-10 items-center justify-center rounded-lg"
                style={{ background: `${card.accent}1a`, color: card.accent }}
              >
                <Icon className="size-5" />
              </div>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight text-white">
              <CountUp to={card.value} format={card.format ?? ((v) => Math.round(v).toLocaleString('mn-MN'))} />
            </div>
            <p className="mt-1 text-sm text-white/60">{card.label}</p>
            {card.sub && <p className="mt-1 text-[11px] text-white/40">{card.sub}</p>}
          </SpotlightCard>
        );
      })}
    </div>
  );
}

function TenantCard({ tenant, onOpen }: { tenant: Tenant; onOpen: () => void }) {
  return (
    <SpotlightCard className="cursor-pointer p-5" >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/5 text-2xl ring-1 ring-white/10">
              {tenant.logoEmoji ?? '🏢'}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">{tenant.name}</h3>
              <p className="text-xs text-white/40">
                {tenant.domain}
                <span className="text-white/20"> · </span>
                {timeAgo(tenant.lastActiveAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <TierBadge tier={tenant.tier} />
            <div className="flex gap-1.5">
              <TenantStatusPill status={tenant.status} />
              <BillingPill status={tenant.billingStatus} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-white/40">MRR</p>
            <p className="mt-0.5 font-mono text-sm text-white">{formatMnt(tenant.mrrMnt)}</p>
          </div>
          <div>
            <p className="text-white/40">Seat</p>
            <p className="mt-0.5 font-mono text-sm text-white">
              {tenant.seatsUsed}
              <span className="text-white/40"> / {tenant.seatsLimit > 0 ? tenant.seatsLimit : '∞'}</span>
            </p>
          </div>
        </div>
      </button>
    </SpotlightCard>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
      <Building2 className="size-10 text-white/20" />
      <p className="mt-4 text-sm text-white/60">Шүүлтэд тохирох tenant олдсонгүй.</p>
    </div>
  );
}
