import { categories, type CatalogItem, type ItemKind } from '../config/demo';

export type WorkshopItem = CatalogItem & { description?: string; images?: string[]; collectionId?: string };
export type WorkshopCollection = { id: string; title: string; description: string };
const kinds: ItemKind[] = ['plant', 'lamp', 'shelf', 'armchair', 'sofa', 'sculpture', 'bed', 'desk', 'chair'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const integer = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

export function validWorkshopImage(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 670000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function parseWorkshop(raw: string): { version: 1; items: WorkshopItem[]; collections: WorkshopCollection[] } {
  const data: unknown = JSON.parse(raw);
  if (!record(data) || data.version !== 1 || !Array.isArray(data.items) || !Array.isArray(data.collections)) throw Error('INVALID_WORKSHOP');
  const ids = new Set<string>();
  for (const group of data.collections) {
    if (!record(group) || !text(group.id, 100) || ids.has(group.id) || !text(group.title, 100) || typeof group.description !== 'string' || group.description.length > 500) throw Error('INVALID_COLLECTION');
    ids.add(group.id);
  }
  const itemIds = new Set<string>();
  for (const item of data.items) {
    if (!record(item) || !text(item.id, 100) || itemIds.has(item.id) || !text(item.title, 100) || !categories.includes(String(item.category)) || !kinds.includes(item.illustration as ItemKind) || typeof item.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(item.color) || !integer(item.width, 1, 12) || !integer(item.depth, 1, 8) || !integer(item.price, 0, 1000000) || typeof item.purchasable !== 'boolean' || (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > 2000)) || (item.images !== undefined && (!Array.isArray(item.images) || item.images.length > 4 || !item.images.every(validWorkshopImage))) || (item.collectionId !== undefined && (typeof item.collectionId !== 'string' || !ids.has(item.collectionId)))) throw Error('INVALID_ITEM');
    itemIds.add(item.id);
  }
  return data as ReturnType<typeof parseWorkshop>;
}
