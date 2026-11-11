import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, ScrollText, ShieldAlert, Sparkles, User2 } from 'lucide-react';
import {
  AmbientDotField,
  AnimatedList,
  GradientText,
  Input,
  SpotlightCard,
  WorkspaceShell,
  cn,
} from '@app/ui';
import { useSuperAuditLogsQuery, useTenantsQuery, useAppApi } from '@app/query';
import type { SuperAuditLogEntry } from '@app/api';
import { SuperAdminSidebar } from '../components/super-admin-sidebar';
import { formatDateTime, timeAgo } from '../lib/format';

const SEVERITY_OPTIONS: Array<{ value: 'all' | SuperAuditLogEntry['severity']; label: string }> = [
  { value: 'all', label: 'Бүх severity' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

const ACTOR_KIND_BADGE: Record<SuperAuditLogEntry['actorKind'], { label: string; cls: string; icon: typeof User2 }> = {
  'super-admin': { label: 'Super', cls: 'text-[#C5F135] bg-[#C5F135]/10 ring-[#C5F135]/30', icon: ShieldAlert },
  'tenant-admin': { label: 'Tenant admin', cls: 'text-sky-300 bg-sky-500/10 ring-sky-400/20', icon: User2 },
  member: { label: 'Member', cls: 'text-white/60 bg-white/5 ring-white/10', icon: User2 },
  system: { label: 'System', cls: 'text-violet-300 bg-violet-500/10 ring-violet-400/20', icon: Sparkles },
};

const SEVERITY_DOT: Record<SuperAuditLogEntry['severity'], string> = {
  info: 'bg-white/30',
  warning: 'bg-amber-400',
  critical: 'bg-rose-400',
};

export function AuditPage() {
  const api = useAppApi();
  const tenantsQuery = useTenantsQuery(api);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [severity, setSeverity] = useState<'all' | SuperAuditLogEntry['severity']>('all');
  const [search, setSearch] = useState('');
  const logsQuery = useSuperAuditLogsQuery(api, {
    tenantId,
    severity: severity === 'all' ? undefined : severity,
  });
  const navigate = useNavigate();

  const logs = useMemo(() => {
    const all = logsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((l) => `${l.action} ${l.actor} ${l.tenantName} ${l.resource ?? ''}`.toLowerCase().includes(q));
  }, [logsQuery.data, search]);

  const tenants = tenantsQuery.data ?? [];

  return (
    <WorkspaceShell sidebar={<SuperAdminSidebar />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col gap-8 px-8 py-8">
          <header>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              <ScrollText className="size-3" />
              Cross-tenant audit
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              <GradientText>Аудит</GradientText> бүртгэл
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Бүх tenant дээрх super-admin, tenant-admin, system event-үүд.
            </p>
          </header>

          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Action, actor, resource хайх..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 max-w-md border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-[#C5F135]/40"
            />
            <select
              value={tenantId ?? ''}
              onChange={(e) => setTenantId(e.target.value || undefined)}
              className="h-10 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#C5F135]/40"
            >
              <option value="">Бүх tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
              {SEVERITY_OPTIONS.map((opt) => {
                const isActive = opt.value === severity;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
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
          </div>

          <SpotlightCard className="p-0">
            {logsQuery.isLoading ? (
              <div className="p-8 text-center text-sm text-white/40">Ачааллаж байна...</div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <AlertCircle className="size-8 text-white/20" />
                <p className="text-sm text-white/50">Шүүлтэд тохирох бүртгэл алга.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                <AnimatedList
                  items={logs}
                  getKey={(l) => l.id}
                  stagger={0.015}
                  render={(log) => {
                    const ActorIcon = ACTOR_KIND_BADGE[log.actorKind].icon;
                    return (
                      <div className="group flex items-start gap-4 px-5 py-4 transition hover:bg-white/[0.015]">
                        <div className="flex flex-col items-center pt-1">
                          <span className={cn('size-2 rounded-full', SEVERITY_DOT[log.severity])} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <code className="font-mono text-sm text-white">{log.action}</code>
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1',
                              ACTOR_KIND_BADGE[log.actorKind].cls,
                            )}>
                              <ActorIcon className="size-2.5" />
                              {ACTOR_KIND_BADGE[log.actorKind].label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-white/60">
                            <span className="text-white/80">{log.actor}</span>
                            <span className="text-white/30"> на </span>
                            <button
                              type="button"
                              onClick={() => navigate({ to: '/tenants/$tenantId', params: { tenantId: log.tenantId } })}
                              className="text-white/80 hover:text-[#C5F135] underline-offset-2 hover:underline"
                            >
                              {log.tenantName}
                            </button>
                            {log.resource && (
                              <>
                                <span className="text-white/30"> → </span>
                                <span className="font-mono text-white/60">{log.resource}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-white/40">
                          <p>{timeAgo(log.createdAt)}</p>
                          <p className="font-mono text-white/30">{formatDateTime(log.createdAt)}</p>
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            )}
          </SpotlightCard>
        </div>
      </div>
    </WorkspaceShell>
  );
}
