import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface SidebarCollapseValue {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseValue | null>(null);

const STORAGE_KEY = 'app:sidebar-collapsed';

function loadCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Pure client UI state for the workspace sidebar. Mirrors AppearanceProvider:
 * localStorage-persisted, no backend. WorkspaceShell reads `collapsed`; the
 * sidebar's PanelLeft button calls `toggle`.
 */
export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(loadCollapsed);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      /* ignore quota errors */
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsedState((prev) => !prev), []);
  const setCollapsed = useCallback((value: boolean) => setCollapsedState(value), []);

  const value = useMemo<SidebarCollapseValue>(
    () => ({ collapsed, toggle, setCollapsed }),
    [collapsed, toggle, setCollapsed],
  );

  return (
    <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse(): SidebarCollapseValue {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) {
    throw new Error('useSidebarCollapse must be used inside SidebarCollapseProvider');
  }
  return ctx;
}
