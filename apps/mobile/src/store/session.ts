import { create } from 'zustand';
import { DEFAULT_ACCENT_COLOR } from '../theme/accent';
// Production data is always authoritative. Visual fixtures are never enabled in the app.
export const PREVIEW_ENABLED = false;
type Session = {
  token: string | null;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  authInitialized: boolean;
  preview: boolean;
  theme: 'dark' | 'light';
  accentColor: string;
  setToken: (token: string | null) => void;
  setIdentity: (
    identity: { userId: string; email: string | null; displayName: string | null } | null,
  ) => void;
  setAuthInitialized: (initialized: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAccentColor: (accentColor: string) => void;
  setPreview: (preview: boolean) => void;
};
// Demo tokens deliberately stay in memory. Production Firebase sessions need the native secure persistence adapter.
export const useSession = create<Session>((set) => ({
  token: null,
  userId: null,
  email: null,
  displayName: null,
  authInitialized: false,
  preview: PREVIEW_ENABLED,
  theme: 'dark',
  accentColor: DEFAULT_ACCENT_COLOR,
  setToken: (token) => set({ token }),
  setIdentity: (identity) => set(identity ?? { userId: null, email: null, displayName: null }),
  setAuthInitialized: (authInitialized) => set({ authInitialized }),
  setTheme: (theme) => set({ theme }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setPreview: (preview) => set({ preview: PREVIEW_ENABLED && preview }),
}));
export const useLiveToken = () => useSession((s) => (s.preview ? null : s.token));
