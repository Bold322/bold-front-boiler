import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Blocks, Settings, Users } from 'lucide-react';
import { AmbientDotField, SpotlightCard, WorkspaceShell } from '@app/ui';
import { useAppApi, useSessionQuery } from '@app/query';
import { hasAnyRole } from '@app/auth';
import { ClientSidebar } from './client-sidebar';

/**
 * Placeholder landing page for the authed client app. Replace this with the
 * product's first real surface: add a feature lib under libs/features/<name>,
 * export a page component, and point the `/` route in apps/client/src/main.tsx
 * at it.
 */
export function HomePage() {
  const api = useAppApi();
  const sessionQuery = useSessionQuery(api);
  const navigate = useNavigate();
  const user = sessionQuery.data?.user;
  const isAdmin = hasAnyRole(sessionQuery.data, ['admin', 'super-admin']);

  return (
    <WorkspaceShell sidebar={<ClientSidebar />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-8 py-10">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Нүүр
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Сайн байна уу{user ? `, ${user.name}` : ''} 👋
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/60">
              Энэ бол бүтээгдэхүүний үндсэн хуудасны байрлал. Нэвтрэлт, урилга, гишүүд,
              хэлтэс, тохиргоо зэрэг суурь хэсгүүд бэлэн; өөрийн feature-ээ эндээс эхлүүлнэ.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <SpotlightCard className="p-5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                <Blocks className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Feature нэмэх</h3>
              <p className="mt-1 text-sm text-white/60">
                <code className="text-white/80">libs/features/&lt;name&gt;</code> дор шинэ lib
                үүсгээд <code className="text-white/80">main.tsx</code>-д route нэмнэ.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
                <Settings className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Тохиргоо</h3>
              <p className="mt-1 text-sm text-white/60">
                Профайл, үзэмж, мэдэгдэл, нууц үг, хэл.
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: '/settings' })}
                className="mt-3 inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
              >
                Нээх <ArrowRight className="size-3" />
              </button>
            </SpotlightCard>

            {isAdmin && (
              <SpotlightCard className="p-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                  <Users className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">Удирдлага</h3>
                <p className="mt-1 text-sm text-white/60">
                  Гишүүд урих, хэлтэс/түвшин удирдах, идэвхийн бүртгэл.
                </p>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/admin' })}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                >
                  Нээх <ArrowRight className="size-3" />
                </button>
              </SpotlightCard>
            )}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
