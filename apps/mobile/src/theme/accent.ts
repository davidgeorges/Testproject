export const DEFAULT_ACCENT_COLOR = '#70737A';

export const normalizeAccentColor = (value: string) => {
  const candidate = value.trim().toUpperCase();
  const prefixed = candidate.startsWith('#') ? candidate : `#${candidate}`;
  return /^#[0-9A-F]{6}$/.test(prefixed) ? prefixed : null;
};

const rgb = (value: string) => {
  const normalized = normalizeAccentColor(value) ?? DEFAULT_ACCENT_COLOR;
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ] as const;
};

export const mixAccentColor = (base: string, target: '#FFFFFF' | '#000000', amount: number) => {
  const [red, green, blue] = rgb(base);
  const targetChannel = target === '#FFFFFF' ? 255 : 0;
  const channel = (value: number) =>
    Math.round(value + (targetChannel - value) * Math.max(0, Math.min(1, amount)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(red)}${channel(green)}${channel(blue)}`.toUpperCase();
};

export const accentWithAlpha = (base: string, alpha: number) => {
  const normalized = normalizeAccentColor(base) ?? DEFAULT_ACCENT_COLOR;
  const alphaHex = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${normalized}${alphaHex}`.toUpperCase();
};

export const accentTextColor = (base: string) => {
  const channels = rgb(base);
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const red = linear(channels[0]);
  const green = linear(channels[1]);
  const blue = linear(channels[2]);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > 0.44 ? '#171719' : '#FFFFFF';
};
