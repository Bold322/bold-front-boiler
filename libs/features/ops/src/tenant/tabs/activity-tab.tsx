import { AnimatedList, SpotlightCard, cn } from '@app/ui';
import { useSuperAuditLogsQuery, useAppApi } from '@app/query';
import type { Tenant } from '@app/api';
import { formatDateTime, timeAgo } from '../../lib/format';

const SEVERITY_DOT = {
  info: 'bg-white/30',
  warning: 'bg-amber-400',
  critical: 'bg-rose-400',
} as const;

export function ActivityTab({ tenant }: { tenant: Tenant }) {
  const api = useAppApi();
  const logsQuery = useSuperAuditLogsQuery(api, { tenantId: tenant.id });
  const logs = logsQuery.data ?? [];

  return (
    <SpotlightCard className="p-0">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-medium text-white">Энэ tenant дээрх event-үүд</h2>
        <p className="text-xs text-white/40">{logs.length} бүртгэл</p>
      </div>
      {logsQuery.isLoading ? (
        <div className="p-8 text-center text-sm text-white/40">Ачааллаж байна...</div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center text-sm text-white/50">Event алга.</div>
      ) : (
        <div className="divide-y divide-white/5">
          <AnimatedList
            items={logs}
            getKey={(l) => l.id}
            stagger={0.015}
            render={(log) => (
              <div className="flex items-start gap-4 px-5 py-3.5">
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', SEVERITY_DOT[log.severity])} />
                <div className="min-w-0 flex-1">
                  <code className="font-mono text-sm text-white">{log.action}</code>
                  <p className="mt-0.5 text-xs text-white/60">
                    <span className="text-white/80">{log.actor}</span>
                    {log.resource && (
                      <>
                        <span className="text-white/30"> → </span>
                        <span className="font-mono">{log.resource}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right text-[11px] text-white/40">
                  <p>{timeAgo(log.createdAt)}</p>
                  <p className="font-mono text-white/30">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            )}
          />
        </div>
      )}
    </SpotlightCard>
  );
}
