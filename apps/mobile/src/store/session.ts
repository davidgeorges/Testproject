import { create } from 'zustand';
type Session = {
  token: string | null;
  authInitialized: boolean;
  preview: boolean;
  theme: 'dark' | 'light';
  setToken: (token: string | null) => void;
  setAuthInitialized: (initialized: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setPreview: (preview: boolean) => void;
};
// Demo tokens deliberately stay in memory. Production Firebase sessions need the native secure persistence adapter.
export const useSession = create<Session>((set) => ({
  token: null,
  authInitialized: false,
  preview: true,
  theme: 'dark',
  setToken: (token) => set({ token }),
  setAuthInitialized: (authInitialized) => set({ authInitialized }),
  setTheme: (theme) => set({ theme }),
  setPreview: (preview) => set({ preview }),
}));
export const useLiveToken = () => useSession((s) => (s.preview ? null : s.token));
