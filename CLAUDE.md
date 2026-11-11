# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Project: bold-front-boiler

A React 19 + Vite + Nx monorepo **boilerplate** for multi-tenant SaaS frontends. It contains the platform layer only (auth, invites, tenant admin, super-admin console, settings, UI kit) and a placeholder home page. Product features are meant to be added as new `libs/features/*` libs. UI copy is Mongolian (no i18n layer). The matching backend is `bold-back-boiler` (Go).

## Commands

Package manager is **pnpm** (v11; `allowBuilds` + `overrides` live in `pnpm-workspace.yaml`, not `package.json`); always go through `nx`.

- Dev server: `pnpm nx serve client` (port 4200) / `pnpm nx serve super-admin` (4201)
- Build: `pnpm nx build client` → `dist/apps/client`
- Everything: `pnpm build` / `pnpm typecheck` / `pnpm test` (wrap `nx run-many`)
- One project: `pnpm nx typecheck <project>` (`tsc -b`), `pnpm nx test <project>` (Vitest via `@nx/vite`)
- Single test: `pnpm nx test shared-api -- -t "substring"`
- Lint: `pnpm lint` (`eslint apps libs`, flat config in `eslint.config.mjs`; no per-project nx lint target)
- `pnpm nx sync` fixes TS project references when nx complains they drift (`nx.json` has `sync.applyChanges: true`)

Mock vs real backend: `VITE_USE_MOCK=true` (default in `.env.example`) uses the in-memory `MockApiClient`; `false` calls `VITE_API_BASE_URL`. Env lives in `apps/<app>/.env.local`.

Prettier: `.prettierrc` (single quotes). Husky pre-commit runs `pnpm lint` → `pnpm typecheck` → `pnpm build`; pre-push runs `osv-scanner` on the lockfile when installed (skips with a warning otherwise). CI (`.github/workflows/ci.yml`) runs lint/typecheck/build/test on push + PR. `Dockerfile` (+ `infra/nginx-spa.conf`, `infra/compose.yml`) builds either app (`--build-arg APP=client|super-admin`) into an nginx image; `vercel.json` builds `client` on Vercel.

## Architecture

Nx monorepo. React 19 + Vite + Tailwind v4 + shadcn (new-york; components in `@app/ui`). TanStack Router/Query (Form/Table/Virtual installed). Zod v4. Two apps: **`client`** (product) and **`super-admin`** (internal console). Path aliases are `@app/*` → `tsconfig.base.json` `paths` (mirrored in each `apps/*/vite.config.ts` `resolve.alias`; keep both in sync when adding a lib).

**The central seam is `AppApi`** (`libs/shared/api/src/index.ts`, extends `SuperAdminApi` from `super-admin.ts`). One interface, two implementations in the same file:

- `MockApiClient` — in-memory, seeded fixtures (members, departments/levels, tenants, plans, announcements, audit), simulated latency. **All state resets on reload, including the session.** `googleLoginUrl()` returns null → Google button hidden. Login with an `admin@…` email to get the admin role.
- `ApiClient` — real `fetch` against `VITE_API_BASE_URL`. Access JWT in `localStorage` (`app:token`), rotating httpOnly refresh cookie on `/auth/*`; `authedFetch` does a single-flight `POST /auth/refresh` + one retry on 401, and a failed refresh clears the token (`getSession` then returns no user). Login/accept-invite/logout/refresh use `credentials: 'include'`; everything else is bearer-only. Snake_case backend rows are mapped to the camelCase types in this file (`toMember`, `toInvite`, `mapBackendTenant`, …).

Wired endpoints: auth (`/auth/login`, `/auth/accept-invite`, `/auth/logout`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/google/login`), `/me` (profile + password change), `/preferences`, `/departments`, `/admin/users[...]` (list, user-type, levels, delete/restore), `/admin/invites[...]` (single, bulk CSV, list, revoke, resend), `/admin/departments[...]` (+ levels CRUD), `/admin/audit/membership-changes`, `/superadmin/tenants[...]` (list incl. deleted, create → one-time invite link, patch name/tier/flags, suspend/unsuspend/delete/restore, per-tenant users + invites), `/superadmin/system/health`, `/superadmin/audit`, `/superadmin/announcements`, `/superadmin/plans`, `/superadmin/internal-users`, `/superadmin/stats`. `signup()` throws in real mode (invite-only).

`main.tsx` picks the implementation from `VITE_USE_MOCK` and injects it through `AppApiProvider`. **Any new backend capability = add a method to `AppApi`, implement it in both classes, expose a hook in `@app/query`.** Mock parity is required.

**Data access goes through `@app/query` only** (`libs/shared/query/src/index.tsx`): react-query hooks with a centralized `queryKeys` map; mutations own their invalidation (`invalidateMembers`, `invalidateTenantMembers` helpers). A `QueryCache`/`MutationCache` `onError` toasts every failure via `sonner`, so hooks don't need their own error toasts. Feature components never call `AppApi` directly.

**Routing is code-defined** with TanStack Router `createRoute` in `apps/client/src/main.tsx` and `apps/super-admin/src/main.tsx`. Client: public routes (`/login`, `/signup`, `/forgot-password`, `/invite?token=`, `/auth/google/done`) under root; `_app` layout = `ClientLayout` (requires session, else `/login`); `/admin` = `AdminGuard` (requires `admin`/`super-admin`). `HOME_PATH` (`/`) is where auth flows land; `HomePage` in `features-client-shell` is the placeholder to replace with the product's first screen. Super-admin: `RootGate` auto-logs-in a mock superadmin when `VITE_USE_MOCK=true`, otherwise renders `LoginPage` and requires a real superadmin session; `AccessGate` blocks non-superadmins.

Roles (`@app/auth`: `hasAnyRole`, `requireRoles`) are additive, derived from backend `user_type`: worker → `[user]`, admin → `[user, admin]`, superadmin → `[user, admin, super-admin]`.

**Library layering** is declared with Nx tags (`scope:` + `type:` in each `project.json`):

- `libs/shared/*` — `api` (seam), `query` (hooks), `auth` (session/roles), `config` (Zod env), `ui` (shadcn + `WorkspaceShell`, `AppearanceProvider`, `SidebarCollapseProvider`, effects), `forms` (Zod schemas), `utils` (DOM-free helpers)
- `libs/features/*` — `auth` (login/signup/forgot/accept-invite pages, hero showcase), `client-shell` (`ClientSidebar` with `MAIN_NAV`/`ADMIN_NAV`, `HomePage`, `SettingsPage`), `enterprise-admin` (overview derived from members/invites/departments queries, `MembersPage`, `DepartmentsPage`), `ops` (super-admin pages + tenant detail tabs: overview/members/activity/flags/danger). Features compose shared libs and are wired into routes by the app, never by each other.

Appearance (hero image, blur, dot field) and sidebar state persist to `localStorage` under `app:appearance` / `app:sidebar-collapsed`.

## Adding a feature (checklist)

1. `pnpm nx g @nx/react:lib libs/features/<name> --bundler=none --unitTestRunner=vitest`; tag `scope:client` (or `scope:super-admin`) + `type:feature`.
2. Add `@app/features-<name>` to `tsconfig.base.json` paths and the app's `vite.config.ts` alias.
3. Extend `AppApi` (+ both clients) and `@app/query` if the feature needs data.
4. Export a page component; add a `createRoute` in the app's `main.tsx` and a `MAIN_NAV` entry in `client-sidebar.tsx`.
5. `pnpm lint && pnpm typecheck && pnpm build && pnpm test`.

## Tests

- `libs/shared/api/src/index.spec.ts` covers the mock client (roles, members/levels/audit, departments, bulk invites) and the real client's refresh interceptor (401 → refresh → retry, single-flight, failed refresh clears token). It runs in the `node` environment with a tiny `localStorage` shim; keep new api tests DOM-free.
- Feature/app tests use jsdom (`apps/*/vite.config.ts`).
