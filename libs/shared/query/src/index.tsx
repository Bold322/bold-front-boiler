import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { createContext, useContext } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import type {
  AccountPreferences,
  AdminDepartment,
  AdminDepartmentLevel,
  Announcement,
  AppApi,
  Invite,
  Member,
  PlanDefinition,
  Role,
  SuperAuditLogEntry,
  Tenant,
  TenantTier,
  UserProfile,
} from '@app/api';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

const ApiContext = createContext<AppApi | null>(null);

export function AppApiProvider({ api, children }: { api: AppApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useAppApi(): AppApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useAppApi must be used inside AppApiProvider');
  return api;
}

/** Centralized cache keys. Mutations invalidate by prefix, so keep the
 *  hierarchy stable: `['admin', 'departments', ...]`, `['super', 'tenant', id, ...]`. */
export const queryKeys = {
  session: ['session'] as const,
  members: ['members'] as const,
  membersAll: ['members', 'all'] as const,
  member: (id: string) => ['member', id] as const,
  tenantMembers: (tenantId: string, includeDeleted: boolean) =>
    ['super', 'tenant', tenantId, 'members', includeDeleted ? 'all' : 'active'] as const,
  invites: ['invites'] as const,
  departments: ['departments'] as const,
  adminDepartments: (includeDeprecated: boolean) =>
    ['admin', 'departments', includeDeprecated ? 'all' : 'active'] as const,
  adminLevels: (deptId: string) => ['admin', 'departments', deptId, 'levels'] as const,
  membershipAudit: (limit?: number) => ['admin', 'audit', 'membership', limit ?? 'all'] as const,
  profile: ['profile'] as const,
  preferences: ['preferences'] as const,
  // super-admin
  tenants: ['super', 'tenants'] as const,
  tenant: (id: string) => ['super', 'tenant', id] as const,
  systemHealth: ['super', 'system', 'health'] as const,
  superAuditLogs: (filter?: { tenantId?: string; severity?: string }) =>
    ['super', 'audit-logs', filter?.tenantId ?? 'all', filter?.severity ?? 'all'] as const,
  announcements: ['super', 'announcements'] as const,
  plans: ['super', 'plans'] as const,
  internalUsers: ['super', 'internal-users'] as const,
  superStats: ['super', 'stats'] as const,
};

/** Best-effort human message from an unknown thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Алдаа гарлаа. Дахин оролдоно уу.';
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
    // Single place every failed read/write surfaces to the user. Without this,
    // a backend error is silent and the UI just looks frozen. Per-hook
    // onError handlers still run in addition to these.
    queryCache: new QueryCache({
      onError: (error) => toast.error(errorMessage(error)),
    }),
    mutationCache: new MutationCache({
      onError: (error) => toast.error(errorMessage(error)),
    }),
  });
}

export function AppQueryProvider({
  client,
  children,
}: PropsWithChildren<{ client: QueryClient }>) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// ---------------------------------------------------------------------------
// Auth + session
// ---------------------------------------------------------------------------

export function useSessionQuery(api: AppApi) {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => api.getSession(),
  });
}

export function useLoginMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session, session);
    },
  });
}

export function useSignupMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.signup(email, password),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session, session);
    },
  });
}

export function useAcceptInviteMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      token,
      password,
      displayName,
    }: {
      token: string;
      password: string;
      displayName: string;
    }) => api.acceptInvite(token, password, displayName),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session, session);
    },
  });
}

export function useLogoutMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.session, { user: null });
      queryClient.clear();
    },
  });
}

export function useRequestPasswordResetMutation(api: AppApi) {
  return useMutation({ mutationFn: (email: string) => api.requestPasswordReset(email) });
}

export function useResetPasswordMutation(api: AppApi) {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      api.resetPassword(token, newPassword),
  });
}

export function useChangePasswordMutation(api: AppApi) {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.changePassword(currentPassword, newPassword),
  });
}

// ---------------------------------------------------------------------------
// Profile + preferences
// ---------------------------------------------------------------------------

export function useProfileQuery(api: AppApi) {
  return useQuery({ queryKey: queryKeys.profile, queryFn: () => api.getProfile() });
}

export function useUpdateProfileMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<UserProfile, 'email'>>) => api.updateProfile(patch),
    onSuccess: (profile: UserProfile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      // Name is mirrored into the session (sidebar/greeting read it there).
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

export function usePreferencesQuery(api: AppApi) {
  return useQuery({ queryKey: queryKeys.preferences, queryFn: () => api.getPreferences() });
}

export function useUpdatePreferencesMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AccountPreferences>) => api.updatePreferences(patch),
    onSuccess: (prefs: AccountPreferences) => {
      queryClient.setQueryData(queryKeys.preferences, prefs);
    },
  });
}

// ---------------------------------------------------------------------------
// Members + invites (tenant admin)
// ---------------------------------------------------------------------------

export function useMembersQuery(api: AppApi, opts?: { includeDeleted?: boolean }) {
  const includeDeleted = opts?.includeDeleted ?? false;
  return useQuery({
    queryKey: includeDeleted ? queryKeys.membersAll : queryKeys.members,
    queryFn: () => api.listMembers(opts),
  });
}

export function useMemberQuery(api: AppApi, id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.member(id) : ['member', 'none'],
    queryFn: () => (id ? api.getMember(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

function invalidateMembers(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.members });
  queryClient.invalidateQueries({ queryKey: queryKeys.membersAll });
}

export function useRemoveMemberMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeMember(id),
    onSuccess: () => invalidateMembers(queryClient),
  });
}

export function useRestoreMemberMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.restoreMember(id),
    onSuccess: () => invalidateMembers(queryClient),
  });
}

export function useInviteMemberMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role, levelIds }: { email: string; role: Role; levelIds?: string[] }) =>
      api.inviteMember(email, role, levelIds),
    onSuccess: () => {
      // Invites do not produce a user until accepted; refetch the invites
      // panel and also members in case the recipient accepts this session.
      queryClient.invalidateQueries({ queryKey: queryKeys.invites });
      invalidateMembers(queryClient);
    },
  });
}

export function useBulkInviteMembersMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.bulkInviteMembers(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites });
      invalidateMembers(queryClient);
    },
  });
}

export function useSetUserTypeMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userType }: { id: string; userType: 'admin' | 'worker' }) =>
      api.setUserType(id, userType),
    onSuccess: (_void, { id, userType }) => {
      queryClient.setQueryData<Member[] | undefined>(queryKeys.members, (prev) =>
        prev ? prev.map((m) => (m.id === id ? { ...m, userType } : m)) : prev,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.member(id) });
    },
  });
}

export function useInvitesQuery(api: AppApi) {
  return useQuery({
    queryKey: queryKeys.invites,
    queryFn: () => api.listInvites(),
  });
}

export function useRevokeInviteMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeInvite(id),
    onSuccess: (_void, id) => {
      queryClient.setQueryData<Invite[] | undefined>(queryKeys.invites, (prev) =>
        prev ? prev.filter((i) => i.id !== id) : prev,
      );
    },
  });
}

export function useResendInviteMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.resendInvite(id),
    onSuccess: (inv: Invite) => {
      queryClient.setQueryData<Invite[] | undefined>(queryKeys.invites, (prev) =>
        prev ? prev.map((i) => (i.id === inv.id ? inv : i)) : prev,
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Super-admin cross-tenant members
// ---------------------------------------------------------------------------

export function useTenantMembersQuery(
  api: AppApi,
  tenantId: string,
  opts?: { includeDeleted?: boolean },
) {
  const includeDeleted = opts?.includeDeleted ?? false;
  return useQuery({
    queryKey: queryKeys.tenantMembers(tenantId, includeDeleted),
    queryFn: () => api.listTenantMembers(tenantId, opts),
    enabled: !!tenantId,
  });
}

function invalidateTenantMembers(queryClient: ReturnType<typeof useQueryClient>, tenantId: string) {
  queryClient.invalidateQueries({ queryKey: ['super', 'tenant', tenantId, 'members'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
}

export function useInviteTenantMemberMutation(api: AppApi, tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, userType }: { email: string; userType: 'admin' | 'worker' }) =>
      api.inviteTenantMember(tenantId, email, userType),
    onSuccess: () => invalidateTenantMembers(queryClient, tenantId),
  });
}

export function useRemoveTenantMemberMutation(api: AppApi, tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.removeTenantMember(tenantId, userId),
    onSuccess: () => invalidateTenantMembers(queryClient, tenantId),
  });
}

export function useRestoreTenantMemberMutation(api: AppApi, tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.restoreTenantMember(tenantId, userId),
    onSuccess: () => invalidateTenantMembers(queryClient, tenantId),
  });
}

// ---------------------------------------------------------------------------
// Departments + levels
// ---------------------------------------------------------------------------

export function useDepartmentsQuery(api: AppApi) {
  return useQuery({
    queryKey: queryKeys.departments,
    queryFn: () => api.listDepartments(),
  });
}

export function useGrantLevelMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, levelId }: { userId: string; levelId: string }) =>
      api.grantLevel(userId, levelId),
    onSuccess: (_void, { userId }) => {
      invalidateMembers(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.member(userId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit', 'membership'] });
    },
  });
}

export function useRevokeLevelMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, levelId }: { userId: string; levelId: string }) =>
      api.revokeLevel(userId, levelId),
    onSuccess: (_void, { userId }) => {
      invalidateMembers(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.member(userId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit', 'membership'] });
    },
  });
}

export function useMembershipAuditQuery(api: AppApi, limit?: number) {
  return useQuery({
    queryKey: queryKeys.membershipAudit(limit),
    queryFn: () => api.listMembershipAudit(limit),
  });
}

export function useAdminDepartmentsQuery(api: AppApi, includeDeprecated = false) {
  return useQuery({
    queryKey: queryKeys.adminDepartments(includeDeprecated),
    queryFn: () => api.listAdminDepartments(includeDeprecated),
  });
}

export function useCreateDepartmentMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) => api.createDepartment(input),
    onSuccess: (dept: AdminDepartment) => {
      queryClient.setQueryData<AdminDepartment[] | undefined>(
        queryKeys.adminDepartments(false),
        (prev) => (prev ? [...prev, dept] : [dept]),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDepartments(true) });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    },
  });
}

export function usePatchDepartmentMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { description?: string; deprecated?: boolean };
    }) => api.patchDepartment(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    },
  });
}

export function useDeleteDepartmentMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    },
  });
}

export function useAdminLevelsQuery(api: AppApi, departmentId: string | undefined) {
  return useQuery({
    queryKey: departmentId ? queryKeys.adminLevels(departmentId) : ['admin', 'levels', 'none'],
    queryFn: () => (departmentId ? api.listAdminLevels(departmentId) : Promise.resolve([])),
    enabled: Boolean(departmentId),
  });
}

export function useCreateLevelMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      departmentId,
      input,
    }: {
      departmentId: string;
      input: { name: string; rank: number };
    }) => api.createLevel(departmentId, input),
    onSuccess: (lvl: AdminDepartmentLevel) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminLevels(lvl.departmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    },
  });
}

export function usePatchLevelMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      departmentId,
      levelId,
      patch,
    }: {
      departmentId: string;
      levelId: string;
      patch: { name?: string; rank?: number };
    }) => api.patchLevel(departmentId, levelId, patch),
    onSuccess: (lvl: AdminDepartmentLevel) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminLevels(lvl.departmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    },
  });
}

export function useDeleteLevelMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, levelId }: { departmentId: string; levelId: string }) =>
      api.deleteLevel(departmentId, levelId),
    onSuccess: (_void, { departmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminLevels(departmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments });
    },
  });
}

// ---------------------------------------------------------------------------
// Super-admin console
// ---------------------------------------------------------------------------

export function useTenantsQuery(api: AppApi) {
  return useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.listTenants(),
  });
}

export function useTenantQuery(api: AppApi, id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.tenant(id) : ['super', 'tenant', 'none'],
    queryFn: () => (id ? api.getTenant(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useCreateTenantMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slug: string; adminEmail: string }) =>
      api.createTenant(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
      queryClient.invalidateQueries({ queryKey: queryKeys.superStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.superAuditLogs() });
    },
  });
}

export function useUpdateTenantMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Tenant> }) => api.updateTenant(id, patch),
    onSuccess: (tenant) => {
      queryClient.setQueryData(queryKeys.tenant(tenant.id), tenant);
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
    },
  });
}

function useTenantLifecycleMutation(
  api: AppApi,
  fn: (id: string) => Promise<Tenant>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (tenant) => {
      queryClient.setQueryData(queryKeys.tenant(tenant.id), tenant);
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
      queryClient.invalidateQueries({ queryKey: queryKeys.superAuditLogs() });
    },
  });
}

export function usePauseTenantMutation(api: AppApi) {
  return useTenantLifecycleMutation(api, (id) => api.pauseTenant(id));
}

export function useResumeTenantMutation(api: AppApi) {
  return useTenantLifecycleMutation(api, (id) => api.resumeTenant(id));
}

export function useRestoreTenantMutation(api: AppApi) {
  return useTenantLifecycleMutation(api, (id) => api.restoreTenant(id));
}

export function useArchiveTenantMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
      queryClient.invalidateQueries({ queryKey: queryKeys.superAuditLogs() });
    },
  });
}

export function useSystemHealthQuery(api: AppApi) {
  return useQuery({
    queryKey: queryKeys.systemHealth,
    queryFn: () => api.getSystemHealth(),
    staleTime: 5_000,
  });
}

export function useSuperAuditLogsQuery(
  api: AppApi,
  filter?: { tenantId?: string; severity?: SuperAuditLogEntry['severity'] },
) {
  return useQuery({
    queryKey: queryKeys.superAuditLogs(filter),
    queryFn: () => api.listSuperAuditLogs(filter),
  });
}

export function useAnnouncementsQuery(api: AppApi) {
  return useQuery({
    queryKey: queryKeys.announcements,
    queryFn: () => api.listAnnouncements(),
  });
}

export function useCreateAnnouncementMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Announcement, 'id' | 'status' | 'createdBy'>) =>
      api.createAnnouncement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
    },
  });
}

export function useDeleteAnnouncementMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
    },
  });
}

export function usePlansQuery(api: AppApi) {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: () => api.listPlans(),
  });
}

export function useUpdatePlanMutation(api: AppApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: TenantTier; patch: Partial<PlanDefinition> }) =>
      api.updatePlan(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans });
    },
  });
}

export function useInternalUsersQuery(api: AppApi) {
  return useQuery({
    queryKey: queryKeys.internalUsers,
    queryFn: () => api.listInternalUsers(),
  });
}

export function useSuperAdminStatsQuery(api: AppApi) {
  return useQuery({
    queryKey: queryKeys.superStats,
    queryFn: () => api.getSuperAdminStats(),
  });
}
