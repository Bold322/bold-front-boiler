import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import {
  AmbientDotField,
  GradientText,
  WorkspaceShell,
  cn,
} from '@app/ui';
import { useTenantQuery, useAppApi } from '@app/query';
import type { Tenant } from '@app/api';
import { SuperAdminSidebar } from '../components/super-admin-sidebar';
import { TierBadge } from '../components/tier-badge';
import { BillingPill, TenantStatusPill } from '../components/status-pill';
import { TENANT_TABS, type TenantTabKey } from './tabs';
import { OverviewTab } from './tabs/overview-tab';
import { MembersTab } from './tabs/members-tab';
import { ActivityTab } from './tabs/activity-tab';
import { FlagsTab } from './tabs/flags-tab';
import { DangerTab } from './tabs/danger-tab';
import { formatDate } from '../lib/format';

export function TenantDetailPage({ tenantId, tab }: { tenantId: string; tab: TenantTabKey }) {
  const api = useAppApi();
  const tenantQuery = useTenantQuery(api, tenantId);
  const navigate = useNavigate();

  const tenant = tenantQuery.data;

  return (
    <WorkspaceShell sidebar={<SuperAdminSidebar />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col px-8 py-8">
          <button
            type="button"
            onClick={() => navigate({ to: '/tenants' })}
            className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-1 text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="size-3.5" />
            Бүх tenant
          </button>

          {tenantQuery.isLoading || !tenant ? (
            <div className="mt-6 h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
          ) : (
            <Header tenant={tenant} />
          )}

          <TabBar
            activeTab={tab}
            tenantId={tenantId}
            onSelect={(key) => navigate({ to: '/tenants/$tenantId/$tab', params: { tenantId, tab: key } })}
          />

          <div className="mt-6 flex-1 pb-12">
            {!tenant ? (
              <div className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
            ) : (
              <TabContent tab={tab} tenant={tenant} />
            )}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function Header({ tenant }: { tenant: Tenant }) {
  return (
    <header className="mt-4 flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-white/5 text-3xl ring-1 ring-white/10">
          {tenant.logoEmoji ?? '🏢'}
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            <GradientText>{tenant.name}</GradientText>
          </h1>
          <p className="mt-0.5 text-sm text-white/50">
            <span className="font-mono">{tenant.id}</span>
            {tenant.domain && (
              <>
                <span className="text-white/20"> · </span>
                {tenant.domain}
              </>
            )}
            <span className="text-white/20"> · </span>
            Үүсгэсэн: {formatDate(tenant.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <TierBadge tier={tenant.tier} />
        <div className="flex items-center gap-1.5">
          <TenantStatusPill status={tenant.status} />
          <BillingPill status={tenant.billingStatus} />
        </div>
      </div>
    </header>
  );
}

function TabBar({
  activeTab,
  tenantId,
  onSelect,
}: {
  activeTab: TenantTabKey;
  tenantId: string;
  onSelect: (key: TenantTabKey) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-1 border-b border-white/10">
      {TENANT_TABS.map((t) => {
        const Icon = t.icon;
        const isActive = t.key === activeTab;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onSelect(t.key)}
            data-tenant={tenantId}
            className={cn(
              'group relative inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition',
              isActive
                ? t.variant === 'danger'
                  ? 'border-rose-400 text-rose-300'
                  : t.variant === 'warning'
                    ? 'border-amber-400 text-amber-200'
                    : 'border-[#C5F135] text-white'
                : 'border-transparent text-white/50 hover:text-white',
            )}
          >
            <Icon className="size-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function TabContent({ tab, tenant }: { tab: TenantTabKey; tenant: Tenant }) {
  switch (tab) {
    case 'overview':    return <OverviewTab tenant={tenant} />;
    case 'members':     return <MembersTab tenant={tenant} />;
    case 'activity':    return <ActivityTab tenant={tenant} />;
    case 'flags':       return <FlagsTab tenant={tenant} />;
    case 'danger':      return <DangerTab tenant={tenant} />;
  }
}
