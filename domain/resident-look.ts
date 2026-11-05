export const haircuts = [
  { id: 'swept', name: 'Набок' }, { id: 'crop', name: 'Короткая' },
  { id: 'waves', name: 'Волны' }, { id: 'bob', name: 'Каре' }, { id: 'bun', name: 'Пучок' },
] as const;
export const outfits = [
  { id: 'hoodie', name: 'Худи' }, { id: 'knit', name: 'Свитер' },
  { id: 'jacket', name: 'Куртка' }, { id: 'tee', name: 'Футболка' },
] as const;
export type ResidentLook = {
  hair: typeof haircuts[number]['id']; outfit: typeof outfits[number]['id'];
  skin: string; hairColor: string; topColor: string; pantsColor: string; shoeColor: string;
  headphones: boolean; glasses: boolean;
};
export const defaultResidentLook: ResidentLook = {
  hair: 'swept', outfit: 'hoodie', skin: '#dfb18e', hairColor: '#493b39',
  topColor: '#d7c5af', pantsColor: '#677c79', shoeColor: '#e8e0d3', headphones: true, glasses: false,
};
export const lookPalettes = {
  skin: [['Фарфор','#f2d4bd'],['Персик','#dfb18e'],['Мёд','#c89266'],['Карамель','#a77350'],['Каштан','#82583e'],['Эбен','#51392e']],
  hairColor: [['Тёмный шоколад','#302c31'],['Каштан','#493b39'],['Медный','#ac6648'],['Песочный','#c0a178'],['Серебристый','#bdc2c7'],['Сливовый','#75617e']],
  topColor: [['Овсяный','#d7c5af'],['Лавандовый','#ac97bf'],['Шалфей','#8b9d85'],['Терракота','#ba7866'],['Джинсовый','#718ba8'],['Чернильный','#414b65'],['Розовый','#c99da6'],['Графит','#4d4d56']],
  pantsColor: [['Шалфей','#677c79'],['Синий деним','#596e8d'],['Песочный','#a68b70'],['Графит','#4d4d56'],['Тёмный','#303541'],['Светлый','#c4bcae']],
  shoeColor: [['Молочный','#e8e0d3'],['Песочный','#b99c7b'],['Графит','#4d4d56'],['Лавандовый','#a697b9']],
} as const;
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
/** Treat saved preferences as untrusted input; old or partial saves always remain drawable. */
export function residentLookOf(value: unknown): ResidentLook {
  const v = value && typeof value === 'object' ? value as Partial<ResidentLook> : {};
  const d = defaultResidentLook;
  return {
    hair: haircuts.some(h => h.id === v.hair) ? v.hair! : d.hair,
    outfit: outfits.some(o => o.id === v.outfit) ? v.outfit! : d.outfit,
    skin: color(v.skin, d.skin), hairColor: color(v.hairColor, d.hairColor), topColor: color(v.topColor, d.topColor),
    pantsColor: color(v.pantsColor, d.pantsColor), shoeColor: color(v.shoeColor, d.shoeColor),
    headphones: typeof v.headphones === 'boolean' ? v.headphones : d.headphones,
    glasses: typeof v.glasses === 'boolean' ? v.glasses : d.glasses,
  };
}
export const residentLookKey = (scope: string) => `myroom:resident-look:v1:${scope}`;
export function readResidentLook(storage: Pick<Storage,'getItem'>, scope: string): ResidentLook {
  try { return residentLookOf(JSON.parse(storage.getItem(residentLookKey(scope)) ?? 'null')); }
  catch { return { ...defaultResidentLook }; }
}
export function writeResidentLook(storage: Pick<Storage,'setItem'>, scope: string, look: ResidentLook): boolean {
  try { storage.setItem(residentLookKey(scope), JSON.stringify(residentLookOf(look))); return true; }
  catch { return false; }
}
