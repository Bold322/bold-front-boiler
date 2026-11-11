import { StrictMode, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider,
  useParams,
} from '@tanstack/react-router';
import { createApiClient, createMockApiClient, type Role, type AppApi } from '@app/api';
import { AuthProvider, hasAnyRole } from '@app/auth';
import { LoginPage } from '@app/features-auth';
import { readAppConfig } from '@app/config';
import {
  createAppQueryClient,
  useLoginMutation,
  useSessionQuery,
  AppApiProvider,
  AppQueryProvider,
} from '@app/query';
import { AppearanceProvider, SidebarCollapseProvider } from '@app/ui';
import {
  AccessGate,
  AnnouncementsPage,
  AuditPage,
  ConfigPage,
  SystemPage,
  TenantDetailPage,
  TenantsPage,
  type TenantTabKey,
} from '@app/features-ops';
import './styles.css';

// Super-admin app is internal-only. With VITE_USE_MOCK=true (default) it runs
// against the in-memory mock and auto-bootstraps a session so the console is
// fully explorable with no backend. With VITE_USE_MOCK=false it talks to the
// real API and requires a real platform-superadmin login: the BE resolves
// the user by email alone (users.email is globally UNIQUE) and the JWT
// carries user_type='superadmin' so this app's RootGate accepts the session.
const useMock = (import.meta.env['VITE_USE_MOCK'] ?? 'true') !== 'false';
const api: AppApi = useMock
  ? createMockApiClient()
  : createApiClient(readAppConfig(import.meta.env));
const queryClient = createAppQueryClient();

function SuperAdminLogin() {
  const loginMutation = useLoginMutation(api);
  return (
    <LoginPage
      error={
        loginMutation.isError
          ? loginMutation.error instanceof Error
            ? loginMutation.error.message
            : 'Нэвтрэхэд алдаа гарлаа'
          : undefined
      }
      onSubmit={({ email, password }) => loginMutation.mutate({ email, password })}
    />
  );
}

function RootGate() {
  const sessionQuery = useSessionQuery(api);
  const session = sessionQuery.data;
  const loginMutation = useLoginMutation(api);

  // Auto-bootstrap a super-admin session against the mock so we don't need a
  // login UI inside this console (no public surface anyway).
  useEffect(() => {
    if (!useMock) return;
    if (sessionQuery.isLoading) return;
    if (session?.user) return;
    loginMutation.mutate({ email: 'super@example.com', password: 'mock' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionQuery.isLoading, session?.user]);

  if (sessionQuery.isLoading || (useMock && !session?.user)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-sm text-white/60">
        Ачааллаж байна...
      </div>
    );
  }

  // Real-backend mode with no session: show the platform-superadmin login.
  if (!useMock && !session?.user) {
    return <SuperAdminLogin />;
  }

  // For mock mode we forcibly grant super-admin to the bootstrap user.
  const effectiveSession = useMock && session?.user
    ? { user: { ...session.user, roles: ['user', 'admin', 'super-admin'] as Role[] } }
    : session;

  if (!hasAnyRole(effectiveSession, ['super-admin'])) {
    return <AccessGate />;
  }

  return (
    <AuthProvider value={{ session: effectiveSession, isLoading: false }}>
      <Outlet />
    </AuthProvider>
  );
}

function TenantDetailRoute() {
  const { tenantId, tab } = useParams({ from: '/tenants/$tenantId/$tab' }) as { tenantId: string; tab: TenantTabKey };
  return <TenantDetailPage tenantId={tenantId} tab={tab} />;
}

function TenantDetailIndexRoute() {
  const { tenantId } = useParams({ from: '/tenants/$tenantId' }) as { tenantId: string };
  return <TenantDetailPage tenantId={tenantId} tab="overview" />;
}

function SuperAdminApp() {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: RootGate });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      beforeLoad: () => { throw redirect({ to: '/tenants' }); },
    });
    const tenantsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tenants', component: TenantsPage });
    const tenantDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tenants/$tenantId', component: TenantDetailIndexRoute });
    const tenantDetailTabRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tenants/$tenantId/$tab', component: TenantDetailRoute });
    const systemRoute = createRoute({ getParentRoute: () => rootRoute, path: '/system', component: SystemPage });
    const auditRoute = createRoute({ getParentRoute: () => rootRoute, path: '/audit', component: AuditPage });
    const announcementsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/announcements', component: AnnouncementsPage });
    const configRoute = createRoute({ getParentRoute: () => rootRoute, path: '/config', component: ConfigPage });

    rootRoute.addChildren([
      indexRoute,
      tenantsRoute,
      tenantDetailRoute,
      tenantDetailTabRoute,
      systemRoute,
      auditRoute,
      announcementsRoute,
      configRoute,
    ]);
    return createRouter({ routeTree: rootRoute });
  }, []);

  return <RouterProvider router={router} />;
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppQueryProvider client={queryClient}>
      <AppApiProvider api={api}>
        <AppearanceProvider>
          <SidebarCollapseProvider>
            <SuperAdminApp />
          </SidebarCollapseProvider>
        </AppearanceProvider>
      </AppApiProvider>
    </AppQueryProvider>
  </StrictMode>,
);
