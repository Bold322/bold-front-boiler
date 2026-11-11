import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { heroImages } from './hero-images';

export type HeroSelection = 'random' | (typeof heroImages)[number];

export interface AppearanceSettings {
  hero: HeroSelection;
  heroBlur: number;
  dotEnabled: boolean;
  dotOpacity: number;
  dotSpacing: number;
  dotRadius: number;
  dotGradientFrom: string;
  dotGradientTo: string;
  dotBulgeStrength: number;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  hero: 'random',
  heroBlur: 36,
  dotEnabled: true,
  dotOpacity: 80,
  dotSpacing: 14,
  dotRadius: 1.5,
  dotGradientFrom: 'rgba(168, 85, 247, 0.35)',
  dotGradientTo: 'rgba(180, 151, 207, 0.25)',
  dotBulgeStrength: 67,
};

interface AppearanceContextValue {
  settings: AppearanceSettings;
  setSetting: <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => void;
  reset: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

const STORAGE_KEY = 'app:appearance';

function loadSettings(): AppearanceSettings {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
    return { ...DEFAULT_APPEARANCE, ...parsed };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(loadSettings);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota errors */
    }
  }, [settings]);

  const setSetting = useCallback<AppearanceContextValue['setSetting']>(
    (key, value) => setSettings((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const reset = useCallback(() => setSettings(DEFAULT_APPEARANCE), []);

  const value = useMemo<AppearanceContextValue>(
    () => ({ settings, setSetting, reset }),
    [settings, setSetting, reset],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider');
  return ctx;
}
