import type { PropsWithChildren, ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '../components/sidebar';
import { AppSidebar } from '../components/sidebar/app-sidebar';

export interface ShellNavItem {
  to: string;
  label: string;
}

export function AppShell({
  title: _title,
  navItems: _navItems,
  actions: _actions,
  children,
}: PropsWithChildren<{ title: string; navItems: ShellNavItem[]; actions?: ReactNode }>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
