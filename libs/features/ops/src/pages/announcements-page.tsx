import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Megaphone, Plus, Trash2, Wrench } from 'lucide-react';
import {
  AmbientDotField,
  AnimatedList,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  GradientText,
  Input,
  Label,
  Marquee,
  SpotlightCard,
  Textarea,
  WorkspaceShell,
  cn,
} from '@app/ui';
import {
  useAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useAppApi,
} from '@app/query';
import type { Announcement, AnnouncementSeverity, AnnouncementTarget, TenantTier } from '@app/api';
import { SuperAdminSidebar } from '../components/super-admin-sidebar';
import { formatDateTime, TIER_LABEL } from '../lib/format';

const SEVERITY_META: Record<AnnouncementSeverity, { label: string; icon: typeof Info; cls: string; dot: string }> = {
  info: { label: 'Info', icon: Info, cls: 'border-sky-400/30 bg-sky-500/[0.04] text-sky-200', dot: 'bg-sky-400' },
  warning: { label: 'Warning', icon: AlertTriangle, cls: 'border-amber-400/30 bg-amber-500/[0.04] text-amber-200', dot: 'bg-amber-400' },
  maintenance: { label: 'Maintenance', icon: Wrench, cls: 'border-violet-400/30 bg-violet-500/[0.06] text-violet-200', dot: 'bg-violet-400' },
};

const STATUS_LABEL: Record<Announcement['status'], string> = {
  scheduled: 'Хуваарьт',
  live: 'Идэвхтэй',
  ended: 'Дууссан',
};

export function AnnouncementsPage() {
  const api = useAppApi();
  const announcementsQuery = useAnnouncementsQuery(api);
  const createMutation = useCreateAnnouncementMutation(api);
  const deleteMutation = useDeleteAnnouncementMutation(api);
  const [composeOpen, setComposeOpen] = useState(false);

  const announcements = announcementsQuery.data ?? [];
  const liveOnes = announcements.filter((a) => a.status === 'live');

  return (
    <WorkspaceShell sidebar={<SuperAdminSidebar />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col gap-8 px-8 py-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                <Megaphone className="size-3" />
                System announcements
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                <GradientText>Зарлал</GradientText> ба banner
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Tenant-уудад зарлах message — бүгдэд, tier-ээр эсвэл сонгомол tenant-уудад.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="bg-[#C5F135] text-neutral-950 hover:bg-[#d6f95a]"
            >
              <Plus className="size-4" />
              Шинэ зарлал
            </Button>
          </header>

          {liveOnes.length > 0 && (
            <SpotlightCard className="overflow-hidden p-0">
              <div className="border-b border-white/10 px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Live preview</p>
              </div>
              <Marquee durationSec={60} className="py-4">
                {liveOnes.map((a) => {
                  const Icon = SEVERITY_META[a.severity].icon;
                  return (
                    <div key={a.id} className={cn('flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs', SEVERITY_META[a.severity].cls)}>
                      <Icon className="size-3.5" />
                      <span className="font-medium">{a.title}</span>
                      <span className="text-white/40">·</span>
                      <span className="text-white/60">{targetLabel(a)}</span>
                    </div>
                  );
                })}
              </Marquee>
            </SpotlightCard>
          )}

          {announcementsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
              <AlertCircle className="size-8 text-white/20" />
              <p className="text-sm text-white/50">Идэвхтэй зарлал алга.</p>
            </div>
          ) : (
            <AnimatedList
              items={announcements}
              getKey={(a) => a.id}
              className="space-y-2"
              render={(a) => {
                const meta = SEVERITY_META[a.severity];
                const Icon = meta.icon;
                return (
                  <SpotlightCard className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border', meta.cls)}>
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="text-base font-semibold text-white">{a.title}</h3>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1', meta.cls)}>
                            {meta.label}
                          </span>
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60 ring-1 ring-white/10">
                            {STATUS_LABEL[a.status]}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-white/70">{a.body}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40">
                          <span>Хүлээн авагч: {targetLabel(a)}</span>
                          <span>·</span>
                          <span>Эхэлнэ: {formatDateTime(a.startsAt)}</span>
                          {a.endsAt && <><span>·</span><span>Дуусна: {formatDateTime(a.endsAt)}</span></>}
                          <span>·</span>
                          <span>by {a.createdBy}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(a.id)}
                        className="rounded-md p-1.5 text-white/40 transition hover:bg-rose-500/10 hover:text-rose-300"
                        aria-label="Устгах"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </SpotlightCard>
                );
              }}
            />
          )}
        </div>
      </div>
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input);
          setComposeOpen(false);
        }}
        submitting={createMutation.isPending}
      />
    </WorkspaceShell>
  );
}

function targetLabel(a: Announcement): string {
  if (a.target === 'all') return 'Бүх tenant';
  if (a.target === 'tier' && a.targetTier) return `${TIER_LABEL[a.targetTier]} tier`;
  if (a.target === 'tenants') return `${a.targetTenantIds?.length ?? 0} сонгосон tenant`;
  return '—';
}

function ComposeDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<Announcement, 'id' | 'status' | 'createdBy'>) => Promise<void>;
  submitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<AnnouncementSeverity>('info');
  const [target, setTarget] = useState<AnnouncementTarget>('all');
  const [targetTier, setTargetTier] = useState<TenantTier>('growth');
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-neutral-950/95 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Шинэ зарлал</DialogTitle>
          <DialogDescription className="text-white/60">
            Tenant-уудад харагдах banner / system message үүсгэх.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ann-title" className="text-white/70">Гарчиг</Label>
            <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 border-white/10 bg-white/[0.03] text-white" />
          </div>
          <div>
            <Label htmlFor="ann-body" className="text-white/70">Агуулга</Label>
            <Textarea id="ann-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1.5 border-white/10 bg-white/[0.03] text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70">Severity</Label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AnnouncementSeverity)}
                className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-white/[0.03] px-2 text-sm text-white"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <Label className="text-white/70">Target</Label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as AnnouncementTarget)}
                className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-white/[0.03] px-2 text-sm text-white"
              >
                <option value="all">Бүгд</option>
                <option value="tier">Tier-ээр</option>
                <option value="tenants">Сонгомол tenants</option>
              </select>
            </div>
          </div>
          {target === 'tier' && (
            <div>
              <Label className="text-white/70">Tier</Label>
              <select
                value={targetTier}
                onChange={(e) => setTargetTier(e.target.value as TenantTier)}
                className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-white/[0.03] px-2 text-sm text-white"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70">Эхэлнэ</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1.5 border-white/10 bg-white/[0.03] text-white" />
            </div>
            <div>
              <Label className="text-white/70">Дуусна (optional)</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-1.5 border-white/10 bg-white/[0.03] text-white" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/70 hover:bg-white/5">
            Болих
          </Button>
          <Button
            disabled={!title.trim() || !body.trim() || submitting}
            onClick={() =>
              onSubmit({
                title,
                body,
                severity,
                target,
                targetTier: target === 'tier' ? targetTier : undefined,
                targetTenantIds: target === 'tenants' ? [] : undefined,
                startsAt: new Date(startsAt).toISOString(),
                endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
              })
            }
            className="bg-[#C5F135] text-neutral-950 hover:bg-[#d6f95a]"
          >
            {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
