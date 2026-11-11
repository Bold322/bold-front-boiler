import type { ComponentType } from 'react';
import {
  Activity,
  AlertOctagon,
  LayoutDashboard,
  ShieldCheck,
  ToggleLeft,
  Users,
} from 'lucide-react';

export type TenantTabKey = 'overview' | 'members' | 'activity' | 'flags' | 'danger';

export interface TenantTabDef {
  key: TenantTabKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Special accent (used for the danger zone). */
  variant?: 'warning' | 'danger';
}

export const TENANT_TABS: TenantTabDef[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'flags', label: 'Flags', icon: ToggleLeft },
  { key: 'danger', label: 'Danger zone', icon: AlertOctagon, variant: 'danger' },
];

export { ShieldCheck };
