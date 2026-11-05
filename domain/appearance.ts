export type Appearance = { wallLeft: string; wallRight: string; floor: string };
export const defaultAppearance: Appearance = { wallLeft: '#345995', wallRight: '#bb6a93', floor: '#293249' };
export const colorPresets = [
 { name: 'После заката', colors: defaultAppearance },
 { name: 'Тёплый лён', colors: { wallLeft: '#a99580', wallRight: '#dcc9ae', floor: '#80624f' } },
 { name: 'Лесной дом', colors: { wallLeft: '#516b64', wallRight: '#91a58b', floor: '#655346' } },
 { name: 'Лавандовый сон', colors: { wallLeft: '#77749e', wallRight: '#b7a2c4', floor: '#4a465f' } },
];
export function validAppearance(value: unknown): value is Appearance {
 if (!value || typeof value !== 'object') return false;
 const a=value as Record<string,unknown>;
 return ['wallLeft','wallRight','floor'].every(key=>typeof a[key]==='string' && /^#[0-9a-fA-F]{6}$/.test(a[key] as string));
}
export function appearanceOf(value?: Appearance): Appearance { return validAppearance(value) ? value : defaultAppearance; }
