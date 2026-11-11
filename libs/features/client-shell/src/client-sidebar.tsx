import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import {
  Activity,
  Building2,
  ChevronUp,
  Home,
  LogOut,
  PanelLeft,
  Settings,
  User,
  Users,
} from 'lucide-react';
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useSidebarCollapse,
} from '@app/ui';
import { useLogoutMutation, useSessionQuery, useAppApi } from '@app/query';
import { hasAnyRole } from '@app/auth';
import { initials } from '@app/utils';

/**
 * Product navigation. Add an entry here (and a route in apps/client/src/main.tsx)
 * for every top-level feature. `to` is typed against the route tree, so a typo
 * fails typecheck.
 */
const MAIN_NAV = [
  { icon: Home, label: 'Нүүр', to: '/' as const },
  { icon: Settings, label: 'Тохиргоо', to: '/settings' as const },
];

const ADMIN_NAV = [
  { icon: Activity, label: 'Хяналт', to: '/admin' as const },
  { icon: Users, label: 'Гишүүд', to: '/admin/members' as const },
  { icon: Building2, label: 'Хэлтэс', to: '/admin/departments' as const },
];

export interface ClientSidebarProps {
  /** Reserved for feature-specific sidebar state (e.g. an active item id). */
  activeId?: string;
}

export function ClientSidebar(_props: ClientSidebarProps = {}) {
  const api = useAppApi();
  const navigate = useNavigate();
  const router = useRouter();
  const sessionQuery = useSessionQuery(api);
  const logoutMutation = useLogoutMutation(api);
  const { toggle: toggleSidebar } = useSidebarCollapse();
  const isAdmin = hasAnyRole(sessionQuery.data, ['admin', 'super-admin']);
  const currentPath = router.state.location.pathname;
  const user = sessionQuery.data?.user;

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    navigate({ to: '/login' });
  }

  return (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-baseline gap-1.5">
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
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Sidebar нуух"
          className="flex size-7 items-center justify-center rounded-md text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>

      <nav className="px-3">
        <div className="space-y-0.5">
          {MAIN_NAV.map((item) => (
            <NavButton
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={currentPath === item.to}
              onClick={() => navigate({ to: item.to })}
            />
          ))}
        </div>
      </nav>

      <div className="flex-1" />

      {isAdmin && (
        <div className="border-t border-white/5 px-3 py-3">
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
            Удирдлага
          </p>
          <div className="space-y-0.5">
            {ADMIN_NAV.map((item) => (
              <NavButton
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={currentPath === item.to}
                onClick={() => navigate({ to: item.to })}
              />
            ))}
          </div>
        </div>
      )}

      {user && (
        <div className="border-t border-white/5 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/40 to-purple-700/40 text-sm font-medium text-violet-100 ring-1 ring-white/10">
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
              <DropdownMenuLabel className="text-white/50">Хэрэглэгчийн цэс</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onSelect={() => navigate({ to: '/profile' })}
                className="cursor-pointer focus:bg-white/10 focus:text-white"
              >
                <User className="size-4" />
                Профайл
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => navigate({ to: '/settings' })}
                className="cursor-pointer focus:bg-white/10 focus:text-white"
              >
                <Settings className="size-4" />
                Тохиргоо
              </DropdownMenuItem>
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

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Home;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
        active
          ? 'bg-white/10 text-white ring-1 ring-white/10'
          : 'text-white/70 hover:bg-white/5 hover:text-white',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
