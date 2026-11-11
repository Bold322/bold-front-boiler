import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import {
  Activity,
  Building2,
  ChevronUp,
  LogOut,
  Megaphone,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/ui';
import { useLogoutMutation, useSessionQuery, useTenantsQuery, useAppApi } from '@app/query';
import { TIER_LABEL } from '../lib/format';

const TOP_NAV = [
  { icon: Building2, label: 'Тенант',  to: '/tenants' as const,        match: (p: string) => p === '/' || p.startsWith('/tenants') },
  { icon: Activity,   label: 'Систем',  to: '/system' as const,         match: (p: string) => p.startsWith('/system') },
  { icon: ScrollText, label: 'Аудит',   to: '/audit' as const,          match: (p: string) => p.startsWith('/audit') },
  { icon: Megaphone,  label: 'Зарлал',  to: '/announcements' as const,  match: (p: string) => p.startsWith('/announcements') },
  { icon: Settings2,  label: 'Тохиргоо', to: '/config' as const,        match: (p: string) => p.startsWith('/config') },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function SuperAdminSidebar() {
  const api = useAppApi();
  const navigate = useNavigate();
  const router = useRouter();
  const sessionQuery = useSessionQuery(api);
  const tenantsQuery = useTenantsQuery(api);
  const logoutMutation = useLogoutMutation(api);
  const currentPath = router.state.location.pathname;
  const user = sessionQuery.data?.user;

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    navigate({ to: '/' });
  }

  const tenants = tenantsQuery.data ?? [];
  const recentTenants = [...tenants]
    .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
    .slice(0, 5);

  return (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/tenants" className="flex items-baseline gap-1.5">
          <span
            style={{ fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 800 }}
            className="text-xl leading-none tracking-tight text-white"
          >
            App.
          </span>
          <span className="text-sm font-medium leading-none tracking-tight text-white/60">
            Platform
          </span>
        </Link>
        <span className="inline-flex items-center gap-1 rounded-md border border-[#C5F135]/30 bg-[#C5F135]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#C5F135]">
          <ShieldCheck className="size-3" />
          Super
        </span>
      </div>

      <nav className="px-3">
        <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
          Хяналт
        </p>
        <div className="space-y-0.5">
          {TOP_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(currentPath);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate({ to: item.to })}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-white/10 text-white ring-1 ring-white/10'
                    : 'text-white/70 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {recentTenants.length > 0 && (
        <div className="mt-6 px-3">
          <p className="flex items-center gap-1.5 px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
            <Sparkles className="size-3" />
            Сүүлд идэвхтэй
          </p>
          <div className="space-y-0.5">
            {recentTenants.map((tenant) => {
              const isActive = currentPath === `/tenants/${tenant.id}` || currentPath.startsWith(`/tenants/${tenant.id}/`);
              return (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => navigate({ to: '/tenants/$tenantId', params: { tenantId: tenant.id } })}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition',
                    isActive
                      ? 'bg-white/10 text-white ring-1 ring-white/10'
                      : 'text-white/70 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span className="text-base leading-none">{tenant.logoEmoji ?? '🏢'}</span>
                  <span className="min-w-0 flex-1 truncate">{tenant.name}</span>
                  <span className="font-mono text-[10px] text-white/30 uppercase">{TIER_LABEL[tenant.tier].slice(0, 3)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {user && (
        <div className="border-t border-white/5 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C5F135]/30 to-emerald-500/30 text-sm font-medium text-[#C5F135] ring-1 ring-[#C5F135]/20">
                  {initials(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{user.name}</p>
                  <p className="truncate text-[11px] text-white/40">{user.email}</p>
                </div>
                <ChevronUp className="size-4 shrink-0 text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              sideOffset={8}
              className="w-56 border-white/10 bg-neutral-900 text-white"
            >
              <DropdownMenuLabel className="text-white/50">Super-admin</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onSelect={handleLogout}
                className="cursor-pointer text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
              >
                <LogOut className="size-4" />
                Гарах
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  );
}
