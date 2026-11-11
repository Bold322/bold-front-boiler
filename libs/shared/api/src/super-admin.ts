// Super-admin domain types and mock data.
// Front-only mock layer: every value here is fabricated for UI exploration.

export type TenantTier = 'starter' | 'growth' | 'business' | 'enterprise';
export type TenantStatus = 'active' | 'paused' | 'onboarding' | 'archived';
export type BillingStatus = 'current' | 'past_due' | 'trial' | 'manual';
export type ServiceStatus = 'healthy' | 'degraded' | 'down';
export type AnnouncementSeverity = 'info' | 'warning' | 'maintenance';
export type AnnouncementTarget = 'all' | 'tier' | 'tenants';
export type AnnouncementStatus = 'scheduled' | 'live' | 'ended';

/** Flat feature-toggle map. Keys are owned by the super-admin UI and stored
 *  as `tenants.flags` jsonb on the backend; add product flags here. */
export interface TenantFlags {
  sso: boolean;
  api: boolean;
  telegram: boolean;
  branding: boolean;
  beta: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  /** Tenant slug on the backend; shown as the "domain" in the console. */
  domain?: string;
  logoEmoji?: string;
  status: TenantStatus;
  tier: TenantTier;
  createdAt: string;
  primaryContact: { name: string; email: string };
  seatsUsed: number;
  /** 0 = no limit known (the backend doesn't enforce seats yet). */
  seatsLimit: number;
  mrrMnt: number;
  billingStatus: BillingStatus;
  lastActiveAt: string;
  flags: TenantFlags;
}

export interface ServiceHealth {
  status: ServiceStatus;
  p95LatencyMs: number;
  /** Free-form detail, e.g. "pool 4/10" or "SES: noop". */
  detail?: string;
}

export interface SystemHealth {
  api: ServiceHealth;
  database: ServiceHealth;
  email: ServiceHealth;
  /** Any extra services the product adds (queues, caches, 3rd parties). */
  extra: Array<{ id: string; label: string } & ServiceHealth>;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  target: AnnouncementTarget;
  targetTier?: TenantTier;
  targetTenantIds?: string[];
  startsAt: string;
  endsAt?: string;
  status: AnnouncementStatus;
  createdBy: string;
}

export interface PlanDefinition {
  id: TenantTier;
  name: string;
  priceMnt: number | null;
  seatLimit: number | null;
  notes?: string;
}

export interface InternalUser {
  id: string;
  name: string;
  email: string;
  role: 'super-admin';
  lastActiveAt: string;
  createdAt: string;
}

export interface SuperAdminStats {
  totalTenants: number;
  activeTenants: number;
  onboardingTenants: number;
  totalMrrMnt: number;
  trialTenants: number;
  totalSeatsUsed: number;
  tenantsByTier: Record<TenantTier, number>;
}

// Cross-tenant audit (super-admin scope).
export interface SuperAuditLogEntry {
  id: string;
  tenantId: string;
  tenantName: string;
  actor: string;
  actorKind: 'super-admin' | 'tenant-admin' | 'member' | 'system';
  action: string;
  resource?: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}

// ---------- mock data ----------

const t = (iso: string) => iso;

export const MOCK_TENANTS: Tenant[] = [
  {
    id: 't-acme',
    name: 'Acme Corp',
    domain: 'acme',
    logoEmoji: '🏢',
    status: 'active',
    tier: 'business',
    createdAt: t('2026-01-12T00:00:00Z'),
    primaryContact: { name: 'Бат-Эрдэнэ', email: 'admin@acme.example' },
    seatsUsed: 387,
    seatsLimit: 600,
    mrrMnt: 3_000_000,
    billingStatus: 'current',
    lastActiveAt: t('2026-05-15T07:42:00Z'),
    flags: { sso: true, api: true, telegram: false, branding: true, beta: false },
  },
  {
    id: 't-globex',
    name: 'Globex',
    domain: 'globex',
    logoEmoji: '🛒',
    status: 'onboarding',
    tier: 'enterprise',
    createdAt: t('2026-05-08T00:00:00Z'),
    primaryContact: { name: 'Battushig', email: 'admin@globex.example' },
    seatsUsed: 142,
    seatsLimit: 1500,
    mrrMnt: 8_000_000,
    billingStatus: 'manual',
    lastActiveAt: t('2026-05-15T06:11:00Z'),
    flags: { sso: true, api: true, telegram: true, branding: true, beta: true },
  },
  {
    id: 't-initech',
    name: 'Initech',
    domain: 'initech',
    logoEmoji: '🏗️',
    status: 'active',
    tier: 'growth',
    createdAt: t('2026-03-05T00:00:00Z'),
    primaryContact: { name: 'Оюун', email: 'admin@initech.example' },
    seatsUsed: 88,
    seatsLimit: 120,
    mrrMnt: 1_000_000,
    billingStatus: 'past_due',
    lastActiveAt: t('2026-05-14T16:30:00Z'),
    flags: { sso: false, api: false, telegram: true, branding: true, beta: false },
  },
  {
    id: 't-umbrella',
    name: 'Umbrella LLC',
    domain: 'umbrella',
    logoEmoji: '☂️',
    status: 'paused',
    tier: 'starter',
    createdAt: t('2026-01-30T00:00:00Z'),
    primaryContact: { name: 'Дэлгэрцэцэг', email: 'admin@umbrella.example' },
    seatsUsed: 0,
    seatsLimit: 25,
    mrrMnt: 0,
    billingStatus: 'past_due',
    lastActiveAt: t('2026-04-22T14:10:00Z'),
    flags: { sso: false, api: false, telegram: false, branding: false, beta: false },
  },
  {
    id: 't-demo',
    name: 'Demo Tenant',
    domain: 'demo',
    logoEmoji: '🧪',
    status: 'active',
    tier: 'starter',
    createdAt: t('2026-05-12T00:00:00Z'),
    primaryContact: { name: 'Internal Demo', email: 'demo@example.com' },
    seatsUsed: 3,
    seatsLimit: 25,
    mrrMnt: 0,
    billingStatus: 'trial',
    lastActiveAt: t('2026-05-15T03:14:00Z'),
    flags: { sso: false, api: true, telegram: false, branding: false, beta: true },
  },
];

export const MOCK_SYSTEM_HEALTH: SystemHealth = {
  api: { status: 'healthy', p95LatencyMs: 42, detail: 'v1 · 2 replicas' },
  database: { status: 'healthy', p95LatencyMs: 8, detail: 'pool 4/10' },
  email: { status: 'degraded', p95LatencyMs: 1240, detail: 'SES sandbox' },
  extra: [],
};

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'an-001',
    title: 'Төлөвлөгөөт засвар',
    body: '05-сарын 18-ны 02:00–03:00 UB цагт өгөгдлийн санг шинэчилнэ. Систем түр зогсоно.',
    severity: 'maintenance',
    target: 'all',
    startsAt: t('2026-05-18T02:00:00Z'),
    endsAt: t('2026-05-18T03:00:00Z'),
    status: 'scheduled',
    createdBy: 'ops@example.com',
  },
  {
    id: 'an-002',
    title: 'Business tier-д шинэ боломж',
    body: 'Business+ tier-д хэлтсийн тайлан нэмэгдлээ. Тохиргоо → Тайлан.',
    severity: 'info',
    target: 'tier',
    targetTier: 'business',
    startsAt: t('2026-05-10T00:00:00Z'),
    status: 'live',
    createdBy: 'ops@example.com',
  },
];

export const MOCK_PLANS: PlanDefinition[] = [
  { id: 'starter', name: 'Starter', priceMnt: 350_000, seatLimit: 25 },
  { id: 'growth', name: 'Growth', priceMnt: 1_000_000, seatLimit: 120, notes: 'Хамгийн их зарагддаг tier' },
  { id: 'business', name: 'Business', priceMnt: 3_000_000, seatLimit: 600 },
  { id: 'enterprise', name: 'Enterprise', priceMnt: null, seatLimit: null, notes: '“Холбогдох”. Custom contract.' },
];

export const MOCK_INTERNAL_USERS: InternalUser[] = [
  { id: 'su-001', name: 'Ops One', email: 'ops@example.com', role: 'super-admin', lastActiveAt: t('2026-05-15T08:00:00Z'), createdAt: t('2026-01-01T00:00:00Z') },
  { id: 'su-002', name: 'Ops Two', email: 'ops2@example.com', role: 'super-admin', lastActiveAt: t('2026-05-15T07:30:00Z'), createdAt: t('2026-01-01T00:00:00Z') },
];

export const MOCK_SUPER_AUDIT: SuperAuditLogEntry[] = [
  { id: 'sa-003', tenantId: 't-initech', tenantName: 'Initech', actor: 'system', actorKind: 'system', action: 'billing.past_due.flagged', resource: 'invoice INV-2026-05', severity: 'warning', createdAt: t('2026-05-14T00:01:00Z') },
  { id: 'sa-004', tenantId: 't-acme', tenantName: 'Acme Corp', actor: 'admin@acme.example', actorKind: 'tenant-admin', action: 'member.invite', resource: 'worker x3', severity: 'info', createdAt: t('2026-05-14T16:30:00Z') },
  { id: 'sa-005', tenantId: 't-umbrella', tenantName: 'Umbrella LLC', actor: 'ops@example.com', actorKind: 'super-admin', action: 'tenant.pause', severity: 'critical', createdAt: t('2026-04-22T14:10:00Z') },
  { id: 'sa-006', tenantId: 't-globex', tenantName: 'Globex', actor: 'ops@example.com', actorKind: 'super-admin', action: 'tenant.create', severity: 'info', createdAt: t('2026-05-08T11:00:00Z') },
  { id: 'sa-007', tenantId: 't-initech', tenantName: 'Initech', actor: 'admin@initech.example', actorKind: 'tenant-admin', action: 'flag.api.enable.requested', severity: 'info', createdAt: t('2026-05-13T09:14:00Z') },
];

export function buildSuperAdminStats(tenants: Tenant[]): SuperAdminStats {
  const byTier: Record<TenantTier, number> = { starter: 0, growth: 0, business: 0, enterprise: 0 };
  let mrr = 0;
  let trial = 0;
  let active = 0;
  let onboarding = 0;
  let seats = 0;
  for (const t of tenants) {
    byTier[t.tier]++;
    mrr += t.mrrMnt;
    if (t.billingStatus === 'trial') trial++;
    if (t.status === 'active') active++;
    if (t.status === 'onboarding') onboarding++;
    seats += t.seatsUsed;
  }
  return {
    totalTenants: tenants.length,
    activeTenants: active,
    onboardingTenants: onboarding,
    totalMrrMnt: mrr,
    trialTenants: trial,
    totalSeatsUsed: seats,
    tenantsByTier: byTier,
  };
}

// API surface that the super-admin app needs. Kept as a separate interface so the
// main AppApi composes it; this lets the mock + http clients implement it
// independently.
export interface SuperAdminApi {
  listTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | null>;
  createTenant(input: { name: string; slug: string; adminEmail: string }): Promise<{
    tenant: Tenant;
    inviteToken: string;
    acceptUrl: string;
  }>;
  updateTenant(id: string, patch: Partial<Tenant>): Promise<Tenant>;
  pauseTenant(id: string): Promise<Tenant>;
  resumeTenant(id: string): Promise<Tenant>;
  archiveTenant(id: string): Promise<void>;
  restoreTenant(id: string): Promise<Tenant>;
  getSystemHealth(): Promise<SystemHealth>;
  listSuperAuditLogs(filter?: { tenantId?: string; severity?: SuperAuditLogEntry['severity'] }): Promise<SuperAuditLogEntry[]>;
  listAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(input: Omit<Announcement, 'id' | 'status' | 'createdBy'>): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
  listPlans(): Promise<PlanDefinition[]>;
  updatePlan(id: TenantTier, patch: Partial<PlanDefinition>): Promise<PlanDefinition>;
  listInternalUsers(): Promise<InternalUser[]>;
  getSuperAdminStats(): Promise<SuperAdminStats>;
}
