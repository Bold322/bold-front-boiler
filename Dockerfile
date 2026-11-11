# syntax=docker/dockerfile:1.7

# One Dockerfile, two apps. Build with --build-arg APP=client or APP=super-admin.
# VITE_API_BASE_URL is baked at build time; rebuild per environment.

FROM node:22-alpine AS build
ARG APP
ARG VITE_API_BASE_URL
ARG VITE_USE_MOCK=false

RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /repo

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_USE_MOCK=$VITE_USE_MOCK
# nx aborts non-interactive builds when tsconfig project refs drift. Apply
# the auto-fixes (in-place rewrites; same result as the interactive prompt)
# before invoking the build so CI doesn't bail on cosmetic sync.
RUN pnpm nx sync
RUN test -n "$APP" && pnpm nx build "$APP"

FROM nginx:1.27-alpine AS runtime
ARG APP
COPY --from=build /repo/dist/apps/${APP}/ /usr/share/nginx/html/
COPY infra/nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
