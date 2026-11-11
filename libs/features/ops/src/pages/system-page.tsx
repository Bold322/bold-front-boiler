import { Activity, Database, Mail, Server } from 'lucide-react';
import {
  AmbientDotField,
  CountUp,
  GradientText,
  SpotlightCard,
  WorkspaceShell,
} from '@app/ui';
import { useSystemHealthQuery, useAppApi } from '@app/query';
import type { ServiceHealth } from '@app/api';
import { SuperAdminSidebar } from '../components/super-admin-sidebar';
import { ServicePill } from '../components/status-pill';

/**
 * Platform health. The backend exposes `GET /superadmin/system/health` with
 * api / database / email plus an `extra` list; add a card per service the
 * product depends on (queues, caches, 3rd-party APIs) by pushing into `extra`.
 */
export function SystemPage() {
  const api = useAppApi();
  const healthQuery = useSystemHealthQuery(api);
  const health = healthQuery.data;

  return (
    <WorkspaceShell sidebar={<SuperAdminSidebar />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col gap-8 px-8 py-8">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Super console · Operations
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              <GradientText>Систем</GradientText> эрүүл мэнд
            </h1>
            <p className="mt-1 text-sm text-white/60">
              API, өгөгдлийн сан, имэйл болон бусад үйлчилгээний төлөв.
            </p>
          </header>

          {!health ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <ServiceCard icon={Server} label="API" health={health.api} accent="#C5F135" />
              <ServiceCard icon={Database} label="Database" health={health.database} accent="#7dd3fc" />
              <ServiceCard icon={Mail} label="Email" health={health.email} accent="#a78bfa" />
              {health.extra.map((svc) => (
                <ServiceCard key={svc.id} icon={Activity} label={svc.label} health={svc} accent="#f0abfc" />
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}

function ServiceCard({
  icon: Icon,
  label,
  health,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  health: ServiceHealth;
  accent: string;
}) {
  return (
    <SpotlightCard accent="197 241 53" className="p-5">
      <div className="flex items-start justify-between">
        <div
          className="flex size-10 items-center justify-center rounded-lg"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <ServicePill status={health.status} />
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-white/40">{label}</p>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-white tabular-nums">
        <CountUp to={health.p95LatencyMs} />
        <span className="text-base text-white/60"> ms</span>
      </div>
      <p className="mt-0.5 text-xs text-white/40">p95 latency</p>
      {health.detail && <p className="mt-3 text-[11px] text-white/50">{health.detail}</p>}
    </SpotlightCard>
  );
}
