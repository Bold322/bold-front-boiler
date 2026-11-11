import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertOctagon, Archive, Pause, Play, RotateCcw } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, SpotlightCard, cn } from '@app/ui';
import type { Tenant } from '@app/api';
import { useArchiveTenantMutation, usePauseTenantMutation, useResumeTenantMutation, useRestoreTenantMutation, useAppApi } from '@app/query';

type Action = 'pause' | 'resume' | 'archive' | 'restore';

export function DangerTab({ tenant }: { tenant: Tenant }) {
  const api = useAppApi();
  const pauseMutation = usePauseTenantMutation(api);
  const resumeMutation = useResumeTenantMutation(api);
  const archiveMutation = useArchiveTenantMutation(api);
  const restoreMutation = useRestoreTenantMutation(api);
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState<Action | null>(null);
  const [typed, setTyped] = useState('');

  const canPause = tenant.status !== 'paused' && tenant.status !== 'archived';
  const canResume = tenant.status === 'paused';
  const canArchive = tenant.status !== 'archived';
  const canRestore = tenant.status === 'archived';

  async function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction === 'pause')   await pauseMutation.mutateAsync(tenant.id);
    if (confirmAction === 'resume')  await resumeMutation.mutateAsync(tenant.id);
    if (confirmAction === 'restore') await restoreMutation.mutateAsync(tenant.id);
    if (confirmAction === 'archive') {
      await archiveMutation.mutateAsync(tenant.id);
      navigate({ to: '/tenants' });
    }
    setConfirmAction(null);
    setTyped('');
  }

  const requiresPhrase = confirmAction === 'archive';
  const phrase = tenant.name;
  const canSubmit = !requiresPhrase || typed === phrase;

  return (
    <div className="space-y-4">
      <SpotlightCard className="border-rose-400/20 p-6">
        <div className="flex items-start gap-3">
          <AlertOctagon className="mt-0.5 size-5 shrink-0 text-rose-300" />
          <div>
            <h2 className="text-base font-medium text-rose-200">Danger zone</h2>
            <p className="mt-1 text-xs text-white/60">
              Эдгээр үйлдлүүд их хэмжээний өөрчлөлт хийнэ. Үүсгэгч мөн audit-д бичигдэнэ.
            </p>
          </div>
        </div>
      </SpotlightCard>

      <DangerAction
        title="Suspend tenant"
        desc="Tenant-ын бүх хэрэглэгч нэвтэрч чадахгүй болно. Storage үлдэнэ, billing зогсоно."
        actionLabel="Зогсоох"
        icon={Pause}
        enabled={canPause}
        accent="amber"
        onClick={() => setConfirmAction('pause')}
      />
      <DangerAction
        title="Resume tenant"
        desc="Зогссон tenant-ыг идэвхжүүлнэ. Billing шинээр эхэлнэ."
        actionLabel="Дахин эхлүүлэх"
        icon={Play}
        enabled={canResume}
        accent="emerald"
        onClick={() => setConfirmAction('resume')}
      />
      <DangerAction
        title="Archive tenant"
        desc="Tenant-ыг архивлана (soft-delete). Grace хугацаанд (default 7 хоног) сэргээж болно, дараа нь автоматаар устгагдана."
        actionLabel="Архивлах"
        icon={Archive}
        enabled={canArchive}
        accent="rose"
        onClick={() => setConfirmAction('archive')}
      />
      <DangerAction
        title="Restore tenant"
        desc="Архивласан tenant-ыг grace хугацаанд буцааж сэргээнэ."
        actionLabel="Сэргээх"
        icon={RotateCcw}
        enabled={canRestore}
        accent="emerald"
        onClick={() => setConfirmAction('restore')}
      />

      <Dialog open={confirmAction !== null} onOpenChange={(o) => { if (!o) { setConfirmAction(null); setTyped(''); } }}>
        <DialogContent className="border-white/10 bg-neutral-950/95 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'pause' && 'Tenant-ыг зогсоох уу?'}
              {confirmAction === 'resume' && 'Tenant-ыг дахин эхлүүлэх үү?'}
              {confirmAction === 'archive' && 'Tenant-ыг архивлах уу?'}
              {confirmAction === 'restore' && 'Tenant-ыг сэргээх үү?'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              <strong className="text-white">{tenant.name}</strong>{' '}
              {confirmAction === 'pause' && '— энэ tenant-ын бүх хэрэглэгч одоо нэвтэрч чадахгүй болно.'}
              {confirmAction === 'resume' && '— зогссон tenant-ыг идэвхжүүлнэ.'}
              {confirmAction === 'archive' && '— soft-delete хийнэ. Grace хугацаанд (default 7 хоног) сэргээж болно.'}
              {confirmAction === 'restore' && '— архивласан tenant-ыг буцааж идэвхжүүлнэ.'}
            </DialogDescription>
          </DialogHeader>
          {requiresPhrase && (
            <div className="space-y-2">
              <p className="text-xs text-white/60">
                Баталгаажуулахын тулд tenant-ын нэрийг яг бичнэ үү: <code className="rounded bg-white/10 px-1 font-mono text-white">{phrase}</code>
              </p>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={phrase}
                className="border-white/10 bg-white/[0.03] font-mono text-white"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setConfirmAction(null); setTyped(''); }} className="text-white/70 hover:bg-white/5">
              Болих
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canSubmit}
              className={cn(
                'text-neutral-950',
                confirmAction === 'archive' ? 'bg-rose-400 hover:bg-rose-300' : confirmAction === 'pause' ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-400 hover:bg-emerald-300',
              )}
            >
              Баталгаажуулах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DangerActionProps {
  title: string;
  desc: string;
  actionLabel: string;
  icon: typeof Pause;
  enabled: boolean;
  accent: 'amber' | 'emerald' | 'rose';
  onClick: () => void;
}

function DangerAction({ title, desc, actionLabel, icon: Icon, enabled, accent, onClick }: DangerActionProps) {
  const ACCENT = {
    amber: { btn: 'bg-amber-400 text-neutral-950 hover:bg-amber-300', icon: 'text-amber-300 bg-amber-500/10 ring-amber-400/20' },
    emerald: { btn: 'bg-emerald-400 text-neutral-950 hover:bg-emerald-300', icon: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/20' },
    rose: { btn: 'bg-rose-400 text-neutral-950 hover:bg-rose-300', icon: 'text-rose-300 bg-rose-500/10 ring-rose-400/20' },
  }[accent];
  // SpotlightCard wraps its children in an inner `<div className="relative">`,
  // so any flex className on the card itself does not reach the children.
  // Wrap content in our own flex row to lay icon | text | action horizontally.
  return (
    <SpotlightCard className="p-5">
      <div className="flex items-center gap-4">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg ring-1', ACCENT.icon)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-0.5 text-xs text-white/60">{desc}</p>
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={!enabled}
          className={cn(
            'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-30',
            ACCENT.btn,
          )}
        >
          {actionLabel}
        </button>
      </div>
    </SpotlightCard>
  );
}
