import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Diamond,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminDepartment, AdminDepartmentLevel } from '@app/api';
import { AmbientDotField, cn, WorkspaceShell } from '@app/ui';
import {
  useAdminDepartmentsQuery,
  useAdminLevelsQuery,
  useCreateDepartmentMutation,
  useCreateLevelMutation,
  useDeleteDepartmentMutation,
  useDeleteLevelMutation,
  usePatchDepartmentMutation,
  usePatchLevelMutation,
  useAppApi,
} from '@app/query';
import { ClientSidebar } from '@app/features-client-shell';

function AdminTopBar({ title }: { title: string }) {
  return (
    <>
      <h2 className="text-base font-medium text-white">{title}</h2>
      <div />
    </>
  );
}

export function DepartmentsPage() {
  const api = useAppApi();
  const [includeDeprecated, setIncludeDeprecated] = useState(false);
  const departmentsQuery = useAdminDepartmentsQuery(api, includeDeprecated);
  const createDept = useCreateDepartmentMutation(api);
  const departments = departmentsQuery.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleCreate(name: string, description: string) {
    createDept.mutate(
      { name, description },
      { onSuccess: () => setCreateOpen(false) },
    );
  }

  return (
    <WorkspaceShell sidebar={<ClientSidebar />} topBar={<AdminTopBar title="Хэлтэс ба түвшин" />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-8 py-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Хэлтэс ба түвшин
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Баримтын хандалт хэлтэс доторх түвшингээр тодорхойлогдоно. Шинэ
                хэлтэс үүсгэх, түвшин нэмэх / устгах боломжтой.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:from-violet-400 hover:to-purple-500"
            >
              <Plus className="size-4" />
              Шинэ хэлтэс
            </button>
          </header>

          <label className="inline-flex w-fit items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={includeDeprecated}
              onChange={(e) => setIncludeDeprecated(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04]"
            />
            Хуучирсныг харуулах
          </label>

          <div className="flex flex-col gap-3">
            {departmentsQuery.isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-10 text-center text-sm text-white/40">
                Ачааллаж байна...
              </div>
            ) : departments.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-10 text-center text-sm text-white/40">
                Хэлтэс алга
              </div>
            ) : (
              departments.map((dept) => (
                <DepartmentCard
                  key={dept.id}
                  dept={dept}
                  expanded={expandedId === dept.id}
                  onToggle={() =>
                    setExpandedId((curr) => (curr === dept.id ? null : dept.id))
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>

      {createOpen && (
        <CreateDepartmentDialog
          onCancel={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          pending={createDept.isPending}
        />
      )}
    </WorkspaceShell>
  );
}

function DepartmentCard({
  dept,
  expanded,
  onToggle,
}: {
  dept: AdminDepartment;
  expanded: boolean;
  onToggle: () => void;
}) {
  const api = useAppApi();
  const patchDept = usePatchDepartmentMutation(api);
  const deleteDept = useDeleteDepartmentMutation(api);
  const [editing, setEditing] = useState(false);
  const [draftDesc, setDraftDesc] = useState(dept.description);
  const deprecated = dept.deprecatedAt != null;
  const busy = patchDept.isPending || deleteDept.isPending;

  function saveDescription() {
    patchDept.mutate(
      { id: dept.id, patch: { description: draftDesc } },
      { onSuccess: () => setEditing(false) },
    );
  }

  function toggleDeprecated() {
    patchDept.mutate({ id: dept.id, patch: { deprecated: !deprecated } });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `"${dept.name}" хэлтсийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
      )
    )
      return;
    deleteDept.mutate(dept.id);
  }

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white/[0.02]',
        deprecated ? 'border-amber-500/20' : 'border-white/10',
      )}
    >
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <Building2
            className={cn(
              'size-4 transition',
              deprecated ? 'text-amber-300' : 'text-violet-300',
            )}
          />
          <div className="min-w-0">
            <p className="font-medium text-white">
              {dept.name}
              {deprecated && (
                <span className="ml-2 inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-amber-400/20">
                  Хуучирсан
                </span>
              )}
            </p>
            {editing ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={busy}
                  className="h-8 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-white focus:border-violet-400/40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    saveDescription();
                  }}
                  disabled={busy}
                  className="rounded-md bg-violet-500/20 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/30 disabled:opacity-50"
                >
                  Хадгалах
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(false);
                    setDraftDesc(dept.description);
                  }}
                  className="text-xs text-white/40 hover:text-white"
                >
                  Болих
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/50">{dept.description || '—'}</p>
            )}
          </div>
          <ChevronRight
            className={cn(
              'size-4 shrink-0 text-white/30 transition',
              expanded && 'rotate-90',
            )}
          />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            title="Тайлбар засах"
            disabled={busy}
            className="inline-flex size-8 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleDeprecated}
            title={deprecated ? 'Сэргээх' : 'Хуучирсан болгох'}
            disabled={busy}
            className="rounded-md px-2 py-1 text-[11px] text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            {deprecated ? 'Сэргээх' : 'Хуучирсан'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="Устгах"
            disabled={busy}
            className="inline-flex size-8 items-center justify-center rounded-md text-white/40 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </header>
      {expanded && <LevelsSection departmentId={dept.id} departmentName={dept.name} />}
    </article>
  );
}

function LevelsSection({
  departmentId,
  departmentName,
}: {
  departmentId: string;
  departmentName: string;
}) {
  const api = useAppApi();
  const levelsQuery = useAdminLevelsQuery(api, departmentId);
  const createLevel = useCreateLevelMutation(api);
  const [draftName, setDraftName] = useState('');
  const [draftRank, setDraftRank] = useState<number>(1);

  // Highest rank renders first — the visual ladder reads top-down (top = most access).
  const levels = useMemo(
    () => [...(levelsQuery.data ?? [])].sort((a, b) => b.rank - a.rank),
    [levelsQuery.data],
  );
  const nextRank = (levels[0]?.rank ?? 0) + 1;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftName.trim()) return;
    createLevel.mutate(
      { departmentId, input: { name: draftName.trim(), rank: draftRank } },
      {
        onSuccess: () => {
          setDraftName('');
          setDraftRank(nextRank + 1);
        },
      },
    );
  }

  return (
    <section className="border-t border-white/5 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Layers className="size-3.5 text-white/50" />
        <h3 className="text-xs font-medium tracking-wider text-white/60 uppercase">
          {departmentName} — түвшин ({levels.length})
        </h3>
        <span className="ml-auto text-[10px] tracking-wide text-white/30">
          дээд = их хандалт
        </span>
      </div>

      {levelsQuery.isLoading ? (
        <p className="text-sm text-white/40">Ачааллаж байна...</p>
      ) : levels.length === 0 ? (
        <p className="text-sm text-white/40">Түвшин алга</p>
      ) : (
        <ol className="flex flex-col">
          {levels.map((lvl, idx) => (
            <LevelRow
              key={lvl.id}
              departmentId={departmentId}
              level={lvl}
              isTop={idx === 0}
              isBottom={idx === levels.length - 1}
            />
          ))}
        </ol>
      )}

      <form className="mt-3 flex items-center gap-2" onSubmit={handleSubmit}>
        <RankStepper
          value={draftRank}
          onChange={setDraftRank}
          disabled={createLevel.isPending}
          className="h-8"
        />
        <input
          type="text"
          required
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder={`Шинэ түвшин (жишээ: rank ${nextRank})`}
          className="h-8 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-white placeholder:text-white/40 focus:border-violet-400/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={createLevel.isPending || !draftName.trim()}
          className="rounded-md bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-500/30 disabled:opacity-50"
        >
          Нэмэх
        </button>
      </form>
    </section>
  );
}

function scopeCaption(
  level: AdminDepartmentLevel,
  isTop: boolean,
  isBottom: boolean,
): string {
  if (isTop && isBottom) return 'Цорын ганц түвшин';
  if (isTop) return 'Дээд хандалт · бүх дотоод түвшин';
  if (isBottom) return `Зөвхөн L${level.rank}`;
  return `L${level.rank} ба доош`;
}

function RankStepper({
  value,
  onChange,
  disabled,
  min = 1,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  min?: number;
  className?: string;
}) {
  const safeValue = Number.isFinite(value) ? value : min;
  return (
    <div
      className={cn(
        'inline-flex items-stretch overflow-hidden rounded-md border border-white/10 bg-white/[0.04] transition focus-within:border-violet-400/40',
        disabled && 'opacity-50',
        className,
      )}
    >
      <input
        type="number"
        min={min}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Түвшин"
        className="w-9 bg-transparent px-2 text-center text-xs text-white focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div className="flex flex-col border-l border-white/10">
        <button
          type="button"
          onClick={() => onChange(safeValue + 1)}
          disabled={disabled}
          tabIndex={-1}
          aria-label="Нэгээр нэмэх"
          className="flex w-5 flex-1 items-center justify-center text-white/50 transition hover:bg-violet-500/20 hover:text-violet-200 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/50"
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, safeValue - 1))}
          disabled={disabled || safeValue <= min}
          tabIndex={-1}
          aria-label="Нэгээр хасах"
          className="flex w-5 flex-1 items-center justify-center border-t border-white/10 text-white/50 transition hover:bg-violet-500/20 hover:text-violet-200 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/50"
        >
          <ChevronDown className="size-3" />
        </button>
      </div>
    </div>
  );
}

function LevelRow({
  departmentId,
  level,
  isTop,
  isBottom,
}: {
  departmentId: string;
  level: AdminDepartmentLevel;
  isTop: boolean;
  isBottom: boolean;
}) {
  const api = useAppApi();
  const patchLevel = usePatchLevelMutation(api);
  const deleteLevel = useDeleteLevelMutation(api);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(level.name);
  const [rank, setRank] = useState<number>(level.rank);
  const busy = patchLevel.isPending || deleteLevel.isPending;

  function save() {
    const patch: { name?: string; rank?: number } = {};
    if (name.trim() && name.trim() !== level.name) patch.name = name.trim();
    if (rank !== level.rank) patch.rank = rank;
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    patchLevel.mutate(
      { departmentId, levelId: level.id, patch },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleDelete() {
    if (
      !window.confirm(
        `"${level.name}" түвшинг устгах уу? Энэ түвшинд хүрсэн бүх гишүүний хандалт тасарна.`,
      )
    )
      return;
    deleteLevel.mutate({ departmentId, levelId: level.id });
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-md bg-white/[0.03] px-2 py-1.5">
        <RankStepper
          value={rank}
          onChange={setRank}
          disabled={busy}
          className="h-7"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-white focus:border-violet-400/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md bg-violet-500/20 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-500/30 disabled:opacity-50"
        >
          Хадгалах
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(level.name);
            setRank(level.rank);
          }}
          className="rounded-md px-1.5 py-1 text-white/40 hover:bg-white/5 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </li>
    );
  }

  // Glyph: top = filled diamond (vivid), middle = outline diamond, bottom = open circle.
  // Single-level dept renders as top.
  let glyph: ReactNode;
  if (isTop) {
    glyph = (
      <Diamond
        className="size-3.5 fill-violet-400 text-violet-400 drop-shadow-[0_0_4px_rgba(167,139,250,0.5)]"
        aria-hidden
      />
    );
  } else if (isBottom) {
    glyph = <Circle className="size-3 text-white/40" aria-hidden />;
  } else {
    glyph = <Diamond className="size-3.5 text-violet-300/70" aria-hidden />;
  }

  const nameClass = isTop
    ? 'font-semibold text-white'
    : isBottom
      ? 'font-medium text-white/70'
      : 'font-medium text-white/85';
  const badgeClass = isTop
    ? 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30'
    : 'bg-white/[0.04] text-white/50';
  const captionClass = isTop ? 'text-violet-300/70' : 'text-white/40';

  return (
    <li className="group relative flex items-start gap-3 py-2">
      {!isBottom && (
        <span
          aria-hidden
          className="absolute top-6 bottom-0 left-[10px] w-px bg-violet-400/25"
        />
      )}
      <span className="relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center">
        {glyph}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide',
              badgeClass,
            )}
          >
            L{level.rank}
          </span>
          <span className={cn('text-sm', nameClass)}>{level.name}</span>
        </div>
        <p className={cn('mt-0.5 text-[11px]', captionClass)}>
          {scopeCaption(level, isTop, isBottom)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Засах"
          disabled={busy}
          className="inline-flex size-7 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          title="Устгах"
          disabled={busy}
          className="inline-flex size-7 items-center justify-center rounded-md text-white/40 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </li>
  );
}

function CreateDepartmentDialog({
  onCancel,
  onSubmit,
  pending,
}: {
  onCancel: () => void;
  onSubmit: (name: string, description: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">Шинэ хэлтэс</h2>
        <p className="mt-1 text-sm text-white/60">
          Хэлтэс үүсгэсний дараа доторх түвшинүүдийг тусдаа нэмнэ.
        </p>
        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-white/60" htmlFor="dept-name">
              Нэр
            </label>
            <input
              id="dept-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Жишээ: Хүний нөөц"
              className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 focus:border-violet-400/40 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-white/60" htmlFor="dept-desc">
              Тайлбар
            </label>
            <textarea
              id="dept-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Энэ хэлтэст ямар ажилтнууд хамаарах вэ?"
              className="resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-violet-400/40 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
            >
              Болих
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:from-violet-400 hover:to-purple-500 disabled:opacity-50"
            >
              {pending ? 'Үүсгэж байна…' : 'Үүсгэх'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
