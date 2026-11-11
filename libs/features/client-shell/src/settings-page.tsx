import { useState, type FormEvent } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import {
  ArrowLeft,
  Bell,
  ImageIcon,
  Languages,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import {
  AmbientDotField,
  cn,
  DEFAULT_APPEARANCE,
  heroImages,
  Slider,
  Switch,
  useAppearance,
  WorkspaceShell,
} from '@app/ui';
import type { AccountPreferences, UserProfile } from '@app/api';
import { toast } from 'sonner';
import {
  useChangePasswordMutation,
  usePreferencesQuery,
  useProfileQuery,
  useUpdatePreferencesMutation,
  useUpdateProfileMutation,
  useAppApi,
} from '@app/query';
import { ClientSidebar } from './client-sidebar';

export type SettingsCategory =
  | 'appearance'
  | 'profile'
  | 'notifications'
  | 'security'
  | 'language';

interface CategoryDef {
  id: SettingsCategory;
  label: string;
  icon: typeof Palette;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'profile', label: 'Профайл', icon: User },
  { id: 'appearance', label: 'Үзэмж', icon: Palette },
  { id: 'notifications', label: 'Мэдэгдэл', icon: Bell },
  { id: 'security', label: 'Аюулгүй байдал', icon: ShieldCheck },
  { id: 'language', label: 'Хэл', icon: Languages },
];

function heroLabel(src: string): string {
  return src
    .replace(/^\/auth\//, '')
    .replace(/^hero-/, '')
    .replace(/\.[a-z]+$/, '')
    .replace(/^./, (c) => c.toUpperCase());
}

function SettingsTopBar() {
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = router.history.length > 1;
  return (
    <>
      <button
        type="button"
        onClick={() => (canGoBack ? router.history.back() : navigate({ to: '/' }))}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
      >
        <ArrowLeft className="size-3.5" />
        Буцах
      </button>
      <div />
    </>
  );
}

export interface SettingsPageProps {
  initialCategory?: SettingsCategory;
}

export function SettingsPage({ initialCategory = 'appearance' }: SettingsPageProps = {}) {
  const [active, setActive] = useState<SettingsCategory>(initialCategory);
  const { settings, setSetting, reset } = useAppearance();

  return (
    <WorkspaceShell sidebar={<ClientSidebar />} topBar={<SettingsTopBar />}>
      <div className="relative min-h-full w-full">
        <AmbientDotField />
        <div className="relative z-10 mx-auto grid h-full w-full max-w-5xl grid-cols-[220px_1fr] gap-6 px-8 py-8">
          <aside className="flex flex-col gap-1">
            <h1 className="px-3 pb-3 text-2xl font-semibold tracking-tight text-white">
              Тохиргоо
            </h1>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActive(cat.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
                    active === cat.id
                      ? 'bg-white/10 text-white ring-1 ring-white/10'
                      : 'text-white/70 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {cat.label}
                </button>
              );
            })}
          </aside>

          <section className="flex flex-col gap-6 pb-10">
            {active === 'appearance' && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-white">Үзэмж</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Дэвсгэр зураг, фон-ийн blur, хөдөлгөөнт элементүүдийг таны хүсэлд тааруулах.
                    Өөрчлөлт нь шууд хадгалагдана.
                  </p>
                </div>

                <SettingGroup
                  icon={ImageIcon}
                  title="Дэвсгэр зураг"
                  description="Гадна талын blur-тай зураг — бүх хуудсанд харагдана."
                >
                  <HeroPicker
                    value={settings.hero}
                    onChange={(v) => setSetting('hero', v)}
                  />
                  <SliderRow
                    label="Blur хүч"
                    value={settings.heroBlur}
                    min={0}
                    max={120}
                    step={1}
                    onChange={(v) => setSetting('heroBlur', v)}
                    suffix="px"
                  />
                </SettingGroup>

                <SettingGroup
                  icon={Sparkles}
                  title="Хөдөлгөөнтэй цэгүүд"
                  description="Cursor-аар реактив фон. Нягтрал, өнгө, эффектийг тааруулна."
                >
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">Идэвхтэй</p>
                      <p className="text-xs text-white/50">Цэгийн фон-ийг бүхэлд нь нээх / хаах</p>
                    </div>
                    <Switch
                      checked={settings.dotEnabled}
                      onCheckedChange={(v: boolean) => setSetting('dotEnabled', v)}
                    />
                  </div>

                  <div
                    className={cn(
                      'space-y-4 transition',
                      !settings.dotEnabled && 'pointer-events-none opacity-40',
                    )}
                  >
                    <SliderRow
                      label="Дэлгэцийн ил тод байдал"
                      value={settings.dotOpacity}
                      min={10}
                      max={100}
                      step={1}
                      onChange={(v) => setSetting('dotOpacity', v)}
                      suffix="%"
                    />
                    <SliderRow
                      label="Цэг хоорондын зай"
                      value={settings.dotSpacing}
                      min={8}
                      max={32}
                      step={1}
                      onChange={(v) => setSetting('dotSpacing', v)}
                      suffix="px"
                    />
                    <SliderRow
                      label="Цэгийн хэмжээ"
                      value={settings.dotRadius * 10}
                      min={8}
                      max={32}
                      step={1}
                      onChange={(v) => setSetting('dotRadius', v / 10)}
                      formatValue={(v) => `${(v / 10).toFixed(1)}px`}
                    />
                    <SliderRow
                      label="Cursor-ын ивэрэх хүч"
                      value={settings.dotBulgeStrength}
                      min={0}
                      max={150}
                      step={1}
                      onChange={(v) => setSetting('dotBulgeStrength', v)}
                    />
                  </div>
                </SettingGroup>

                <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-white">Анхдагшаар сэргээх</p>
                    <p className="mt-0.5 text-xs text-white/50">
                      Бүх үзэмжийн тохиргоог үндсэн утга руу буцаана.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    <RotateCcw className="size-3.5" />
                    Сэргээх
                  </button>
                </div>
              </>
            )}

            {active === 'profile' && <ProfilePanel />}
            {active === 'notifications' && <NotificationsPanel />}
            {active === 'security' && <SecurityPanel />}
            {active === 'language' && <LanguagePanel />}
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function SettingGroup({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ImageIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-violet-300" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {description && (
        <p className="mt-1 text-xs text-white/50">{description}</p>
      )}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = '',
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix?: string;
  formatValue?: (v: number) => string;
}) {
  const displayValue = formatValue ? formatValue(value) : `${value}${suffix}`;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-white/80">{label}</p>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] tabular-nums text-white/60">
          {displayValue}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v: number[]) => onChange(v[0]!)}
      />
    </div>
  );
}

function HeroPicker({
  value,
  onChange,
}: {
  value: typeof DEFAULT_APPEARANCE.hero;
  onChange: (v: typeof DEFAULT_APPEARANCE.hero) => void;
}) {
  const options: Array<{ value: typeof DEFAULT_APPEARANCE.hero; label: string; src?: string }> = [
    { value: 'random', label: 'Санамсаргүй' },
    ...heroImages.map((src) => ({ value: src, label: heroLabel(src), src })),
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
      {options.map((opt) => {
        const isActive = value === opt.value;
        const isRandom = opt.value === 'random';
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-lg border-2 transition',
              isActive
                ? 'border-violet-400 ring-2 ring-violet-400/30'
                : 'border-white/10 hover:border-white/30',
            )}
          >
            {isRandom ? (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/30 via-purple-600/30 to-indigo-700/30 text-[10px] font-medium text-white/80">
                Санам-<br />саргүй
              </div>
            ) : (
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${opt.src})` }}
              />
            )}
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 px-1.5 py-1 text-[10px] font-medium text-white',
                'bg-gradient-to-t from-black/80 to-transparent',
              )}
            >
              {opt.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const FIELD_CLASS =
  'h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 focus:border-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-400/20 disabled:opacity-50';

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-white/50">{description}</p>
    </div>
  );
}

function PanelLoading() {
  return <div className="py-10 text-sm text-white/40">Ачааллаж байна...</div>;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-white/60">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={FIELD_CLASS}
      />
      {hint && <p className="text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

function ProfilePanel() {
  const api = useAppApi();
  const profileQuery = useProfileQuery(api);
  if (profileQuery.isLoading || !profileQuery.data) return <PanelLoading />;
  return <ProfileForm profile={profileQuery.data} />;
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const api = useAppApi();
  const updateProfile = useUpdateProfileMutation(api);
  const [name, setName] = useState(profile.name);
  const [department, setDepartment] = useState(profile.department ?? '');
  const [jobTitle, setJobTitle] = useState(profile.jobTitle ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    updateProfile.mutate(
      {
        name: name.trim(),
        department: department.trim(),
        jobTitle: jobTitle.trim(),
        phone: phone.trim(),
      },
      { onSuccess: () => toast.success('Профайл шинэчлэгдлээ') },
    );
  }

  return (
    <>
      <PanelHeader
        title="Профайл"
        description="Таны нэр, хэлтэс, холбоо барих мэдээлэл. Имэйл нь нэвтрэх бүртгэлд холбоотой тул өөрчлөгдөхгүй."
      />
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Нэр" value={name} onChange={setName} placeholder="Таны нэр" />
        <Field
          label="Имэйл"
          value={profile.email}
          disabled
          hint="Имэйл өөрчлөхийн тулд админд хандана уу."
        />
        <Field label="Хэлтэс" value={department} onChange={setDepartment} placeholder="Жишээ: Хүний нөөц" />
        <Field label="Албан тушаал" value={jobTitle} onChange={setJobTitle} placeholder="Жишээ: Мэргэжилтэн" />
        <Field label="Утас" value={phone} onChange={setPhone} type="tel" placeholder="+976 ..." />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateProfile.isPending || !name.trim()}
            className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:from-violet-400 hover:to-purple-500 disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Хадгалж байна…' : 'Хадгалах'}
          </button>
        </div>
      </form>
    </>
  );
}

function NotificationsPanel() {
  const api = useAppApi();
  const prefsQuery = usePreferencesQuery(api);
  const updatePrefs = useUpdatePreferencesMutation(api);
  if (prefsQuery.isLoading || !prefsQuery.data) return <PanelLoading />;
  const prefs = prefsQuery.data;

  const rows: Array<{
    key: 'emailDigest' | 'mentionAlerts' | 'productUpdates';
    title: string;
    desc: string;
  }> = [
    { key: 'emailDigest', title: 'Имэйл тойм', desc: 'Долоо хоног тутмын ашиглалтын тоймыг имэйлээр авах' },
    { key: 'mentionAlerts', title: 'Дурдсан мэдэгдэл', desc: 'Танд хамаатай үйлдэл гарвал мэдэгдэнэ' },
    { key: 'productUpdates', title: 'Бүтээгдэхүүний шинэчлэл', desc: 'Шинэ боломж, өөрчлөлтийн талаар мэдэгдэнэ' },
  ];

  return (
    <>
      <PanelHeader title="Мэдэгдэл" description="Ямар тохиолдолд танд мэдэгдэх вэ. Өөрчлөлт шууд хадгалагдана." />
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-white">{row.title}</p>
              <p className="text-xs text-white/50">{row.desc}</p>
            </div>
            <Switch
              checked={prefs[row.key]}
              disabled={updatePrefs.isPending}
              onCheckedChange={(v: boolean) => updatePrefs.mutate({ [row.key]: v })}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function SecurityPanel() {
  const api = useAppApi();
  const changePassword = useChangePasswordMutation(api);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (next !== confirm) {
      toast.error('Шинэ нууц үг хоёр талдаа таарахгүй байна.');
      return;
    }
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success('Нууц үг шинэчлэгдлээ');
          setCurrent('');
          setNext('');
          setConfirm('');
        },
      },
    );
  }

  return (
    <>
      <PanelHeader title="Аюулгүй байдал" description="Нууц үгээ шинэчлэх. Шинэ нууц үг дор хаяж 8 тэмдэгт." />
      <form className="flex max-w-md flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Одоогийн нууц үг" value={current} onChange={setCurrent} type="password" />
        <Field label="Шинэ нууц үг" value={next} onChange={setNext} type="password" />
        <Field label="Шинэ нууц үг (давтах)" value={confirm} onChange={setConfirm} type="password" />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={changePassword.isPending || !current || !next}
            className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:from-violet-400 hover:to-purple-500 disabled:opacity-50"
          >
            {changePassword.isPending ? 'Шинэчилж байна…' : 'Нууц үг солих'}
          </button>
        </div>
      </form>
    </>
  );
}

const LANGUAGES: Array<{ value: AccountPreferences['language']; label: string }> = [
  { value: 'mn', label: 'Монгол' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];

function LanguagePanel() {
  const api = useAppApi();
  const prefsQuery = usePreferencesQuery(api);
  const updatePrefs = useUpdatePreferencesMutation(api);
  if (prefsQuery.isLoading || !prefsQuery.data) return <PanelLoading />;
  const language = prefsQuery.data.language;

  return (
    <>
      <PanelHeader
        title="Хэл"
        description="Интерфэйсийн хэл. Сонголт хадгалагдах ба орчуулга backend холбогдсоны дараа идэвхжинэ."
      />
      <div className="flex max-w-xs flex-col gap-2">
        <label className="text-xs font-medium text-white/60">Хэл</label>
        <select
          value={language}
          disabled={updatePrefs.isPending}
          onChange={(e) =>
            updatePrefs.mutate({
              language: e.target.value as AccountPreferences['language'],
            })
          }
          className={FIELD_CLASS}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value} className="bg-neutral-900">
              {l.label}
            </option>
          ))}
        </select>
        {language !== 'mn' && (
          <p className="text-[11px] text-amber-300/80">
            Одоогоор интерфэйс зөвхөн монголоор. Сонголт хадгалагдсан.
          </p>
        )}
      </div>
    </>
  );
}
