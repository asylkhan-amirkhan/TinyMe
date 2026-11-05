import type { Product } from './model';
export function validFurnitureColor(value: unknown): value is string | null {
 return value === null || (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value));
}
/** Tint only the main material; hardware, screens and foliage keep their colors. */
export function materialColor(custom: string | null | undefined, original: string, offset = 0): string {
 if (!custom || !validFurnitureColor(custom)) return original;
 const channels=custom.slice(1).match(/../g)!.map(v=>Math.max(0,Math.min(255,parseInt(v,16)+offset)).toString(16).padStart(2,'0'));
 return '#'+channels.join('');
}
export function furnitureBaseColor(product: Product): string {
 if(product.collection==='quiet-evening') return product.color;
 const defaults: Partial<Record<Product['kind'],string>>={desk:'#66506b',shelf:'#66506b',record:'#66506b',bed:'#9873b3',plant:'#5d4168',lamp:'#f3cca3',rug:'#625a7a'};
 return defaults[product.kind] ?? product.color;
}
export const furnitureSwatches=[['Лён','#d6c5ad'],['Шалфей','#80947b'],['Терракота','#b9745d'],['Лаванда','#9b88b7'],['Океан','#567f99'],['Графит','#45434f']] as const;
