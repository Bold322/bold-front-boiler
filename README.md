# bold-front-boiler

> **Товч (MN):** React 19 + Vite + Nx monorepo суурь. Нэвтрэлт (урилгаар, JWT + refresh cookie, Google OAuth сонголттой), tenant admin (гишүүд, урилга, хэлтэс/түвшин), super-admin console (tenant lifecycle, flags, plans, announcements, audit, system health) бэлэн. Бүх өгөгдөл нэг `AppApi` interface-ээр дамждаг бөгөөд mock (backend-гүй) ба real (HTTP) хоёр хэрэгжилттэй. Өөрийн бүтээгдэхүүний feature-ээ `libs/features/<name>` дор нэмээд `apps/client/src/main.tsx`-д route холбоно. Backend хос нь [`bold-back-boiler`](https://github.com/Bold322/bold-back-boiler).

A frontend boilerplate for multi-tenant SaaS products. It ships the parts every product needs and nothing domain-specific:

- **Auth**: invite-only onboarding, email + password login, forgot/reset password, optional Google sign-in, bearer JWT with a rotating refresh cookie and a single-flight 401 interceptor.
- **Tenant admin** (`/admin`): members (soft delete / restore, admin ↔ worker), single + CSV bulk invites with revoke/resend, departments with ordered levels, membership audit feed.
- **Super-admin console** (`apps/super-admin`): tenant lifecycle (create → invite link, suspend, archive, restore), per-tenant members, feature flags, plans, announcements, cross-tenant audit, system health.
- **Mock/real API seam**: every screen works with `VITE_USE_MOCK=true` and no backend; flip it to `false` to talk to [`bold-back-boiler`](https://github.com/Bold322/bold-back-boiler).
- **UI kit**: Tailwind v4 + shadcn (new-york) components, a workspace shell with collapsible sidebar, user-tunable appearance (hero backdrop, blur, animated dot field), Mongolian UI copy.

## Stack

| Area | Choice |
| --- | --- |
| Monorepo | Nx 22 (`@nx/vite`, `@nx/js` typescript project refs) |
| App | React 19, Vite 8, TypeScript 5.9 |
| Routing / data | TanStack Router (code-defined), TanStack Query, TanStack Form/Table/Virtual available |
| Styling | Tailwind v4, shadcn/ui, `motion`, `lucide-react` |
| Validation | Zod v4 |
| Tests | Vitest + Testing Library (jsdom) |
| Quality gates | ESLint flat config, Prettier, Husky (pre-commit lint → typecheck → build; pre-push osv-scanner) |

## Quick start

```bash
pnpm install
cp apps/client/.env.example apps/client/.env.local          # VITE_USE_MOCK=true by default
cp apps/super-admin/.env.example apps/super-admin/.env.local
pnpm nx serve client          # http://localhost:4200
pnpm nx serve super-admin     # http://localhost:4201
```

Mock mode: log in with any email + any password. Use an `admin@…` address to get the tenant-admin role; the super-admin app auto-logs-in a fake superadmin.

Real mode: set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=http://localhost:3000` (the backend boilerplate's default port). The backend must list the SPA origin in `CORS_ALLOWED_ORIGINS` / `FRONTEND_BASE_URL` so the refresh cookie round-trips.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm nx serve client` / `super-admin` | Dev server with HMR |
| `pnpm build` | `nx run-many -t build` → `dist/apps/<app>` |
| `pnpm typecheck` | `tsc -b` per project |
| `pnpm test` | Vitest per project (`pnpm nx test shared-api -- -t "name"` for one test) |
| `pnpm lint` | `eslint apps libs` (flat config at the root) |
| `pnpm nx graph` | Visualize project dependencies |

## Layout

```
apps/
  client/          product app (login, invite accept, home, settings, /admin/*)
  super-admin/     internal ops console (/tenants, /system, /audit, /announcements, /config)
libs/
  shared/
    api/           AppApi interface + ApiClient (HTTP) + MockApiClient (in-memory)
    query/         react-query hooks + queryKeys; the ONLY way features reach the API
    auth/          session context + role helpers (hasAnyRole, requireRoles)
    config/        Zod-validated VITE_* env
    ui/            shadcn components, WorkspaceShell, Appearance, effects
    forms/         shared Zod form schemas
    utils/         DOM-free helpers (initials, relative time)
  features/
    auth/              LoginPage, SignupPage, ForgotPasswordPage, AcceptInvitePage
    client-shell/      ClientSidebar, HomePage (placeholder), SettingsPage
    enterprise-admin/  admin overview, MembersPage, DepartmentsPage
    ops/               super-admin pages, tenant detail tabs, sidebar
infra/             Dockerfile support: nginx SPA config, example compose
```

Path aliases are `@app/<lib>` (see `tsconfig.base.json` → `paths`; the Vite configs mirror them). Nx tags (`scope:*`, `type:*`) in each `project.json` describe layering: shared libs never import features; features never import each other, the app wires them into routes.

## The `AppApi` seam

`libs/shared/api/src/index.ts` defines one interface, `AppApi` (which extends `SuperAdminApi` from `super-admin.ts`), and two implementations:

- `ApiClient` — real `fetch` against `VITE_API_BASE_URL`. Bearer token in `localStorage` (`app:token`), refresh cookie on `/auth/*`, automatic single-flight refresh + retry on 401. Maps the backend's snake_case rows to the camelCase types features use.
- `MockApiClient` — seeded in-memory fixtures with simulated latency. State resets on reload (including the session).

`main.tsx` picks one from `VITE_USE_MOCK` and injects it via `AppApiProvider`. Features never touch `AppApi` directly; they use hooks from `@app/query`.

**Adding an endpoint** (the pattern for every new capability):

1. Add the method + types to `AppApi` in `libs/shared/api/src/index.ts`.
2. Implement it in **both** `ApiClient` and `MockApiClient` (mock parity keeps `VITE_USE_MOCK=true` honest).
3. Add a `useXxxQuery` / `useXxxMutation` in `libs/shared/query/src/index.tsx`, with its key in `queryKeys`; mutations own their invalidation.
4. Use the hook in a feature component.

**Adding a feature lib:**

```bash
pnpm nx g @nx/react:lib libs/features/<name> --bundler=none --unitTestRunner=vitest
```

Then add `@app/features-<name>` to `tsconfig.base.json` paths and the relevant `apps/*/vite.config.ts` alias map, tag it `scope:client` (or `scope:super-admin`) + `type:feature`, export a page component, and register a route in `apps/client/src/main.tsx`.

## Routing and auth

Routes are built in code with TanStack Router `createRoute` inside each app's `main.tsx` (no file-based routing). In the client app:

- Public: `/login`, `/signup` (throws in real mode: invite-only), `/forgot-password`, `/invite?token=` (accept invite → logged in), `/auth/google/done#token=` (Google callback landing).
- `_app` layout (`ClientLayout`): requires a session, otherwise redirects to `/login`. Children: `/` (HomePage placeholder), `/settings`, `/profile`.
- `/admin` (`AdminGuard`): requires the `admin` or `super-admin` role. Children: overview, `/admin/members`, `/admin/departments`.

Roles are additive and derived from the backend `user_type`: `worker → [user]`, `admin → [user, admin]`, `superadmin → [user, admin, super-admin]`.

Onboarding flow with the backend: superadmin creates a tenant (console → "Шинэ tenant") and gets a one-time invite link → the tenant admin accepts on `/invite` → invites the rest from `/admin/members` (single or CSV).

## Environment

| Var | Apps | Meaning |
| --- | --- | --- |
| `VITE_USE_MOCK` | both | `true` → `MockApiClient`; `false` → `ApiClient` |
| `VITE_API_BASE_URL` | both | Backend base URL (real mode only) |

Vite reads `apps/<app>/.env.local`; `.env.example` files document defaults.

## Deploy

Two options are included:

- **Docker + nginx** (`Dockerfile`, `infra/nginx-spa.conf`, `infra/compose.yml`): `docker build --build-arg APP=client --build-arg VITE_API_BASE_URL=https://api.example.com -t app-client .` (env is baked at build time, rebuild per environment). The nginx config serves hashed assets immutable, never caches `index.html`, and falls back to it for deep links.
- **Vercel** (`vercel.json`): builds `client` with `pnpm nx build client`.

CI (`.github/workflows/ci.yml`) runs lint → typecheck → build → test on every push and PR.

## Git hooks

Husky pre-commit runs `pnpm lint`, `pnpm typecheck`, `pnpm build` in that order. Pre-push runs `osv-scanner` against the lockfile when it is installed (skips with a warning otherwise); bypass once with `git push --no-verify`.

## Pairing with bold-back-boiler

The real client targets the routes exposed by [`bold-back-boiler`](https://github.com/Bold322/bold-back-boiler): `/auth/*`, `/me`, `/preferences`, `/departments`, `/admin/*`, `/superadmin/*`. The two repos are meant to evolve together — when you add a route on the backend, add the matching `AppApi` method here.
