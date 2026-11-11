import { StrictMode, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useNavigate,
} from '@tanstack/react-router';
import { createApiClient, createMockApiClient, type AppApi } from '@app/api';
import { AuthProvider, hasAnyRole } from '@app/auth';
import { readAppConfig } from '@app/config';
import {
  createAppQueryClient,
  useAcceptInviteMutation,
  useLoginMutation,
  useRequestPasswordResetMutation,
  useSessionQuery,
  useSignupMutation,
  AppApiProvider,
  AppQueryProvider,
} from '@app/query';
import { AppearanceProvider, SidebarCollapseProvider } from '@app/ui';
import { Toaster } from 'sonner';
import {
  AcceptInvitePage,
  ForgotPasswordPage,
  LoginPage,
  SignupPage,
} from '@app/features-auth';
import { HomePage, SettingsPage } from '@app/features-client-shell';
import { DepartmentsPage, EnterpriseAdminPage, MembersPage } from '@app/features-enterprise-admin';
import './styles.css';

// VITE_USE_MOCK=true -> in-memory MockApiClient (no backend); otherwise the real
// ApiClient against VITE_API_BASE_URL. Everything downstream only sees AppApi.
const useMock = import.meta.env['VITE_USE_MOCK'] === 'true';
const api: AppApi = useMock
  ? createMockApiClient()
  : createApiClient(readAppConfig(import.meta.env));
const queryClient = createAppQueryClient();

/** Where a freshly authenticated user lands. */
const HOME_PATH = '/' as const;

function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-sm text-white/60">
      Ачааллаж байна...
    </div>
  );
}

/** Requires a session; bounces to /login otherwise. Wraps every product route. */
function ClientLayout() {
  const sessionQuery = useSessionQuery(api);
  const navigate = useNavigate();
  const session = sessionQuery.data;
  const isUnauthed = !sessionQuery.isLoading && !session?.user;

  useEffect(() => {
    if (isUnauthed) {
      navigate({ to: '/login', replace: true });
    }
  }, [isUnauthed, navigate]);

  if (sessionQuery.isLoading || !session?.user) {
    return <Loading />;
  }

  return (
    <AuthProvider value={{ session, isLoading: false }}>
      <Outlet />
    </AuthProvider>
  );
}

/** Requires the admin or super-admin role. Nested under ClientLayout. */
function AdminGuard() {
  const sessionQuery = useSessionQuery(api);

  if (sessionQuery.isLoading) {
    return <Loading />;
  }

  if (!hasAnyRole(sessionQuery.data, ['admin', 'super-admin'])) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Эрх хүрэхгүй</h1>
          <p className="mt-2 text-sm text-white/60">
            Энэ хэсэгт нэвтрэхэд админ эрх шаардлагатай.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

function SignupRoute() {
  const navigate = useNavigate();
  const signupMutation = useSignupMutation(api);
  return (
    <SignupPage
      onSubmit={async ({ email, password }) => {
        await signupMutation.mutateAsync({ email, password });
        navigate({ to: HOME_PATH });
      }}
    />
  );
}

// The BE Google callback bounces failures to /login?error=<code>.
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_no_account: 'Энэ Google хаягт бүртгэл олдсонгүй. Админаасаа урилга авна уу.',
  google_unverified: 'Google хаягийн имэйл баталгаажаагүй байна.',
  google_denied: 'Google нэвтрэлт цуцлагдлаа.',
  google_failed: 'Google-ээр нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.',
};

function LoginRoute() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation(api);
  // googleLoginUrl() is null when the BE has Google sign-in disabled (and in
  // the mock); hiding the button keeps the screen honest.
  const googleUrl = api.googleLoginUrl();
  const googleErrorCode = new URLSearchParams(window.location.search).get('error');
  const googleError = googleErrorCode
    ? (GOOGLE_ERROR_MESSAGES[googleErrorCode] ?? GOOGLE_ERROR_MESSAGES['google_failed'])
    : undefined;
  return (
    <LoginPage
      error={
        googleError ??
        (loginMutation.isError
          ? loginMutation.error instanceof Error
            ? loginMutation.error.message
            : 'Нэвтрэхэд алдаа гарлаа'
          : undefined)
      }
      onGoogle={googleUrl ? () => window.location.assign(googleUrl) : undefined}
      onSubmit={async ({ email, password }) => {
        await loginMutation.mutateAsync({ email, password });
        navigate({ to: HOME_PATH });
      }}
    />
  );
}

// Landing target for the backend Google callback: it redirects the browser to
// /auth/google/done#token=<jwt>. Persist the token and bounce home; a missing
// token means something went wrong, so fall back to /login.
function GoogleDoneRoute() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
    if (token) {
      api.setToken(token);
      window.location.replace(HOME_PATH);
    } else {
      window.location.replace('/login?error=google_failed');
    }
  }, []);
  return null;
}

function ForgotPasswordRoute() {
  const resetMutation = useRequestPasswordResetMutation(api);
  return (
    <ForgotPasswordPage
      onSubmit={async (email) => {
        await resetMutation.mutateAsync(email);
      }}
    />
  );
}

// Landing target for emailed invite links ({FRONTEND_BASE_URL}/invite?token=).
// Sets password + display name -> POST /auth/accept-invite -> logged in.
function AcceptInviteRoute() {
  const navigate = useNavigate();
  const acceptMutation = useAcceptInviteMutation(api);
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  return (
    <AcceptInvitePage
      hasToken={token.length > 0}
      pending={acceptMutation.isPending}
      error={
        acceptMutation.isError
          ? 'Урилга хүчингүй эсвэл хугацаа нь дууссан байна.'
          : undefined
      }
      onSubmit={async ({ displayName, password }) => {
        await acceptMutation.mutateAsync({ token, password, displayName });
        navigate({ to: HOME_PATH });
      }}
    />
  );
}

/**
 * Route tree is code-defined (no file-based routing). Public routes sit
 * directly under the root; product routes nest under `_app` (ClientLayout);
 * admin routes nest further under `/admin` (AdminGuard).
 */
function ClientApp() {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: () => <Outlet /> });

    // --- public ---
    const signupRoute = createRoute({ getParentRoute: () => rootRoute, path: '/signup', component: SignupRoute });
    const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginRoute });
    const forgotPasswordRoute = createRoute({ getParentRoute: () => rootRoute, path: '/forgot-password', component: ForgotPasswordRoute });
    const acceptInviteRoute = createRoute({ getParentRoute: () => rootRoute, path: '/invite', component: AcceptInviteRoute });
    const googleDoneRoute = createRoute({ getParentRoute: () => rootRoute, path: '/auth/google/done', component: GoogleDoneRoute });

    // --- authed ---
    const appLayoutRoute = createRoute({ getParentRoute: () => rootRoute, id: '_app', component: ClientLayout });
    const indexRoute = createRoute({ getParentRoute: () => appLayoutRoute, path: '/', component: HomePage });
    const settingsRoute = createRoute({ getParentRoute: () => appLayoutRoute, path: '/settings', component: SettingsPage });
    const profileRoute = createRoute({
      getParentRoute: () => appLayoutRoute,
      path: '/profile',
      component: () => <SettingsPage initialCategory="profile" />,
    });

    // --- admin ---
    const adminRoute = createRoute({ getParentRoute: () => appLayoutRoute, path: '/admin', component: AdminGuard });
    const adminIndexRoute = createRoute({ getParentRoute: () => adminRoute, path: '/', component: EnterpriseAdminPage });
    const membersRoute = createRoute({ getParentRoute: () => adminRoute, path: '/members', component: MembersPage });
    const departmentsRoute = createRoute({ getParentRoute: () => adminRoute, path: '/departments', component: DepartmentsPage });

    rootRoute.addChildren([
      signupRoute,
      loginRoute,
      forgotPasswordRoute,
      acceptInviteRoute,
      googleDoneRoute,
      appLayoutRoute.addChildren([
        indexRoute,
        settingsRoute,
        profileRoute,
        adminRoute.addChildren([adminIndexRoute, membersRoute, departmentsRoute]),
      ]),
    ]);
    return createRouter({ routeTree: rootRoute });
  }, []);

  return <RouterProvider router={router} />;
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppearanceProvider>
      <SidebarCollapseProvider>
        <AppApiProvider api={api}>
          <AppQueryProvider client={queryClient}>
            <ClientApp />
            <Toaster theme="dark" position="top-center" richColors />
          </AppQueryProvider>
        </AppApiProvider>
      </SidebarCollapseProvider>
    </AppearanceProvider>
  </StrictMode>,
);
