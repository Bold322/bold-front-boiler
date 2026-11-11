import { useRef, useState, type FormEvent } from 'react';
import { Download, Mail, RefreshCcw, Search, Shield, ShieldCheck, Upload, UserPlus, X } from 'lucide-react';
import type { BulkInviteResult, Member, Role } from '@app/api';
import {
  AmbientDotField,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  triggerBlobDownload,
  WorkspaceShell,
} from '@app/ui';
import {
  useBulkInviteMembersMutation,
  useDepartmentsQuery,
  useGrantLevelMutation,
  useInviteMemberMutation,
  useInvitesQuery,
  useMembersQuery,
  useResendInviteMutation,
  useRevokeInviteMutation,
  useRevokeLevelMutation,
  useSetUserTypeMutation,
  useAppApi,
} from '@app/query';
import { formatRelativeTime, initials } from '@app/utils';
import { ClientSidebar } from '@app/features-client-shell';

function AdminTopBar({ title }: { title: string }) {
  return (
    <>
      <h2 className="text-base font-medium text-white">{title}</h2>
      <div />
    </>
  );
}

function UserTypeBadge({ userType }: { userType: Member['userType'] }) {
  const Icon = userType === 'superadmin' ? ShieldCheck : userType === 'admin' ? Shield : Mail;
  const label = userType === 'superadmin' ? 'Үндсэн админ' : userType === 'admin' ? 'Админ' : 'Гишүүн';
  const classes =
    userType === 'superadmin'
      ? 'bg-violet-500/10 text-violet-300'
      : userType === 'admin'
        ? 'bg-sky-500/10 text-sky-300'
        : 'bg-white/5 text-white/70';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium', classes)}>
      <Icon className="size-3" />
      {label}
    </span>
  );
}

// Mirrors the BE's bulk-invite CSV contract (internal/invites/handler.go):
// only the first column is read, an "email" header row is optional and
// skipped, one address per line, at most 1000 rows.
const CSV_EXAMPLE = 'email\nbat@example.com\nsaraa@example.com';

function downloadCsvTemplate() {
  triggerBlobDownload(
    new Blob([`${CSV_EXAMPLE}\n`], { type: 'text/csv;charset=utf-8' }),
    'urilga-zagvar.csv',
  );
}

function InviteModal({
  open,
  onClose,
  onInvite,
  isPending,
  onBulkInvite,
  bulkPending,
  bulkResult,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: Role, levelIds?: string[]) => void;
  isPending: boolean;
  onBulkInvite: (file: File) => void;
  bulkPending: boolean;
  bulkResult: BulkInviteResult | null;
}) {
  const api = useAppApi();
  const departmentsQuery = useDepartmentsQuery(api);
  const departments = departmentsQuery.data ?? [];
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [departmentId, setDepartmentId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Department + level are required for a regular member (worker); an admin
  // invite legitimately carries no levels, so the picker is hidden for admins.
  const needsLevel = role === 'user';
  const levels = departments.find((d) => d.id === departmentId)?.levels ?? [];
  const canSubmit = !!email.trim() && (!needsLevel || !!levelId);

  function resetForm() {
    setEmail('');
    setRole('user');
    setDepartmentId('');
    setLevelId('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onInvite(email.trim(), role, needsLevel && levelId ? [levelId] : undefined);
    resetForm();
  }

  function handleBulkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csvFile) return;
    onBulkInvite(csvFile);
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Гишүүн урих</h2>
        <p className="mt-1 text-sm text-white/60">
          Имэйл хаягаар урилга илгээж багтаа нэгдүүлнэ үү.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="invite-email" className="text-xs font-medium text-white/60">
              Имэйл
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 focus:border-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-white/60">Эрх</label>
            <div className="grid grid-cols-2 gap-2">
              {(['user', 'admin'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm transition',
                    role === r
                      ? 'border-violet-400/40 bg-violet-500/10 text-white'
                      : 'border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.04]',
                  )}
                >
                  {r === 'admin' ? 'Админ' : 'Гишүүн'}
                </button>
              ))}
            </div>
          </div>
          {needsLevel && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="invite-department" className="text-xs font-medium text-white/60">
                  Хэлтэс
                </label>
                <Select
                  value={departmentId}
                  onValueChange={(v) => {
                    setDepartmentId(v);
                    setLevelId('');
                  }}
                >
                  <SelectTrigger id="invite-department">
                    <SelectValue placeholder="Хэлтэс сонгох…" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="invite-level" className="text-xs font-medium text-white/60">
                  Түвшин
                </label>
                <Select
                  value={levelId}
                  onValueChange={setLevelId}
                  disabled={!departmentId}
                >
                  <SelectTrigger id="invite-level">
                    <SelectValue
                      placeholder={departmentId ? 'Түвшин сонгох…' : 'Эхлээд хэлтэс сонгоно уу'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {[...levels]
                      .sort((a, b) => a.rank - b.rank)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.rank} — {l.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !canSubmit}
              className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:from-violet-400 hover:to-purple-500 disabled:opacity-50"
            >
              {isPending ? 'Илгээж байна…' : 'Урилга илгээх'}
            </button>
          </div>
        </form>

        <div className="my-5 border-t border-white/10" />

        <h3 className="text-sm font-semibold text-white">Олноор урих (CSV)</h3>
        <p className="mt-1 text-xs text-white/50">
          Мөр бүрт нэг имэйл, хамгийн ихдээ 1000 мөр. Зөвхөн эхний багана уншигдах
          бөгөөд «email» гарчигтай эхний мөрийг алгасна. Бүгд гишүүн (worker)
          эрхээр, тухайн байгууллагын анхдагч General / Employee түвшинд урилгатай.
        </p>
        <div className="mt-2 flex items-end justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
          <pre className="text-[11px] leading-relaxed text-white/60">{CSV_EXAMPLE}</pre>
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-violet-300/80 transition hover:text-violet-200"
          >
            <Download className="size-3" />
            Загвар татах
          </button>
        </div>
        <form className="mt-3 flex flex-col gap-3" onSubmit={handleBulkSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
            className="block w-full text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.06] file:px-3 file:py-2 file:text-xs file:font-medium file:text-white/80 hover:file:bg-white/[0.1]"
          />
          {bulkResult && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
              <p className="text-emerald-300">
                {bulkResult.invited.length} урилга илгээгдлээ ({bulkResult.levelName})
              </p>
              {bulkResult.skipped.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-amber-300/80">
                  {bulkResult.skipped.map((s) => (
                    <li key={s.email}>
                      {s.email} — {s.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              Хаах
            </button>
            <button
              type="submit"
              disabled={bulkPending || !csvFile}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              <Upload className="size-4" />
              {bulkPending ? 'Боловсруулж байна…' : 'CSV-ээр урих'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MembersPage() {
  const api = useAppApi();
  const membersQuery = useMembersQuery(api);
  const inviteMutation = useInviteMemberMutation(api);
  const bulkInviteMutation = useBulkInviteMembersMutation(api);
  const [query, setQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const members = membersQuery.data ?? [];
  const selected = members.find((m) => m.id === selectedId) ?? null;
  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.levels.some((l) => l.toLowerCase().includes(q))
    );
  });

  function handleInvite(email: string, role: Role, levelIds?: string[]) {
    inviteMutation.mutate(
      { email, role, levelIds },
      {
        onSuccess: () => setInviteOpen(false),
      },
    );
  }

  function handleBulkInvite(file: File) {
    bulkInviteMutation.mutate(file);
  }

  return (
    <WorkspaceShell sidebar={<ClientSidebar />} topBar={<AdminTopBar title="Гишүүд" />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-8 py-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Гишүүд</h1>
              <p className="mt-1 text-sm text-white/60">
                {members.length} нийт — {members.filter((m) => m.userType === 'admin').length} админ.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:from-violet-400 hover:to-purple-500"
            >
              <UserPlus className="size-4" />
              Гишүүн урих
            </button>
          </header>

          <PendingInvitesPanel />

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Нэр, имэйл, хэлтсээр хайх..."
                className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              />
            </div>
            <span className="text-xs text-white/40">{filtered.length} / {members.length}</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                  <th className="px-4 py-3">Гишүүн</th>
                  <th className="px-4 py-3">Хэлтэс / Түвшин</th>
                  <th className="px-4 py-3">Эрх</th>
                  <th className="px-4 py-3">Бүртгүүлсэн</th>
                </tr>
              </thead>
              <tbody>
                {membersQuery.isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-white/40">
                      Ачааллаж байна...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-white/40">
                      Гишүүн олдсонгүй
                    </td>
                  </tr>
                ) : (
                  filtered.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => setSelectedId(member.id)}
                      className="cursor-pointer border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-purple-700/30 text-sm font-medium text-violet-100 ring-1 ring-white/10">
                            {initials(member.name)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{member.name}</p>
                            <p className="text-xs text-white/40">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {member.levels.length ? member.levels.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <UserTypeBadge userType={member.userType} />
                      </td>
                      <td className="px-4 py-3 text-white/60">{formatRelativeTime(member.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          bulkInviteMutation.reset();
        }}
        onInvite={handleInvite}
        isPending={inviteMutation.isPending}
        onBulkInvite={handleBulkInvite}
        bulkPending={bulkInviteMutation.isPending}
        bulkResult={bulkInviteMutation.data ?? null}
      />

      <MemberDetailSheet member={selected} onClose={() => setSelectedId(null)} />
    </WorkspaceShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-medium tracking-wider text-white/40 uppercase">{label}</p>
      <p className="text-sm text-white/80">{value}</p>
    </div>
  );
}

function MemberDetailSheet({
  member,
  onClose,
}: {
  member: Member | null;
  onClose: () => void;
}) {
  const api = useAppApi();
  const setUserType = useSetUserTypeMutation(api);
  const departmentsQuery = useDepartmentsQuery(api);
  const grantLevel = useGrantLevelMutation(api);
  const revokeLevel = useRevokeLevelMutation(api);
  const busy = setUserType.isPending || grantLevel.isPending || revokeLevel.isPending;
  const isSuperadmin = member?.userType === 'superadmin';
  const [levelPicker, setLevelPicker] = useState<string>('');

  function handleToggleUserType() {
    if (!member || isSuperadmin) return;
    const next: 'admin' | 'worker' = member.userType === 'admin' ? 'worker' : 'admin';
    setUserType.mutate({ id: member.id, userType: next });
  }

  function handleGrantLevel() {
    if (!member || !levelPicker) return;
    grantLevel.mutate({ userId: member.id, levelId: levelPicker }, {
      onSuccess: () => setLevelPicker(''),
    });
  }

  function handleRevokeLevel(levelId: string) {
    if (!member) return;
    revokeLevel.mutate({ userId: member.id, levelId });
  }

  // Flatten the departments tree into "Department / Level" options, excluding
  // anything the user already holds.
  const memberLevelIdSet = new Set(member?.levelIds ?? []);
  const availableLevels = (departmentsQuery.data ?? []).flatMap((d) =>
    d.levels
      .filter((l) => !memberLevelIdSet.has(l.id))
      .map((l) => ({ id: l.id, label: `${d.name} / ${l.name}` })),
  );

  return (
    <Sheet open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full border-white/10 bg-neutral-950 text-white sm:max-w-md"
      >
        {member && (
          <>
            <SheetHeader className="border-b border-white/5 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-purple-700/30 text-sm font-medium text-violet-100 ring-1 ring-white/10">
                  {initials(member.name)}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-sm font-semibold text-white">
                    {member.name}
                  </SheetTitle>
                  <SheetDescription className="truncate text-[11px] text-white/40">
                    {member.email}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-5 pb-6">
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium tracking-wider text-white/40 uppercase">
                  Хэлтэс / Түвшин
                </p>
                {member.levels.length === 0 ? (
                  <p className="text-sm text-white/40">Үндсэн түвшин олгогдоогүй.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {member.levels.map((label, i) => {
                      const lid = member.levelIds[i];
                      return (
                        <li
                          key={lid ?? label}
                          className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-white/80 ring-1 ring-white/10"
                        >
                          <span>{label}</span>
                          {lid && !isSuperadmin && (
                            <button
                              type="button"
                              aria-label="Хасах"
                              onClick={() => handleRevokeLevel(lid)}
                              disabled={busy}
                              className="ml-0.5 text-white/40 transition hover:text-rose-300 disabled:opacity-50"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {!isSuperadmin && availableLevels.length > 0 && (
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={levelPicker}
                      onChange={(e) => setLevelPicker(e.target.value)}
                      disabled={busy}
                      className="h-9 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-white focus:border-violet-400/40 focus:outline-none"
                    >
                      <option value="">Түвшин нэмэх…</option>
                      {availableLevels.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleGrantLevel}
                      disabled={busy || !levelPicker}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                    >
                      Нэмэх
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-medium tracking-wider text-white/40 uppercase">
                  Эрх
                </p>
                <div>
                  <UserTypeBadge userType={member.userType} />
                </div>
              </div>
              <DetailRow label="Бүртгүүлсэн" value={formatRelativeTime(member.createdAt)} />

              <div className="mt-2 flex flex-col gap-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={handleToggleUserType}
                  disabled={busy || isSuperadmin}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                >
                  {isSuperadmin
                    ? 'Үндсэн админ — өөрчлөх боломжгүй'
                    : member.userType === 'admin'
                      ? 'Гишүүн болгох'
                      : 'Админ болгох'}
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PendingInvitesPanel() {
  const api = useAppApi();
  const invitesQuery = useInvitesQuery(api);
  const revoke = useRevokeInviteMutation(api);
  const resend = useResendInviteMutation(api);
  const invites = invitesQuery.data ?? [];
  if (invitesQuery.isLoading) return null;
  if (invites.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Хүлээгдэж буй урилга</h2>
          <p className="text-xs text-white/40">
            {invites.length} илгээгдсэн — хүлээн авагч урилгаа баталгаажуулаагүй.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-white/5">
        {invites.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{inv.email}</p>
              <p className="text-[11px] text-white/40">
                {inv.userType === 'admin' ? 'Админ' : 'Гишүүн'} ·{' '}
                {new Date(inv.expiresAt) < new Date()
                  ? 'Хугацаа дууссан'
                  : `Хугацаа: ${new Date(inv.expiresAt).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => resend.mutate(inv.id)}
                disabled={resend.isPending}
                title="Дахин илгээх"
                className="inline-flex size-8 items-center justify-center rounded-md text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <RefreshCcw className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`${inv.email} урилгыг цуцлах уу?`)) revoke.mutate(inv.id);
                }}
                disabled={revoke.isPending}
                title="Цуцлах"
                className="inline-flex size-8 items-center justify-center rounded-md text-white/50 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
