import { useState } from 'react';
import { Beaker, Brush, Code2, ShieldCheck, Send } from 'lucide-react';
import { SpotlightCard, Switch, cn } from '@app/ui';
import { useUpdateTenantMutation, useAppApi } from '@app/query';
import type { Tenant, TenantFlags } from '@app/api';

interface FlagDef {
  key: keyof TenantFlags;
  label: string;
  desc: string;
  icon: typeof ShieldCheck;
  /** Mongolian-side hint. */
  hint?: string;
}

const FLAGS: FlagDef[] = [
  { key: 'sso', label: 'SSO (Google / Microsoft)', desc: 'Single sign-on эрх. Business+ tier-т автоматаар нээгддэг.', icon: ShieldCheck },
  { key: 'api', label: 'API access', desc: 'REST API эрх. Webhook + integration build хийх боломж.', icon: Code2 },
  { key: 'telegram', label: 'Telegram bot', desc: 'Telegram-аар vault-руу chat хийх integration.', icon: Send },
  { key: 'branding', label: 'Custom branding', desc: 'Tenant-ын лого, өнгө, font-ыг chat UI-д суулгана.', icon: Brush },
  { key: 'beta', label: 'Beta features', desc: 'Heatmap analytics, multi-doc compare, agent mode.', icon: Beaker, hint: 'Тогтворгүй байж болзошгүй.' },
];

export function FlagsTab({ tenant }: { tenant: Tenant }) {
  const api = useAppApi();
  const updateMutation = useUpdateTenantMutation(api);
  const [draft, setDraft] = useState<TenantFlags>(tenant.flags);

  const dirty = (Object.keys(draft) as Array<keyof TenantFlags>).some((k) => draft[k] !== tenant.flags[k]);

  async function handleSave() {
    await updateMutation.mutateAsync({ id: tenant.id, patch: { flags: draft } });
  }

  return (
    <SpotlightCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-white">Feature flags</h2>
          <p className="text-xs text-white/40">Per-tenant toggle. Tier-ийн дотор багтсан feature-аас илүүтэйг асаах боломж.</p>
        </div>
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="rounded-md bg-[#C5F135] px-3 py-1.5 text-xs font-medium text-neutral-950 transition hover:bg-[#d6f95a] disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        )}
      </div>

      <div className="mt-5 divide-y divide-white/5 rounded-xl border border-white/10">
        {FLAGS.map((flag) => {
          const Icon = flag.icon;
          const value = draft[flag.key];
          return (
            <div key={flag.key} className="flex items-start gap-4 px-5 py-4">
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 transition',
                  value
                    ? 'bg-[#C5F135]/10 text-[#C5F135] ring-[#C5F135]/30'
                    : 'bg-white/[0.02] text-white/40 ring-white/10',
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{flag.label}</p>
                <p className="mt-0.5 text-xs text-white/50">{flag.desc}</p>
                {flag.hint && <p className="mt-1 text-[11px] text-amber-300">⚠ {flag.hint}</p>}
              </div>
              <Switch
                checked={value}
                onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, [flag.key]: checked }))}
              />
            </div>
          );
        })}
      </div>
    </SpotlightCard>
  );
}
