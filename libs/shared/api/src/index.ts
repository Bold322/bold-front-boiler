import type { AppConfig } from '@app/config';
import {
  buildSuperAdminStats,
  MOCK_ANNOUNCEMENTS,
  MOCK_INTERNAL_USERS,
  MOCK_PLANS,
  MOCK_SUPER_AUDIT,
  MOCK_SYSTEM_HEALTH,
  MOCK_TENANTS,
  type Announcement,
  type InternalUser,
  type PlanDefinition,
  type SuperAdminApi,
  type SuperAdminStats,
  type SuperAuditLogEntry,
  type SystemHealth,
  type Tenant,
  type TenantStatus,
  type TenantTier,
} from './super-admin';

export * from './super-admin';

// ---------------------------------------------------------------------------
// Session + roles
// ---------------------------------------------------------------------------

export type Role = 'user' | 'admin' | 'super-admin';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  tenantId?: string;
}

export interface Session {
  user: SessionUser | null;
}

// --- Real-API auth plumbing -------------------------------------------------
// The backend issues a short-lived bearer JWT (access token) from
// POST /auth/login and the Google callback, plus a rotating httpOnly refresh
// cookie (Path=/auth, sent only to the auth endpoints). We persist the access
// token in localStorage so a page reload keeps the session; the XSS tradeoff
// is accepted for this app. On a 401 the transport silently calls POST
// /auth/refresh (single-flight) to mint a fresh access token and retries the
// request once; only a failed refresh (a dead session) clears the token and
// forces re-authentication. (The mock keeps its own in-memory session.)
const TOKEN_STORAGE_KEY = 'app:token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* private mode / no storage: degrade to unauthenticated */
  }
}

/** Thrown by the request helpers on HTTP 401 so getSession can self-heal. */
class ApiAuthError extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'ApiAuthError';
  }
}

/** Shape returned by POST /auth/login (`user`) and GET /me. */
interface ApiPublicUser {
  id: string;
  email: string;
  display_name: string;
  user_type: 'admin' | 'worker' | 'superadmin';
  memberships?: unknown[];
}

/** Decode the unverified tenant_id claim from a JWT, for display only. */
function tenantIdFromJwt(token: string): string | undefined {
  try {
    const seg = token.split('.')[1];
    if (!seg) return undefined;
    const json = JSON.parse(atob(seg.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.tenant_id === 'string' ? json.tenant_id : undefined;
  } catch {
    return undefined;
  }
}

// API user_type -> frontend roles. Roles are additive: every user is 'user';
// admins also get 'admin'; the platform superadmin also gets 'super-admin'.
function rolesFromUserType(t: ApiPublicUser['user_type']): Role[] {
  if (t === 'superadmin') return ['user', 'admin', 'super-admin'];
  if (t === 'admin') return ['user', 'admin'];
  return ['user'];
}

function sessionFromApiUser(u: ApiPublicUser, token: string): Session {
  return {
    user: {
      id: u.id,
      name: u.display_name,
      email: u.email,
      roles: rolesFromUserType(u.user_type),
      tenantId: tenantIdFromJwt(token),
    },
  };
}

// Shape of a tenant row from the real backend GET /superadmin/tenants.
// The backend knows id/name/slug/status/tier/flags/timestamps + member count;
// the richer console-only fields (billing, MRR, contact) have no backend
// source yet and are filled with neutral placeholders.
interface BackendTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  tier?: string;
  flags?: Record<string, boolean>;
}

function mapBackendTenant(b: BackendTenant): Tenant {
  const status: TenantStatus = b.deleted_at
    ? 'archived'
    : b.status === 'suspended'
      ? 'paused'
      : 'active';
  const tier = (b.tier as Tenant['tier']) ?? 'starter';
  const flags = b.flags ?? {};
  return {
    id: b.id,
    name: b.name,
    domain: b.slug,
    logoEmoji: '🏢',
    status,
    tier,
    createdAt: b.created_at,
    primaryContact: { name: '—', email: '—' },
    seatsUsed: b.member_count ?? 0,
    seatsLimit: 0,
    mrrMnt: 0,
    billingStatus: 'manual',
    lastActiveAt: b.updated_at,
    flags: {
      sso: Boolean(flags.sso),
      api: Boolean(flags.api),
      telegram: Boolean(flags.telegram),
      branding: Boolean(flags.branding),
      beta: Boolean(flags.beta),
    },
  };
}

// ---------------------------------------------------------------------------
// Tenant-admin domain types
// ---------------------------------------------------------------------------

/**
 * Tenant member. Maps to the backend's user row under `/admin/users`:
 * `user_type` is the only "role-like" axis (admin / worker / superadmin).
 * `levels` are the display labels of the user's department-level
 * memberships; `levelIds` are their ids.
 */
export interface Member {
  id: string;
  name: string;
  email: string;
  userType: 'admin' | 'worker' | 'superadmin';
  levels: string[];
  levelIds: string[];
  createdAt: string;
  /** Soft-delete timestamp (ISO). When set, the user is hidden from the
   *  default member list and can be restored within the grace window. */
  deletedAt?: string;
}

export interface BulkInviteResult {
  levelName: string;
  total: number;
  invited: string[];
  skipped: { email: string; reason: string }[];
}

/** Pending invite (GET /admin/invites). Email-and-token records that
 *  haven't been accepted yet; revoke or resend until they're consumed. */
export interface Invite {
  id: string;
  email: string;
  userType: 'admin' | 'worker';
  levelIds: string[];
  expiresAt: string;
}

/** A department's ordered level (read-only view from GET /departments). */
export interface DepartmentLevel {
  id: string;
  name: string;
  rank: number;
}

/** A tenant department with its ordered levels (read-only view). */
export interface Department {
  id: string;
  name: string;
  levels: DepartmentLevel[];
}

/** Full department record used by the admin catalog manager. */
export interface AdminDepartment {
  id: string;
  name: string;
  description: string;
  deprecatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Full level record used by the admin catalog manager. */
export interface AdminDepartmentLevel {
  id: string;
  departmentId: string;
  name: string;
  rank: number;
  createdAt: string;
  updatedAt: string;
}

/** A single entry from the membership audit log. */
export interface MembershipAuditEntry {
  id: string;
  actorUserId: string;
  targetUserId: string;
  levelId: string;
  levelName: string;
  /** "grant" | "revoke" */
  action: string;
  at: string;
}

/** Editable account profile (distinct from the auth Session). */
export interface UserProfile {
  name: string;
  email: string;
  department?: string;
  jobTitle?: string;
  phone?: string;
}

export interface AccountPreferences {
  language: 'mn' | 'en' | 'ru';
  emailDigest: boolean;
  mentionAlerts: boolean;
  productUpdates: boolean;
}

// ---------------------------------------------------------------------------
// The API seam
// ---------------------------------------------------------------------------

/**
 * Single interface every feature talks to, through the hooks in `@app/query`.
 * Two implementations live in this file: {@link ApiClient} (real HTTP) and
 * {@link MockApiClient} (in-memory). Adding a backend capability means: add a
 * method here, implement it in BOTH classes, expose a hook in `@app/query`.
 */
export interface AppApi extends SuperAdminApi {
  // --- auth + session ---
  getSession(): Promise<Session>;
  login(email: string, password: string): Promise<Session>;
  signup(email: string, password: string): Promise<Session>;
  /** Consume an invite token (from the emailed /invite?token= link),
   * set a password + display name, and return the logged-in session. */
  acceptInvite(token: string, password: string, displayName: string): Promise<Session>;
  logout(): Promise<void>;
  /**
   * Full-page URL that begins the backend Google OAuth redirect flow, or
   * null when the implementation has no real OAuth (the mock). The UI
   * navigates the browser here; on success the backend redirects to
   * /auth/google/done#token=<jwt>.
   */
  googleLoginUrl(): string | null;
  /** Persist a JWT obtained out-of-band (the Google callback fragment). */
  setToken(token: string): void;
  requestPasswordReset(email: string): Promise<{ ok: true }>;
  /** Consume a one-time reset token (from the emailed link) and set a new
   * password. Caller is not authenticated; they must log in afterwards. */
  resetPassword(token: string, newPassword: string): Promise<{ ok: true }>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  // --- profile + preferences ---
  getProfile(): Promise<UserProfile>;
  updateProfile(patch: Partial<Omit<UserProfile, 'email'>>): Promise<UserProfile>;
  getPreferences(): Promise<AccountPreferences>;
  updatePreferences(patch: Partial<AccountPreferences>): Promise<AccountPreferences>;

  // --- tenant admin: members + invites ---
  listMembers(opts?: { includeDeleted?: boolean }): Promise<Member[]>;
  getMember(id: string): Promise<Member | null>;
  inviteMember(
    email: string,
    role: Role,
    levelIds?: string[],
  ): Promise<{ email: string; userType: 'admin' | 'worker' }>;
  bulkInviteMembers(file: File): Promise<BulkInviteResult>;
  setUserType(id: string, userType: 'admin' | 'worker'): Promise<void>;
  /** Soft-delete a user in the caller's tenant. Guarded against
   *  self-delete and removing the last admin. */
  removeMember(id: string): Promise<void>;
  /** Undo a soft-delete within the grace window. */
  restoreMember(id: string): Promise<void>;
  listInvites(): Promise<Invite[]>;
  revokeInvite(id: string): Promise<void>;
  resendInvite(id: string): Promise<Invite>;

  // --- super-admin cross-tenant member ops ---
  listTenantMembers(tenantId: string, opts?: { includeDeleted?: boolean }): Promise<Member[]>;
  inviteTenantMember(
    tenantId: string,
    email: string,
    userType: 'admin' | 'worker',
  ): Promise<{ email: string; userType: 'admin' | 'worker' }>;
  removeTenantMember(tenantId: string, userId: string): Promise<void>;
  restoreTenantMember(tenantId: string, userId: string): Promise<void>;

  // --- departments + levels ---
  listDepartments(): Promise<Department[]>;
  grantLevel(userId: string, levelId: string): Promise<void>;
  revokeLevel(userId: string, levelId: string): Promise<void>;
  listMembershipAudit(limit?: number): Promise<MembershipAuditEntry[]>;
  listAdminDepartments(includeDeprecated?: boolean): Promise<AdminDepartment[]>;
  createDepartment(input: { name: string; description?: string }): Promise<AdminDepartment>;
  /** Departments are not renamable on the BE — only description/deprecation. */
  patchDepartment(
    id: string,
    patch: { description?: string; deprecated?: boolean },
  ): Promise<AdminDepartment>;
  deleteDepartment(id: string): Promise<void>;
  listAdminLevels(departmentId: string): Promise<AdminDepartmentLevel[]>;
  createLevel(departmentId: string, input: { name: string; rank: number }): Promise<AdminDepartmentLevel>;
  patchLevel(
    departmentId: string,
    levelId: string,
    patch: { name?: string; rank?: number },
  ): Promise<AdminDepartmentLevel>;
  deleteLevel(departmentId: string, levelId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Real HTTP client
// ---------------------------------------------------------------------------

type BackendUserRow = {
  id: string;
  email: string;
  display_name: string;
  user_type: 'admin' | 'worker' | 'superadmin';
  created_at: string;
  deleted_at?: string | null;
  levels: string[] | null;
  level_ids: string[] | null;
};

function toMember(u: BackendUserRow): Member {
  return {
    id: u.id,
    name: u.display_name,
    email: u.email,
    userType: u.user_type,
    levels: u.levels ?? [],
    levelIds: u.level_ids ?? [],
    createdAt: u.created_at,
    ...(u.deleted_at ? { deletedAt: u.deleted_at } : {}),
  };
}

type BackendInviteRow = {
  id: string;
  email: string;
  user_type: string;
  level_ids: string[] | null;
  expires_at: string;
};

function toInvite(i: BackendInviteRow): Invite {
  return {
    id: i.id,
    email: i.email,
    userType: i.user_type === 'admin' ? 'admin' : 'worker',
    levelIds: i.level_ids ?? [],
    expiresAt: i.expires_at,
  };
}

type BackendDepartmentRow = {
  id: string;
  name: string;
  description: string;
  deprecated_at?: string | null;
  created_at: string;
  updated_at: string;
};

function toAdminDepartment(d: BackendDepartmentRow): AdminDepartment {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    deprecatedAt: d.deprecated_at ?? null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

type BackendLevelRow = {
  id: string;
  department_id: string;
  name: string;
  rank: number;
  created_at: string;
  updated_at: string;
};

function toAdminLevel(l: BackendLevelRow): AdminDepartmentLevel {
  return {
    id: l.id,
    departmentId: l.department_id,
    name: l.name,
    rank: l.rank,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  };
}

export class ApiClient implements AppApi {
  constructor(private readonly config: AppConfig) {}

  // Single-flight guard: concurrent 401s share one in-flight POST /auth/refresh.
  private refreshPromise: Promise<boolean> | null = null;

  // ---------- auth ----------

  async getSession(): Promise<Session> {
    const token = readToken();
    if (!token) return { user: null };
    try {
      const u = await this.request<ApiPublicUser>('/me');
      return sessionFromApiUser(u, token);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        writeToken(null);
        return { user: null };
      }
      throw err;
    }
  }

  async login(email: string, password: string): Promise<Session> {
    // Direct fetch (not authedFetch) with credentials so the browser stores the
    // Set-Cookie refresh cookie. A 401 here is genuine bad credentials, not an
    // expired access token, so it must never trigger the refresh interceptor.
    const res = await fetch(`${this.config.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 401) {
      throw new Error('Имэйл эсвэл нууц үг буруу байна.');
    }
    if (!res.ok) throw new Error(`API request failed: ${res.status}`);
    const data = (await res.json()) as { token: string; user: ApiPublicUser };
    writeToken(data.token);
    return sessionFromApiUser(data.user, data.token);
  }

  // Public signup is disabled: the API is invite-only. Surface an honest
  // error so the UI tells the user to ask an admin for an invite.
  async signup(_email: string, _password: string): Promise<Session> {
    throw new Error('Бүртгэл зөвхөн урилгаар хийгдэнэ. Админаасаа урилга авна уу.');
  }

  async acceptInvite(token: string, password: string, displayName: string): Promise<Session> {
    // Direct fetch with credentials so the browser stores the Set-Cookie
    // refresh cookie issued on accept, same as login.
    const res = await fetch(`${this.config.apiBaseUrl}/auth/accept-invite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, password, display_name: displayName }),
    });
    if (!res.ok) throw new Error(`API request failed: ${res.status}`);
    const data = (await res.json()) as { token: string; user_id: string };
    // accept-invite returns only {token, user_id}; hydrate the user via /me.
    writeToken(data.token);
    return this.getSession();
  }

  async logout(): Promise<void> {
    // Best-effort server-side revoke of the refresh cookie; the custom header +
    // credentials satisfy the API's CSRF and credentialed-CORS requirements.
    try {
      await fetch(`${this.config.apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'x-refresh-request': '1' },
        credentials: 'include',
      });
    } catch {
      /* best effort: still clear the local token below */
    }
    writeToken(null);
  }

  googleLoginUrl(): string {
    return `${this.config.apiBaseUrl}/auth/google/login`;
  }

  setToken(token: string): void {
    writeToken(token);
  }

  async requestPasswordReset(email: string): Promise<{ ok: true }> {
    return this.requestJson<{ ok: true }>('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
    return this.requestJson<{ ok: true }>('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // PATCH /me handles password change; current + new + display_name all
    // live there. We only send the password fields here.
    const res = await this.authedFetch(`${this.config.apiBaseUrl}/me`, {
      method: 'PATCH',
      headers: this.authHeaders(true),
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (res.status === 401) throw new Error('Одоогийн нууц үг буруу байна.');
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Нууц үг солих амжилтгүй: ${res.status}${body ? ` ${body}` : ''}`);
    }
  }

  // ---------- profile + preferences ----------

  async getProfile(): Promise<UserProfile> {
    // BE has no separate profile resource — /me carries display_name + email.
    // The richer FE fields (department / jobTitle / phone) have no backing
    // today; extend PATCH /me on the backend if the product needs them.
    const u = await this.request<ApiPublicUser>('/me');
    return { name: u.display_name, email: u.email };
  }

  async updateProfile(patch: Partial<Omit<UserProfile, 'email'>>): Promise<UserProfile> {
    const body: { display_name?: string } = {};
    if (patch.name != null) body.display_name = patch.name;
    const u = await this.patchJson<ApiPublicUser>('/me', body);
    return { name: u.display_name, email: u.email };
  }

  async getPreferences(): Promise<AccountPreferences> {
    return this.request<AccountPreferences>('/preferences');
  }

  async updatePreferences(patch: Partial<AccountPreferences>): Promise<AccountPreferences> {
    return this.patchJson<AccountPreferences>('/preferences', patch);
  }

  // ---------- members + invites ----------

  async listMembers(opts?: { includeDeleted?: boolean }): Promise<Member[]> {
    const qs = opts?.includeDeleted ? '?include_deleted=true' : '';
    const res = await this.request<{ users?: BackendUserRow[] }>(`/admin/users${qs}`);
    return (res.users ?? []).map(toMember);
  }

  async getMember(id: string): Promise<Member | null> {
    // Backend has no /admin/users/:id; resolve by filtering the list.
    const all = await this.listMembers();
    return all.find((m) => m.id === id) ?? null;
  }

  async inviteMember(
    email: string,
    role: Role,
    levelIds?: string[],
  ): Promise<{ email: string; userType: 'admin' | 'worker' }> {
    // POST /admin/invites with user_type and optional level_ids. A worker with
    // no levels falls back to the tenant's default level server-side.
    const userType: 'admin' | 'worker' = role === 'admin' || role === 'super-admin' ? 'admin' : 'worker';
    const body: { email: string; user_type: string; level_ids?: string[] } = {
      email,
      user_type: userType,
    };
    if (levelIds && levelIds.length > 0) body.level_ids = levelIds;
    const inv = await this.requestJson<{ email: string; user_type: string }>('/admin/invites', body);
    return {
      email: inv.email,
      userType: inv.user_type === 'admin' ? 'admin' : 'worker',
    };
  }

  async bulkInviteMembers(file: File): Promise<BulkInviteResult> {
    const form = new FormData();
    form.append('file', file);
    // No content-type header: the browser sets the multipart boundary.
    const res = await this.authedFetch(`${this.config.apiBaseUrl}/admin/invites/bulk`, {
      method: 'POST',
      headers: this.authHeaders(false),
      body: form,
    });
    const out = await this.parse<{
      level_name: string;
      total: number;
      invited: string[];
      skipped: { email: string; reason: string }[];
    }>(res);
    return {
      levelName: out.level_name,
      total: out.total,
      invited: out.invited ?? [],
      skipped: out.skipped ?? [],
    };
  }

  async setUserType(id: string, userType: 'admin' | 'worker'): Promise<void> {
    const res = await this.authedFetch(
      `${this.config.apiBaseUrl}/admin/users/${encodeURIComponent(id)}/user-type`,
      {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify({ user_type: userType }),
      },
    );
    if (res.status === 401) throw new ApiAuthError();
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`set user-type failed: ${res.status}${body ? ` ${body}` : ''}`);
    }
  }

  async removeMember(id: string): Promise<void> {
    await this.send204('DELETE', `/admin/users/${encodeURIComponent(id)}`);
  }

  async restoreMember(id: string): Promise<void> {
    await this.send204('POST', `/admin/users/${encodeURIComponent(id)}/restore`);
  }

  async listInvites(): Promise<Invite[]> {
    const res = await this.request<{ invites?: BackendInviteRow[] }>('/admin/invites');
    return (res.invites ?? []).map(toInvite);
  }

  async revokeInvite(id: string): Promise<void> {
    await this.del(`/admin/invites/${encodeURIComponent(id)}`);
  }

  async resendInvite(id: string): Promise<Invite> {
    const inv = await this.requestJson<BackendInviteRow>(
      `/admin/invites/${encodeURIComponent(id)}/resend`,
      {},
    );
    return toInvite(inv);
  }

  // ---------- super-admin cross-tenant members ----------

  async listTenantMembers(
    tenantId: string,
    opts?: { includeDeleted?: boolean },
  ): Promise<Member[]> {
    const qs = opts?.includeDeleted ? '?include_deleted=true' : '';
    const res = await this.request<{ users?: BackendUserRow[] }>(
      `/superadmin/tenants/${encodeURIComponent(tenantId)}/users${qs}`,
    );
    return (res.users ?? []).map(toMember);
  }

  async inviteTenantMember(
    tenantId: string,
    email: string,
    userType: 'admin' | 'worker',
  ): Promise<{ email: string; userType: 'admin' | 'worker' }> {
    const res = await this.requestJson<{ email: string; user_type: string }>(
      `/superadmin/tenants/${encodeURIComponent(tenantId)}/invites`,
      { email, user_type: userType },
    );
    return {
      email: res.email,
      userType: res.user_type === 'admin' ? 'admin' : 'worker',
    };
  }

  async removeTenantMember(tenantId: string, userId: string): Promise<void> {
    await this.send204(
      'DELETE',
      `/superadmin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
    );
  }

  async restoreTenantMember(tenantId: string, userId: string): Promise<void> {
    await this.send204(
      'POST',
      `/superadmin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}/restore`,
    );
  }

  // ---------- departments + levels ----------
  // GET /departments returns the active catalog for the caller's tenant — any
  // authed user can read it (powers level pickers).
  async listDepartments(): Promise<Department[]> {
    const res = await this.request<{
      departments?: Array<{
        id: string;
        name: string;
        levels: Array<{ id: string; name: string; rank: number }>;
      }>;
    }>('/departments');
    return (res.departments ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      levels: (d.levels ?? []).map((l) => ({ id: l.id, name: l.name, rank: l.rank })),
    }));
  }

  async grantLevel(userId: string, levelId: string): Promise<void> {
    await this.send204(
      'POST',
      `/admin/users/${encodeURIComponent(userId)}/levels/${encodeURIComponent(levelId)}`,
    );
  }

  async revokeLevel(userId: string, levelId: string): Promise<void> {
    await this.del(
      `/admin/users/${encodeURIComponent(userId)}/levels/${encodeURIComponent(levelId)}`,
    );
  }

  async listMembershipAudit(limit?: number): Promise<MembershipAuditEntry[]> {
    const q = limit ? `?limit=${limit}` : '';
    const res = await this.request<{
      entries?: Array<{
        id: string;
        actor_user_id: string;
        target_user_id: string;
        level_id: string;
        level_name: string;
        action: string;
        at: string;
      }>;
    }>(`/admin/audit/membership-changes${q}`);
    return (res.entries ?? []).map((e) => ({
      id: e.id,
      actorUserId: e.actor_user_id,
      targetUserId: e.target_user_id,
      levelId: e.level_id,
      levelName: e.level_name,
      action: e.action,
      at: e.at,
    }));
  }

  // Admin catalog CRUD: same domain as listDepartments but exposes the full
  // record (description, deprecation, timestamps) and the mutate endpoints.
  async listAdminDepartments(includeDeprecated = false): Promise<AdminDepartment[]> {
    const q = includeDeprecated ? '?include_deprecated=true' : '';
    const res = await this.request<{ departments?: BackendDepartmentRow[] }>(
      `/admin/departments${q}`,
    );
    return (res.departments ?? []).map(toAdminDepartment);
  }

  async createDepartment(input: { name: string; description?: string }): Promise<AdminDepartment> {
    const d = await this.requestJson<BackendDepartmentRow>('/admin/departments', {
      name: input.name,
      description: input.description ?? '',
    });
    return toAdminDepartment(d);
  }

  async patchDepartment(
    id: string,
    patch: { description?: string; deprecated?: boolean },
  ): Promise<AdminDepartment> {
    const d = await this.patchJson<BackendDepartmentRow>(
      `/admin/departments/${encodeURIComponent(id)}`,
      patch,
    );
    return toAdminDepartment(d);
  }

  async deleteDepartment(id: string): Promise<void> {
    await this.del(`/admin/departments/${encodeURIComponent(id)}`);
  }

  async listAdminLevels(departmentId: string): Promise<AdminDepartmentLevel[]> {
    const res = await this.request<{ levels?: BackendLevelRow[] }>(
      `/admin/departments/${encodeURIComponent(departmentId)}/levels`,
    );
    return (res.levels ?? []).map(toAdminLevel);
  }

  async createLevel(
    departmentId: string,
    input: { name: string; rank: number },
  ): Promise<AdminDepartmentLevel> {
    const l = await this.requestJson<BackendLevelRow>(
      `/admin/departments/${encodeURIComponent(departmentId)}/levels`,
      input,
    );
    return toAdminLevel(l);
  }

  async patchLevel(
    departmentId: string,
    levelId: string,
    patch: { name?: string; rank?: number },
  ): Promise<AdminDepartmentLevel> {
    const l = await this.patchJson<BackendLevelRow>(
      `/admin/departments/${encodeURIComponent(departmentId)}/levels/${encodeURIComponent(levelId)}`,
      patch,
    );
    return toAdminLevel(l);
  }

  async deleteLevel(departmentId: string, levelId: string): Promise<void> {
    await this.del(
      `/admin/departments/${encodeURIComponent(departmentId)}/levels/${encodeURIComponent(levelId)}`,
    );
  }

  // ---------- super-admin ----------
  // Tenant lifecycle is wired to the real /superadmin/* API. The ops-only
  // surfaces (system health, audit, announcements, plans, internal users,
  // stats) call the endpoints the backend boilerplate exposes.

  private async tenantAfter(id: string, action: () => Promise<void>): Promise<Tenant> {
    await action();
    const t = await this.getTenant(id);
    if (!t) throw new Error('Tenant not found after update');
    return t;
  }

  async listTenants(): Promise<Tenant[]> {
    // include_deleted=true so soft-deleted (archived) tenants stay visible and
    // restorable; mapBackendTenant maps deleted_at -> status 'archived'.
    const out = await this.request<{ tenants: BackendTenant[] }>(
      '/superadmin/tenants?include_deleted=true',
    );
    return (out.tenants ?? []).map(mapBackendTenant);
  }

  async getTenant(id: string): Promise<Tenant | null> {
    const all = await this.listTenants();
    return all.find((t) => t.id === id) ?? null;
  }

  async createTenant(input: { name: string; slug: string; adminEmail: string }): Promise<{
    tenant: Tenant;
    inviteToken: string;
    acceptUrl: string;
  }> {
    const res = await this.requestJson<{
      tenant_id: string;
      invite_token: string;
      accept_url: string;
    }>('/superadmin/tenants', {
      name: input.name,
      slug: input.slug,
      initial_admin_email: input.adminEmail,
    });
    const tenant =
      (await this.getTenant(res.tenant_id)) ??
      mapBackendTenant({
        id: res.tenant_id,
        name: input.name,
        slug: input.slug,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        member_count: 0,
      });
    return { tenant, inviteToken: res.invite_token, acceptUrl: res.accept_url };
  }

  async updateTenant(id: string, patch: Partial<Tenant>): Promise<Tenant> {
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.tier !== undefined) body.tier = patch.tier;
    if (patch.flags !== undefined) body.flags = patch.flags;
    // PATCH returns the sparse backend row; refetch so the adapter runs over
    // the fresh row and the FE Tenant shape stays consistent.
    await this.patchJson<unknown>(`/superadmin/tenants/${encodeURIComponent(id)}`, body);
    const tenant = await this.getTenant(id);
    if (!tenant) throw new Error('tenant vanished after patch');
    return tenant;
  }

  pauseTenant(id: string): Promise<Tenant> {
    return this.tenantAfter(id, () =>
      this.send204('POST', `/superadmin/tenants/${encodeURIComponent(id)}/suspend`),
    );
  }

  resumeTenant(id: string): Promise<Tenant> {
    return this.tenantAfter(id, () =>
      this.send204('POST', `/superadmin/tenants/${encodeURIComponent(id)}/unsuspend`),
    );
  }

  async archiveTenant(id: string): Promise<void> {
    await this.send204('DELETE', `/superadmin/tenants/${encodeURIComponent(id)}`);
  }

  restoreTenant(id: string): Promise<Tenant> {
    return this.tenantAfter(id, () =>
      this.send204('POST', `/superadmin/tenants/${encodeURIComponent(id)}/restore`),
    );
  }

  getSystemHealth(): Promise<SystemHealth> {
    return this.request<SystemHealth>('/superadmin/system/health');
  }

  async listSuperAuditLogs(filter?: {
    tenantId?: string;
    severity?: SuperAuditLogEntry['severity'];
  }): Promise<SuperAuditLogEntry[]> {
    const params = new URLSearchParams();
    if (filter?.tenantId) params.set('tenant_id', filter.tenantId);
    const qs = params.toString();
    const res = await this.request<{ entries?: SuperAuditLogEntry[] }>(
      `/superadmin/audit${qs ? `?${qs}` : ''}`,
    );
    let entries = res.entries ?? [];
    // BE doesn't filter by severity; do it client-side so the chip still works.
    if (filter?.severity) entries = entries.filter((e) => e.severity === filter.severity);
    return entries;
  }

  async listAnnouncements(): Promise<Announcement[]> {
    const res = await this.request<{ announcements?: Announcement[] }>(
      '/superadmin/announcements',
    );
    return res.announcements ?? [];
  }

  createAnnouncement(input: Omit<Announcement, 'id' | 'status' | 'createdBy'>): Promise<Announcement> {
    return this.requestJson<Announcement>('/superadmin/announcements', input);
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.send204('DELETE', `/superadmin/announcements/${encodeURIComponent(id)}`);
  }

  async listPlans(): Promise<PlanDefinition[]> {
    const res = await this.request<{ plans?: PlanDefinition[] }>('/superadmin/plans');
    return res.plans ?? [];
  }

  updatePlan(id: TenantTier, patch: Partial<PlanDefinition>): Promise<PlanDefinition> {
    // The BE PATCH expects explicit ${field}Null:true to set a column to
    // NULL (vs "field omitted" = "no change").
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name;
    setNullable(body, 'priceMnt', patch.priceMnt);
    setNullable(body, 'seatLimit', patch.seatLimit);
    setNullable(body, 'notes', patch.notes);
    return this.patchJson<PlanDefinition>(`/superadmin/plans/${encodeURIComponent(id)}`, body);
  }

  async listInternalUsers(): Promise<InternalUser[]> {
    const res = await this.request<{ users?: InternalUser[] }>('/superadmin/internal-users');
    return res.users ?? [];
  }

  getSuperAdminStats(): Promise<SuperAdminStats> {
    return this.request<SuperAdminStats>('/superadmin/stats');
  }

  // ---------- transport ----------
  // Tenancy comes from the JWT claims, not a header; normal API calls
  // authenticate with the bearer access token only. The refresh token rides
  // an httpOnly Path=/auth cookie set on /auth/* responses (credentialed
  // CORS, so a specific origin, never '*'), never touched by this method.
  private authHeaders(json: boolean): Record<string, string> {
    const token = readToken();
    return {
      ...(json ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.status === 401) throw new ApiAuthError();
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return response.json() as Promise<T>;
  }

  // Calls POST /auth/refresh with the httpOnly refresh cookie. Returns true and
  // stores the new access token on success. Never routed through authedFetch
  // (no recursion).
  private async doRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'x-refresh-request': '1' },
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { token?: string };
      if (!data.token) return false;
      writeToken(data.token);
      return true;
    } catch {
      return false;
    }
  }

  // Single-flight: concurrent 401s share one in-flight refresh.
  private refreshAccessToken(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  // Wraps a fetch so a 401 triggers one refresh + retry with the new bearer.
  // `init` must already carry the Authorization header (via authHeaders).
  private async authedFetch(url: string, init: RequestInit): Promise<Response> {
    let res = await fetch(url, init);
    if (res.status === 401) {
      const ok = await this.refreshAccessToken();
      if (ok) {
        const headers = { ...((init.headers as Record<string, string>) ?? {}) };
        const token = readToken();
        if (token) headers['authorization'] = `Bearer ${token}`;
        res = await fetch(url, { ...init, headers });
      }
    }
    return res;
  }

  private async request<T>(path: string): Promise<T> {
    return this.parse<T>(
      await this.authedFetch(`${this.config.apiBaseUrl}${path}`, {
        headers: this.authHeaders(false),
      }),
    );
  }

  private async requestJson<T>(path: string, body: unknown): Promise<T> {
    return this.parse<T>(
      await this.authedFetch(`${this.config.apiBaseUrl}${path}`, {
        method: 'POST',
        headers: this.authHeaders(true),
        body: JSON.stringify(body),
      }),
    );
  }

  private async patchJson<T>(path: string, body: unknown): Promise<T> {
    return this.parse<T>(
      await this.authedFetch(`${this.config.apiBaseUrl}${path}`, {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify(body),
      }),
    );
  }

  private async del(path: string): Promise<void> {
    await this.send204('DELETE', path);
  }

  private async send204(method: 'POST' | 'DELETE', path: string): Promise<void> {
    const res = await this.authedFetch(`${this.config.apiBaseUrl}${path}`, {
      method,
      headers: this.authHeaders(false),
    });
    if (res.status === 401) throw new ApiAuthError();
    if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  }
}

export function createApiClient(config: AppConfig): ApiClient {
  return new ApiClient(config);
}

// Used by updatePlan and similar PATCH bodies: the BE distinguishes
// "field absent" (no change) from "field set to null" via a paired *Null
// flag. JS undefined → omit; null → emit {field: null, ${field}Null: true};
// other → emit {field}.
function setNullable(body: Record<string, unknown>, key: string, val: unknown): void {
  if (val === undefined) return;
  if (val === null) {
    body[key] = null;
    body[`${key}Null`] = true;
  } else {
    body[key] = val;
  }
}

// ---------------------------------------------------------------------------
// In-memory mock client
// ---------------------------------------------------------------------------
// Seeded fixtures, simulated latency, no persistence: every refresh resets
// state (including the session). Log in with an `admin@` address to get the
// admin role in the client app.

function deriveUserFromEmail(email: string): Session['user'] {
  const lower = email.toLowerCase();
  const localPart = email.split('@')[0] ?? 'user';
  const isAdmin = lower.startsWith('admin@');
  return {
    id: `u-${lower.replace(/[^a-z0-9]/g, '-')}`,
    name: isAdmin ? 'Удирдлага' : localPart,
    email,
    roles: isAdmin ? ['user', 'admin'] : ['user'],
    tenantId: 't-acme',
  };
}

const MOCK_MEMBERS: Member[] = [
  { id: 'u-001', name: 'Бат-Эрдэнэ', email: 'baterdene@acme.example', userType: 'admin', levels: ['General / CEO'], levelIds: ['l-ceo'], createdAt: '2026-04-01T08:30:00Z' },
  { id: 'u-002', name: 'Оюун', email: 'oyu@acme.example', userType: 'admin', levels: ['General / Director'], levelIds: ['l-dir'], createdAt: '2026-04-02T07:12:00Z' },
  { id: 'u-003', name: 'Энхтуяа', email: 'enkhtuya@acme.example', userType: 'worker', levels: ['General / Employee'], levelIds: ['l-emp'], createdAt: '2026-04-03T18:45:00Z' },
  { id: 'u-004', name: 'Ганболд', email: 'ganbold@acme.example', userType: 'worker', levels: ['General / Employee'], levelIds: ['l-emp'], createdAt: '2026-04-04T16:20:00Z' },
  { id: 'u-005', name: 'Дэлгэрцэцэг', email: 'delgertsetseg@acme.example', userType: 'worker', levels: ['General / Manager'], levelIds: ['l-mgr'], createdAt: '2026-04-05T14:00:00Z' },
  { id: 'u-006', name: 'Мөнхбат', email: 'munkhbat@acme.example', userType: 'worker', levels: ['General / Employee'], levelIds: ['l-emp'], createdAt: '2026-04-06T11:30:00Z' },
  { id: 'u-007', name: 'Нараа', email: 'naraa@acme.example', userType: 'worker', levels: ['General / Employee'], levelIds: ['l-emp'], createdAt: '2026-04-07T09:00:00Z' },
];

const MOCK_LEVELS: AdminDepartmentLevel[] = [
  { id: 'l-emp', departmentId: 'd-general', name: 'Employee', rank: 1, createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'l-mgr', departmentId: 'd-general', name: 'Manager', rank: 2, createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'l-dir', departmentId: 'd-general', name: 'Director', rank: 3, createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'l-ceo', departmentId: 'd-general', name: 'CEO', rank: 4, createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
];

const DEFAULT_PREFERENCES: AccountPreferences = {
  language: 'mn',
  emailDigest: true,
  mentionAlerts: true,
  productUpdates: false,
};

const nowIso = () => new Date().toISOString();
const randomId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class MockApiClient implements AppApi {
  private session: Session = { user: null };
  private members: Member[] = [...MOCK_MEMBERS];
  private invites: Invite[] = [];
  private departments: AdminDepartment[] = [
    {
      id: 'd-general',
      name: 'General',
      description: 'Анхдагч хэлтэс — бүх ажилтанд хамаарна.',
      deprecatedAt: null,
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    },
  ];
  private levels: AdminDepartmentLevel[] = MOCK_LEVELS.map((l) => ({ ...l }));
  private audit: MembershipAuditEntry[] = [];
  private profile: UserProfile | null = null;
  private preferences: AccountPreferences = { ...DEFAULT_PREFERENCES };

  /** Profile is lazily seeded from whoever is logged in this session. */
  private ensureProfile(): UserProfile {
    if (!this.profile) {
      const u = this.session.user;
      this.profile = {
        name: u?.name ?? 'Зочин',
        email: u?.email ?? 'guest@example.com',
        department: 'General',
        jobTitle: 'Мэргэжилтэн',
        phone: '',
      };
    }
    return this.profile;
  }

  // ---------- auth ----------

  async getSession(): Promise<Session> {
    await sleep(120);
    return this.session;
  }

  async login(email: string, _password: string): Promise<Session> {
    await sleep(350);
    this.session = { user: deriveUserFromEmail(email) };
    return this.session;
  }

  async signup(email: string, _password: string): Promise<Session> {
    await sleep(450);
    this.session = { user: deriveUserFromEmail(email) };
    return this.session;
  }

  async acceptInvite(_token: string, _password: string, displayName: string): Promise<Session> {
    await sleep(350);
    this.session = {
      user: {
        id: 'u-invited',
        name: displayName || 'Урьсан хэрэглэгч',
        email: 'invited@example.com',
        roles: ['user'],
        tenantId: 't-acme',
      },
    };
    return this.session;
  }

  async logout(): Promise<void> {
    await sleep(120);
    this.session = { user: null };
  }

  // No real OAuth in the mock: null hides the Google button.
  googleLoginUrl(): string | null {
    return null;
  }

  setToken(_token: string): void {
    /* mock has no bearer token; session is in-memory */
  }

  async requestPasswordReset(_email: string): Promise<{ ok: true }> {
    await sleep(400);
    // Always succeeds — never reveal whether an address is registered.
    return { ok: true };
  }

  async resetPassword(_token: string, _newPassword: string): Promise<{ ok: true }> {
    await sleep(300);
    return { ok: true };
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await sleep(400);
    if (!currentPassword) throw new Error('Одоогийн нууц үгээ оруулна уу.');
    if (newPassword.length < 8) throw new Error('Шинэ нууц үг дор хаяж 8 тэмдэгт байх ёстой.');
  }

  // ---------- profile + preferences ----------

  async getProfile(): Promise<UserProfile> {
    await sleep(120);
    return { ...this.ensureProfile() };
  }

  async updateProfile(patch: Partial<Omit<UserProfile, 'email'>>): Promise<UserProfile> {
    await sleep(220);
    const next = { ...this.ensureProfile(), ...patch };
    this.profile = next;
    if (this.session.user && patch.name) this.session.user.name = patch.name;
    return { ...next };
  }

  async getPreferences(): Promise<AccountPreferences> {
    await sleep(110);
    return { ...this.preferences };
  }

  async updatePreferences(patch: Partial<AccountPreferences>): Promise<AccountPreferences> {
    await sleep(180);
    this.preferences = { ...this.preferences, ...patch };
    return { ...this.preferences };
  }

  // ---------- members + invites ----------

  async listMembers(opts?: { includeDeleted?: boolean }): Promise<Member[]> {
    await sleep(150);
    if (opts?.includeDeleted) return [...this.members];
    return this.members.filter((m) => !m.deletedAt);
  }

  async getMember(id: string): Promise<Member | null> {
    await sleep(120);
    return this.members.find((m) => m.id === id) ?? null;
  }

  async inviteMember(
    email: string,
    role: Role,
    levelIds?: string[],
  ): Promise<{ email: string; userType: 'admin' | 'worker' }> {
    await sleep(220);
    const userType: 'admin' | 'worker' = role === 'admin' || role === 'super-admin' ? 'admin' : 'worker';
    this.invites.unshift({
      id: randomId('inv'),
      email,
      userType,
      levelIds: levelIds ?? [],
      expiresAt: new Date(Date.now() + 168 * 3600 * 1000).toISOString(),
    });
    return { email, userType };
  }

  async bulkInviteMembers(file: File): Promise<BulkInviteResult> {
    await sleep(300);
    const text = await file.text();
    const emails = text
      .split(/\r?\n/)
      .map((line) => (line.split(',')[0] ?? '').trim().toLowerCase())
      .filter((v) => v && v !== 'email' && v !== 'emails' && /.+@.+\..+/.test(v));
    const unique = [...new Set(emails)];
    const invited: string[] = [];
    const skipped: { email: string; reason: string }[] = [];
    for (const email of unique) {
      if (this.invites.some((i) => i.email.toLowerCase() === email)) {
        skipped.push({ email, reason: 'invite already pending' });
        continue;
      }
      this.invites.unshift({
        id: randomId('inv'),
        email,
        userType: 'worker',
        levelIds: [],
        expiresAt: new Date(Date.now() + 168 * 3600 * 1000).toISOString(),
      });
      invited.push(email);
    }
    return { levelName: 'General / Employee', total: unique.length, invited, skipped };
  }

  async setUserType(id: string, userType: 'admin' | 'worker'): Promise<void> {
    await sleep(180);
    const member = this.members.find((m) => m.id === id);
    if (!member) throw new Error('Гишүүн олдсонгүй');
    member.userType = userType;
  }

  async removeMember(id: string): Promise<void> {
    await sleep(150);
    const idx = this.members.findIndex((m) => m.id === id);
    if (idx >= 0) {
      this.members[idx] = { ...this.members[idx], deletedAt: nowIso() };
    }
  }

  async restoreMember(id: string): Promise<void> {
    await sleep(150);
    const idx = this.members.findIndex((m) => m.id === id);
    if (idx >= 0) {
      const { deletedAt: _del, ...rest } = this.members[idx];
      this.members[idx] = rest;
    }
  }

  async listInvites(): Promise<Invite[]> {
    await sleep(120);
    return [...this.invites];
  }

  async revokeInvite(id: string): Promise<void> {
    await sleep(140);
    this.invites = this.invites.filter((i) => i.id !== id);
  }

  async resendInvite(id: string): Promise<Invite> {
    await sleep(180);
    const inv = this.invites.find((i) => i.id === id);
    if (!inv) throw new Error('Урилга олдсонгүй');
    inv.expiresAt = new Date(Date.now() + 168 * 3600 * 1000).toISOString();
    return { ...inv };
  }

  // ---------- super-admin cross-tenant members ----------
  // The mock has no per-tenant member fixtures; reuse the single pool.

  async listTenantMembers(
    _tenantId: string,
    opts?: { includeDeleted?: boolean },
  ): Promise<Member[]> {
    return this.listMembers(opts);
  }

  async inviteTenantMember(
    _tenantId: string,
    email: string,
    userType: 'admin' | 'worker',
  ): Promise<{ email: string; userType: 'admin' | 'worker' }> {
    return this.inviteMember(email, userType as Role);
  }

  async removeTenantMember(_tenantId: string, userId: string): Promise<void> {
    return this.removeMember(userId);
  }

  async restoreTenantMember(_tenantId: string, userId: string): Promise<void> {
    return this.restoreMember(userId);
  }

  // ---------- departments + levels ----------

  async listDepartments(): Promise<Department[]> {
    await sleep(120);
    return this.departments
      .filter((d) => !d.deprecatedAt)
      .map((d) => ({
        id: d.id,
        name: d.name,
        levels: this.levels
          .filter((l) => l.departmentId === d.id)
          .sort((a, b) => a.rank - b.rank)
          .map((l) => ({ id: l.id, name: l.name, rank: l.rank })),
      }));
  }

  private levelLabel(levelId: string): string {
    const lvl = this.levels.find((l) => l.id === levelId);
    const dept = lvl && this.departments.find((d) => d.id === lvl.departmentId);
    return lvl ? `${dept?.name ?? 'General'} / ${lvl.name}` : levelId;
  }

  async grantLevel(userId: string, levelId: string): Promise<void> {
    await sleep(140);
    const member = this.members.find((m) => m.id === userId);
    if (!member) throw new Error('Гишүүн олдсонгүй');
    if (!member.levelIds.includes(levelId)) {
      member.levelIds = [...member.levelIds, levelId];
      member.levels = [...member.levels, this.levelLabel(levelId)];
      this.recordMembership(userId, levelId, 'grant');
    }
  }

  async revokeLevel(userId: string, levelId: string): Promise<void> {
    await sleep(140);
    const member = this.members.find((m) => m.id === userId);
    if (!member) throw new Error('Гишүүн олдсонгүй');
    const idx = member.levelIds.indexOf(levelId);
    if (idx >= 0) {
      member.levelIds = member.levelIds.filter((_, i) => i !== idx);
      member.levels = member.levels.filter((_, i) => i !== idx);
      this.recordMembership(userId, levelId, 'revoke');
    }
  }

  private recordMembership(targetUserId: string, levelId: string, action: 'grant' | 'revoke') {
    this.audit.unshift({
      id: randomId('ma'),
      actorUserId: this.session.user?.id ?? 'u-system',
      targetUserId,
      levelId,
      levelName: this.levelLabel(levelId),
      action,
      at: nowIso(),
    });
  }

  async listMembershipAudit(limit?: number): Promise<MembershipAuditEntry[]> {
    await sleep(140);
    return limit ? this.audit.slice(0, limit) : [...this.audit];
  }

  async listAdminDepartments(includeDeprecated = false): Promise<AdminDepartment[]> {
    await sleep(120);
    return this.departments
      .filter((d) => includeDeprecated || !d.deprecatedAt)
      .map((d) => ({ ...d }));
  }

  async createDepartment(input: { name: string; description?: string }): Promise<AdminDepartment> {
    await sleep(180);
    const dept: AdminDepartment = {
      id: randomId('d'),
      name: input.name,
      description: input.description ?? '',
      deprecatedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.departments.push(dept);
    return { ...dept };
  }

  async patchDepartment(
    id: string,
    patch: { description?: string; deprecated?: boolean },
  ): Promise<AdminDepartment> {
    await sleep(140);
    const dept = this.departments.find((d) => d.id === id);
    if (!dept) throw new Error('Хэлтэс олдсонгүй');
    if (patch.description !== undefined) dept.description = patch.description;
    if (patch.deprecated !== undefined) dept.deprecatedAt = patch.deprecated ? nowIso() : null;
    dept.updatedAt = nowIso();
    return { ...dept };
  }

  async deleteDepartment(id: string): Promise<void> {
    await sleep(140);
    this.departments = this.departments.filter((d) => d.id !== id);
    this.levels = this.levels.filter((l) => l.departmentId !== id);
  }

  async listAdminLevels(departmentId: string): Promise<AdminDepartmentLevel[]> {
    await sleep(120);
    return this.levels
      .filter((l) => l.departmentId === departmentId)
      .sort((a, b) => a.rank - b.rank)
      .map((l) => ({ ...l }));
  }

  async createLevel(
    departmentId: string,
    input: { name: string; rank: number },
  ): Promise<AdminDepartmentLevel> {
    await sleep(180);
    const lvl: AdminDepartmentLevel = {
      id: randomId('l'),
      departmentId,
      name: input.name,
      rank: input.rank,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.levels.push(lvl);
    return { ...lvl };
  }

  async patchLevel(
    departmentId: string,
    levelId: string,
    patch: { name?: string; rank?: number },
  ): Promise<AdminDepartmentLevel> {
    await sleep(140);
    const lvl = this.levels.find((l) => l.id === levelId && l.departmentId === departmentId);
    if (!lvl) throw new Error('Түвшин олдсонгүй');
    if (patch.name !== undefined) lvl.name = patch.name;
    if (patch.rank !== undefined) lvl.rank = patch.rank;
    lvl.updatedAt = nowIso();
    return { ...lvl };
  }

  async deleteLevel(departmentId: string, levelId: string): Promise<void> {
    await sleep(140);
    this.levels = this.levels.filter((l) => !(l.id === levelId && l.departmentId === departmentId));
  }

  // ---------- super-admin (mock) ----------

  private tenants: Tenant[] = MOCK_TENANTS.map((t) => ({ ...t, flags: { ...t.flags } }));
  private announcements: Announcement[] = [...MOCK_ANNOUNCEMENTS];
  private plans: PlanDefinition[] = MOCK_PLANS.map((p) => ({ ...p }));
  private superAuditLog: SuperAuditLogEntry[] = [...MOCK_SUPER_AUDIT];

  async listTenants(): Promise<Tenant[]> {
    await sleep(180);
    return this.tenants.map((t) => ({ ...t, flags: { ...t.flags } }));
  }

  async getTenant(id: string): Promise<Tenant | null> {
    await sleep(120);
    const tenant = this.tenants.find((t) => t.id === id);
    return tenant ? { ...tenant, flags: { ...tenant.flags } } : null;
  }

  async updateTenant(id: string, patch: Partial<Tenant>): Promise<Tenant> {
    await sleep(180);
    const tenant = this.tenants.find((t) => t.id === id);
    if (!tenant) throw new Error('Tenant not found');
    Object.assign(tenant, patch);
    if (patch.flags) tenant.flags = { ...tenant.flags, ...patch.flags };
    this.recordAudit(tenant, 'tenant.update', 'info');
    return { ...tenant, flags: { ...tenant.flags } };
  }

  async pauseTenant(id: string): Promise<Tenant> {
    await sleep(200);
    const tenant = this.tenants.find((t) => t.id === id);
    if (!tenant) throw new Error('Tenant not found');
    tenant.status = 'paused';
    this.recordAudit(tenant, 'tenant.pause', 'critical');
    return { ...tenant, flags: { ...tenant.flags } };
  }

  async resumeTenant(id: string): Promise<Tenant> {
    await sleep(200);
    const tenant = this.tenants.find((t) => t.id === id);
    if (!tenant) throw new Error('Tenant not found');
    tenant.status = 'active';
    this.recordAudit(tenant, 'tenant.resume', 'warning');
    return { ...tenant, flags: { ...tenant.flags } };
  }

  async archiveTenant(id: string): Promise<void> {
    await sleep(220);
    const tenant = this.tenants.find((t) => t.id === id);
    if (tenant) {
      tenant.status = 'archived';
      this.recordAudit(tenant, 'tenant.archive', 'critical');
    }
  }

  async createTenant(input: { name: string; slug: string; adminEmail: string }): Promise<{
    tenant: Tenant;
    inviteToken: string;
    acceptUrl: string;
  }> {
    await sleep(260);
    const tenant: Tenant = {
      id: `t-${input.slug}`,
      name: input.name,
      domain: input.slug,
      logoEmoji: '🏢',
      status: 'onboarding',
      tier: 'starter',
      createdAt: nowIso(),
      primaryContact: { name: input.adminEmail.split('@')[0] ?? input.adminEmail, email: input.adminEmail },
      seatsUsed: 0,
      seatsLimit: 0,
      mrrMnt: 0,
      billingStatus: 'manual',
      lastActiveAt: nowIso(),
      flags: { sso: false, api: false, telegram: false, branding: false, beta: false },
    };
    this.tenants.unshift(tenant);
    this.recordAudit(tenant, 'tenant.create', 'warning');
    const inviteToken = `mock_${randomId('tok')}`;
    return {
      tenant: { ...tenant, flags: { ...tenant.flags } },
      inviteToken,
      acceptUrl: `/invite?token=${inviteToken}`,
    };
  }

  async restoreTenant(id: string): Promise<Tenant> {
    await sleep(200);
    const tenant = this.tenants.find((t) => t.id === id);
    if (!tenant) throw new Error('Tenant not found');
    tenant.status = 'active';
    this.recordAudit(tenant, 'tenant.restore', 'warning');
    return { ...tenant, flags: { ...tenant.flags } };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    await sleep(140);
    return MOCK_SYSTEM_HEALTH;
  }

  async listSuperAuditLogs(filter?: {
    tenantId?: string;
    severity?: SuperAuditLogEntry['severity'];
  }): Promise<SuperAuditLogEntry[]> {
    await sleep(140);
    return this.superAuditLog.filter((entry) => {
      if (filter?.tenantId && entry.tenantId !== filter.tenantId) return false;
      if (filter?.severity && entry.severity !== filter.severity) return false;
      return true;
    });
  }

  async listAnnouncements(): Promise<Announcement[]> {
    await sleep(120);
    return [...this.announcements];
  }

  async createAnnouncement(input: Omit<Announcement, 'id' | 'status' | 'createdBy'>): Promise<Announcement> {
    await sleep(220);
    const announcement: Announcement = {
      ...input,
      id: randomId('an'),
      status: new Date(input.startsAt).getTime() > Date.now() ? 'scheduled' : 'live',
      createdBy: this.session.user?.email ?? 'super-admin@example.com',
    };
    this.announcements.unshift(announcement);
    return announcement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await sleep(180);
    this.announcements = this.announcements.filter((a) => a.id !== id);
  }

  async listPlans(): Promise<PlanDefinition[]> {
    await sleep(120);
    return this.plans.map((p) => ({ ...p }));
  }

  async updatePlan(id: TenantTier, patch: Partial<PlanDefinition>): Promise<PlanDefinition> {
    await sleep(180);
    const plan = this.plans.find((p) => p.id === id);
    if (!plan) throw new Error('Plan not found');
    Object.assign(plan, patch);
    return { ...plan };
  }

  async listInternalUsers(): Promise<InternalUser[]> {
    await sleep(140);
    return [...MOCK_INTERNAL_USERS];
  }

  async getSuperAdminStats(): Promise<SuperAdminStats> {
    await sleep(160);
    return buildSuperAdminStats(this.tenants);
  }

  private recordAudit(tenant: Tenant, action: string, severity: SuperAuditLogEntry['severity']) {
    this.superAuditLog.unshift({
      id: randomId('sa'),
      tenantId: tenant.id,
      tenantName: tenant.name,
      actor: this.session.user?.email ?? 'super-admin@example.com',
      actorKind: 'super-admin',
      action,
      severity,
      createdAt: nowIso(),
    });
  }
}

export function createMockApiClient(): MockApiClient {
  return new MockApiClient();
}
