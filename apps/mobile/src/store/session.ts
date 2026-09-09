import { create } from 'zustand';
type Session = {
  token: string | null;
  preview: boolean;
  theme: 'dark' | 'light';
  setToken: (token: string | null) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setPreview: (preview: boolean) => void;
};
// Demo tokens deliberately stay in memory. Production Firebase sessions need the native secure persistence adapter.
export const useSession = create<Session>((set) => ({
  token: null,
  preview: true,
  theme: 'dark',
  setToken: (token) => set({ token }),
  setTheme: (theme) => set({ theme }),
  setPreview: (preview) => set({ preview }),
}));
export const useLiveToken = () => useSession((s) => (s.preview ? null : s.token));
