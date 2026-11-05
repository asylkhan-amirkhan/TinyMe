export const garlandModes = ['steady', 'flow', 'twinkle', 'flow-twinkle'] as const;
export type GarlandMode = typeof garlandModes[number];
export type AccentLights = {
  garlandMode: GarlandMode;
  garland: boolean; desk: boolean; garlandInstalled: boolean;
  garlandColor: string; deskColor: string;
  garlandBrightness: number; deskBrightness: number;
};
export const defaultAccentLights: AccentLights = {
  garlandMode: 'steady',
  garland: true, desk: true, garlandInstalled: true,
  garlandColor: '#ffbb6b', deskColor: '#ffbe7b',
  garlandBrightness: 100, deskBrightness: 100,
};
export const accentLightsKey = 'myroom:accent-lights';
export function parseAccentLights(raw: string | null): AccentLights {
  try {
    const value = raw ? JSON.parse(raw) : null;
    const result = { ...defaultAccentLights };
    for (const key of ['garland', 'desk', 'garlandInstalled'] as const)
      if (typeof value?.[key] === 'boolean') result[key] = value[key];
    for (const key of ['garlandColor', 'deskColor'] as const)
      if (typeof value?.[key] === 'string' && /^#[0-9a-f]{6}$/i.test(value[key])) result[key] = value[key];
    for (const key of ['garlandBrightness', 'deskBrightness'] as const)
      if (typeof value?.[key] === 'number' && Number.isFinite(value[key])) result[key] = Math.round(Math.max(0, Math.min(100, value[key])));
    if (garlandModes.includes(value?.garlandMode)) result.garlandMode = value.garlandMode;
    return result;
  } catch { return { ...defaultAccentLights }; }
}
export function lightRgb(hex: string): string {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(',');
}
