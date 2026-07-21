import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppTheme = 'system' | 'light' | 'dark' | 'sage' | 'sunset';
export type AppDensity = 'comfortable' | 'compact';

export type AppPreferences = {
  theme: AppTheme;
  density: AppDensity;
  reduceMotion: boolean;
  autoReplayPrompts: boolean;
  showPracticeTips: boolean;
  llmModel: string;
  imageModel: string;
  whisperModel: string;
  ttsVoice: string;
};

const STORAGE_KEY = 'c1sc.preferences.v1';

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'system',
  density: 'comfortable',
  reduceMotion: false,
  autoReplayPrompts: false,
  showPracticeTips: true,
  llmModel: 'qwen2.5:7b-instruct',
  imageModel: '',
  whisperModel: 'small.en',
  ttsVoice: 'british_male',
};

type PreferencesContextValue = {
  preferences: AppPreferences;
  updatePreferences: (updates: Partial<AppPreferences>) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function loadPreferences(): AppPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<AppPreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function getAppliedTheme(theme: AppTheme): Exclude<AppTheme, 'system'> {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyPreferences(preferences: AppPreferences) {
  const root = document.documentElement;
  const appliedTheme = getAppliedTheme(preferences.theme);

  root.classList.remove('dark', 'theme-light', 'theme-sage', 'theme-sunset', 'density-compact', 'reduce-motion');
  root.classList.add(`theme-${appliedTheme}`);

  if (appliedTheme === 'dark') root.classList.add('dark');
  if (preferences.density === 'compact') root.classList.add('density-compact');
  if (preferences.reduceMotion) root.classList.add('reduce-motion');
  root.dataset.theme = preferences.theme;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(loadPreferences);

  useEffect(() => {
    applyPreferences(preferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyPreferences(preferences);

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [preferences]);

  const updatePreferences = useCallback((updates: Partial<AppPreferences>) => {
    setPreferences((current) => ({ ...current, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo(
    () => ({ preferences, updatePreferences, resetPreferences }),
    [preferences, updatePreferences, resetPreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return context;
}
