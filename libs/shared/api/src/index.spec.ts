import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, MockApiClient } from './index';

// The api lib runs its tests in the plain node environment (no DOM). ApiClient
// persists the access token through `localStorage`, so give the test a tiny
// in-memory Storage shim instead of pulling in a full DOM.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}
vi.stubGlobal('localStorage', new MemoryStorage());

function makeClient() {
  return new ApiClient({ apiBaseUrl: 'http://api.test' });
}

describe('MockApiClient', () => {
  describe('login', () => {
    it('grants admin role to admin@ emails and only user role otherwise', async () => {
      const client = new MockApiClient();

      const admin = await client.login('admin@example.com', 'anything');
      expect(admin.user?.roles).toContain('admin');

      const regular = await client.login('staff@example.com', 'anything');
      expect(regular.user?.roles).toEqual(['user']);
    });

    it('logout clears the in-memory session', async () => {
      const client = new MockApiClient();
      await client.login('staff@example.com', 'x');
      await client.logout();
      expect((await client.getSession()).user).toBeNull();
    });
  });

  describe('members + levels', () => {
    it('grantLevel updates the member and writes a membership audit entry', async () => {
      const client = new MockApiClient();
      await client.login('admin@example.com', 'x');

      await client.grantLevel('u-003', 'l-mgr');
      const member = await client.getMember('u-003');
      expect(member?.levelIds).toContain('l-mgr');
      expect(member?.levels).toContain('General / Manager');

      const audit = await client.listMembershipAudit();
      expect(audit[0]).toMatchObject({ targetUserId: 'u-003', levelId: 'l-mgr', action: 'grant' });
    });

    it('removeMember soft-deletes and restoreMember undoes it', async () => {
      const client = new MockApiClient();
      await client.removeMember('u-004');
      expect((await client.listMembers()).some((m) => m.id === 'u-004')).toBe(false);
      expect((await client.listMembers({ includeDeleted: true })).some((m) => m.id === 'u-004')).toBe(true);
      await client.restoreMember('u-004');
      expect((await client.listMembers()).some((m) => m.id === 'u-004')).toBe(true);
    });

    it('department CRUD round-trips through listDepartments', async () => {
      const client = new MockApiClient();
      const dept = await client.createDepartment({ name: 'Sales' });
      await client.createLevel(dept.id, { name: 'Rep', rank: 1 });
      const tree = await client.listDepartments();
      const sales = tree.find((d) => d.id === dept.id);
      expect(sales?.levels.map((l) => l.name)).toEqual(['Rep']);
    });
  });

  describe('invites', () => {
    it('bulkInviteMembers parses a CSV and skips duplicates', async () => {
      const client = new MockApiClient();
      const file = new File(['email\na@x.io\nb@x.io\na@x.io\nnot-an-email\n'], 'invites.csv', {
        type: 'text/csv',
      });
      const result = await client.bulkInviteMembers(file);
      expect(result.invited).toEqual(['a@x.io', 'b@x.io']);
      expect(result.total).toBe(2);
      expect((await client.listInvites())).toHaveLength(2);
    });
  });
});

describe('ApiClient refresh interceptor', () => {
  beforeEach(() => {
    localStorage.setItem('app:token', 'old-access');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('refreshes once on 401 then retries the original request', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/me') && calls.filter((c) => c.includes('/me')).length === 1) {
        return new Response('', { status: 401 });
      }
      if (url.endsWith('/auth/refresh')) {
        return new Response(JSON.stringify({ token: 'new-access' }), { status: 200 });
      }
      if (url.endsWith('/me')) {
        return new Response(
          JSON.stringify({ id: 'u1', email: 'a@b.c', display_name: 'A', user_type: 'worker' }),
          { status: 200 },
        );
      }
      return new Response('', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = makeClient();
    const session = await client.getSession();

    expect(session.user?.id).toBe('u1');
    expect(calls.filter((c) => c.includes('/auth/refresh'))).toHaveLength(1);
    expect(localStorage.getItem('app:token')).toBe('new-access');
  });

  it('single-flights concurrent 401s into one refresh', async () => {
    let refreshCount = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCount += 1;
        return new Response(JSON.stringify({ token: 'new-access' }), { status: 200 });
      }
      if (url.endsWith('/me')) {
        if (localStorage.getItem('app:token') === 'old-access') {
          return new Response('', { status: 401 });
        }
        return new Response(
          JSON.stringify({ id: 'u1', email: 'a@b.c', display_name: 'A', user_type: 'worker' }),
          { status: 200 },
        );
      }
      return new Response('', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = makeClient();
    const [s1, s2] = await Promise.all([client.getSession(), client.getSession()]);

    expect(refreshCount).toBe(1);
    expect(s1.user?.id).toBe('u1');
    expect(s2.user?.id).toBe('u1');
  });

  it('clears token and returns no user when refresh fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) return new Response('', { status: 401 });
      return new Response('', { status: 401 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = makeClient();
    const session = await client.getSession();
    expect(session.user).toBeNull();
    expect(localStorage.getItem('app:token')).toBeNull();
  });

  it('maps user_type to additive roles', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/me')) {
        return new Response(
          JSON.stringify({ id: 'u1', email: 'a@b.c', display_name: 'A', user_type: 'superadmin' }),
          { status: 200 },
        );
      }
      return new Response('', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const session = await makeClient().getSession();
    expect(session.user?.roles).toEqual(['user', 'admin', 'super-admin']);
  });
});
