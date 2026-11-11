import { useState } from 'react';
import { Mail, RotateCcw, Shield, UserMinus, UserPlus } from 'lucide-react';
import { AnimatedList, SpotlightCard, cn } from '@app/ui';
import {
  useInviteTenantMemberMutation,
  useRemoveTenantMemberMutation,
  useRestoreTenantMemberMutation,
  useTenantMembersQuery,
  useAppApi,
} from '@app/query';
import type { Member, Tenant } from '@app/api';
import { timeAgo } from '../../lib/format';

export function MembersTab({ tenant }: { tenant: Tenant }) {
  const api = useAppApi();
  const membersQuery = useTenantMembersQuery(api, tenant.id, { includeDeleted: true });
  const removeMutation = useRemoveTenantMemberMutation(api, tenant.id);
  const restoreMutation = useRestoreTenantMemberMutation(api, tenant.id);
  const [inviteOpen, setInviteOpen] = useState(false);

  const members = membersQuery.data ?? [];
  const active = members.filter((m) => !m.deletedAt);
  const deleted = members.filter((m) => m.deletedAt);

  return (
    <>
      <SpotlightCard className="p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-base font-medium text-white">{tenant.name} — гишүүд</h2>
            <p className="text-xs text-white/40">
              {active.length} идэвхтэй
              {deleted.length > 0 ? ` · ${deleted.length} устгасан` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs text-violet-100 transition hover:bg-violet-500/25"
          >
            <UserPlus className="size-3.5" />
            Гишүүн нэмэх
          </button>
        </div>
        {membersQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-white/40">Ачааллаж байна...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/40">Гишүүн байхгүй байна</div>
        ) : (
          <div className="divide-y divide-white/5">
            <AnimatedList
              items={members}
              getKey={(m) => m.id}
              stagger={0.02}
              render={(member) => (
                <MemberRow
                  member={member}
                  onRemove={() => {
                    if (member.deletedAt) return;
                    if (!confirm(`${member.name} (${member.email}) -г устгах уу?`)) return;
                    removeMutation.mutate(member.id);
                  }}
                  onRestore={() => restoreMutation.mutate(member.id)}
                  busy={
                    (removeMutation.isPending && removeMutation.variables === member.id) ||
                    (restoreMutation.isPending && restoreMutation.variables === member.id)
                  }
                />
              )}
            />
          </div>
        )}
      </SpotlightCard>
      {inviteOpen && (
        <InviteDialog
          tenant={tenant}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </>
  );
}

function MemberRow({
  member,
  onRemove,
  onRestore,
  busy,
}: {
  member: Member;
  onRemove: () => void;
  onRestore: () => void;
  busy: boolean;
}) {
  const deleted = !!member.deletedAt;
  return (
    <div className={cn('group flex items-center justify-between px-5 py-3', deleted && 'opacity-60')}>
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-full text-sm font-medium ring-1',
            deleted
              ? 'bg-white/5 text-white/40 ring-white/10'
              : 'bg-violet-500/15 text-violet-200 ring-violet-400/20',
          )}
        >
          {member.name
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p
              className={cn(
                'truncate text-sm font-medium',
                deleted ? 'text-white/50 line-through' : 'text-white',
              )}
            >
              {member.name}
            </p>
            {member.userType === 'superadmin' && (
              <span className="rounded-md bg-[#C5F135]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#C5F135] ring-1 ring-[#C5F135]/30">
                Super
              </span>
            )}
            {member.userType === 'admin' && (
              <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-200 ring-1 ring-violet-400/20">
                Admin
              </span>
            )}
            {deleted && (
              <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300 ring-1 ring-rose-400/20">
                Устгасан
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-white/40">
            <Mail className="size-3" />
            {member.email}
            {member.levels.length > 0 && (
              <span className="text-white/20"> · {member.levels.join(', ')}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="hidden text-right text-[11px] text-white/40 md:block">
          {timeAgo(member.createdAt)}
        </p>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {deleted ? (
            <button
              type="button"
              title="Сэргээх"
              onClick={onRestore}
              disabled={busy}
              className="rounded-md p-1.5 text-white/40 transition hover:bg-emerald-500/10 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                title="Эрх"
                disabled
                className="rounded-md p-1.5 text-white/30 disabled:cursor-not-allowed"
              >
                <Shield className="size-3.5" />
              </button>
              <button
                type="button"
                title="Гишүүнээс хасах"
                onClick={onRemove}
                disabled={busy || member.userType === 'superadmin'}
                className="rounded-md p-1.5 text-white/40 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <UserMinus className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InviteDialog({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const api = useAppApi();
  const inviteMutation = useInviteTenantMemberMutation(api, tenant.id);
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState<'admin' | 'worker'>('worker');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!/.+@.+\..+/.test(trimmed)) {
      setError('Зөв email оруулна уу');
      return;
    }
    try {
      await inviteMutation.mutateAsync({ email: trimmed, userType });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Урилга илгээж чадсангүй');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl">
        <h3 className="text-lg font-medium text-white">Гишүүн нэмэх</h3>
        <p className="mt-1 text-xs text-white/40">
          {tenant.name} компанид урилга илгээнэ
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-white/60">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              placeholder="name@example.com"
              className="mt-1.5 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-400/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/60">Эрх</label>
            <div className="mt-1.5 flex gap-2">
              {(['worker', 'admin'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setUserType(t)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-xs font-medium transition',
                    userType === t
                      ? 'border-violet-400/40 bg-violet-500/15 text-violet-100'
                      : 'border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5',
                  )}
                >
                  {t === 'worker' ? 'Ажилтан' : 'Админ'}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/5"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={inviteMutation.isPending || !email.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="size-3.5" />
            {inviteMutation.isPending ? 'Илгээж байна...' : 'Урилга илгээх'}
          </button>
        </div>
      </div>
    </div>
  );
}
