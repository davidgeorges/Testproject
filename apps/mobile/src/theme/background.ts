import { normalizeAccentColor } from './accent';

export const DEFAULT_DARK_BACKGROUND_COLOR = '#0B0B0F';
export const DEFAULT_LIGHT_BACKGROUND_COLOR = '#F4F3F7';

export const resolveBackgroundColor = (value: string | null | undefined, theme: 'dark' | 'light') =>
  normalizeAccentColor(value) ??
  (theme === 'dark' ? DEFAULT_DARK_BACKGROUND_COLOR : DEFAULT_LIGHT_BACKGROUND_COLOR);
