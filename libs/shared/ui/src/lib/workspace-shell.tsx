import type { ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { cn } from './cn';
import { HeroBackdrop } from './hero-backdrop';
import { useAppearance } from './appearance';
import { useSidebarCollapse } from './sidebar-state';

export interface WorkspaceShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  topBar?: ReactNode;
  /** Override the user's appearance blur (rarely needed). */
  backdropBlur?: number;
  className?: string;
}

export function WorkspaceShell({
  sidebar,
  children,
  topBar,
  backdropBlur,
  className,
}: WorkspaceShellProps) {
  const { settings } = useAppearance();
  const { collapsed, toggle } = useSidebarCollapse();
  const blur = backdropBlur ?? settings.heroBlur;
  const heroSrc = settings.hero === 'random' ? undefined : settings.hero;

  return (
    <div
      className={cn('relative flex h-screen w-screen overflow-hidden', 'dark', className)}
    >
      <HeroBackdrop imageSrc={heroSrc} blur={blur} />

      <div
        className={cn(
          'relative grid h-full w-full overflow-hidden bg-neutral-950/80 backdrop-blur-xl',
          'transition-[grid-template-columns] duration-200',
          collapsed ? 'grid-cols-[0_1fr]' : 'grid-cols-[280px_1fr]',
        )}
      >
        <aside
          className={cn(
            'flex h-full min-w-0 flex-col overflow-hidden border-r border-white/5 bg-neutral-950/50',
            collapsed && 'pointer-events-none border-r-0',
          )}
          aria-hidden={collapsed}
        >
          {sidebar}
        </aside>
        <main className="flex h-full flex-col overflow-hidden">
          {topBar && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
              {collapsed && (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Sidebar нээх"
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/50 transition hover:bg-white/5 hover:text-white"
                >
                  <PanelLeft className="size-4" />
                </button>
              )}
              {topBar}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
