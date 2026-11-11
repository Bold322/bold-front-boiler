import { useState } from 'react';
import { Activity, Building2, Mail, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { AmbientDotField, cn, WorkspaceShell } from '@app/ui';
import {
  useDepartmentsQuery,
  useInvitesQuery,
  useMembersQuery,
  useMembershipAuditQuery,
  useAppApi,
} from '@app/query';
import { formatRelativeTime } from '@app/utils';
import { ClientSidebar } from '@app/features-client-shell';

const MEMBERSHIP_ACTION_LABEL: Record<string, string> = {
  grant: 'эрх олгосон',
  revoke: 'эрх буцаасан',
};

function AdminTopBar({ title }: { title: string }) {
  return (
    <>
      <h2 className="text-base font-medium text-white">{title}</h2>
      <div />
    </>
  );
}

interface StatCardProps {
  icon: typeof Activity;
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'violet' | 'emerald' | 'amber' | 'rose' | 'sky';
}

const ACCENT_MAP: Record<NonNullable<StatCardProps['accent']>, string> = {
  violet: 'bg-violet-500/10 text-violet-300',
  emerald: 'bg-emerald-500/10 text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-300',
  rose: 'bg-rose-500/10 text-rose-300',
  sky: 'bg-sky-500/10 text-sky-300',
};

function StatCard({ icon: Icon, label, value, hint, accent = 'violet' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className={cn('flex size-10 items-center justify-center rounded-lg', ACCENT_MAP[accent])}>
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-white/60">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

/**
 * Tenant-admin overview. Every number here is derived from surviving queries
 * (members, invites, departments, membership audit) so the page works against
 * both the mock and the real backend without a dedicated stats endpoint. Add a
 * `getAdminStats()` method to AppApi when the product needs server-side KPIs.
 */
export function EnterpriseAdminPage() {
  const api = useAppApi();
  const membersQuery = useMembersQuery(api);
  const invitesQuery = useInvitesQuery(api);
  const departmentsQuery = useDepartmentsQuery(api);
  const auditQuery = useMembershipAuditQuery(api);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const members = membersQuery.data ?? [];
  const admins = members.filter((m) => m.userType !== 'worker').length;
  const invites = invitesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const levelCount = departments.reduce((n, d) => n + d.levels.length, 0);
  const activity = auditQuery.data ?? [];
  const visibleActivity = showAllActivity ? activity : activity.slice(0, 4);
  const loading = membersQuery.isLoading || invitesQuery.isLoading || departmentsQuery.isLoading;

  return (
    <WorkspaceShell sidebar={<ClientSidebar />} topBar={<AdminTopBar title="Хяналт" />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-8 py-8">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Хяналтын самбар</h1>
            <p className="mt-1 text-sm text-white/60">
              Байгууллагын гишүүд, урилга, хэлтсийн бүтэц нэг харцаар.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Нийт гишүүд"
              value={loading ? '—' : members.length}
              accent="violet"
            />
            <StatCard
              icon={ShieldCheck}
              label="Админ"
              value={loading ? '—' : admins}
              hint={loading ? undefined : `${members.length - admins} ажилтан`}
              accent="sky"
            />
            <StatCard
              icon={Mail}
              label="Хүлээгдэж буй урилга"
              value={loading ? '—' : invites.length}
              accent="amber"
            />
            <StatCard
              icon={Building2}
              label="Хэлтэс"
              value={loading ? '—' : departments.length}
              hint={loading ? undefined : `${levelCount} түвшин`}
              accent="emerald"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Сүүлийн үйл ажиллагаа</h3>
                {activity.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllActivity((v) => !v)}
                    className="text-xs text-violet-300 transition hover:text-violet-200"
                  >
                    {showAllActivity ? 'Хураах ←' : 'Бүгдийг харах →'}
                  </button>
                )}
              </div>
              <ul className="mt-4 space-y-3">
                {auditQuery.isLoading ? (
                  <li className="py-4 text-center text-sm text-white/40">Ачааллаж байна...</li>
                ) : visibleActivity.length === 0 ? (
                  <li className="py-4 text-center text-sm text-white/40">Үйл ажиллагаа алга</li>
                ) : (
                  visibleActivity.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 text-sm">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5">
                        <UserCheck className="size-3.5 text-white/60" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white/90">
                          <span className="font-medium text-white">
                            {MEMBERSHIP_ACTION_LABEL[item.action] ?? item.action}
                          </span>{' '}
                          — {item.levelName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {formatRelativeTime(item.at)}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white">Хэлтэс, түвшин</h3>
              <p className="mt-1 text-xs text-white/50">Идэвхтэй каталог</p>
              <ul className="mt-4 space-y-2.5">
                {departmentsQuery.isLoading ? (
                  <li className="py-4 text-center text-sm text-white/40">Ачааллаж байна...</li>
                ) : departments.length === 0 ? (
                  <li className="py-4 text-center text-sm text-white/40">Хэлтэс алга</li>
                ) : (
                  departments.map((dept) => (
                    <li key={dept.id} className="text-sm">
                      <p className="font-medium text-white/90">{dept.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-white/40">
                        {dept.levels.map((l) => l.name).join(' · ') || '—'}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
