import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalog } from '../domain/model';
import { compatibleDecor, shopDescriptions } from '../domain/shop-content';
import { defaultShopFilters, matchesShopFilters, readShopFilters, shopCardId, shopCardTarget, shopHref, shopProductId, type ShopFilters } from '../domain/shop';

test('product and return links retain the filters and identify the same catalog card', () => {
  const filters: ShopFilters = {
    search: 'лампа & стол', category: 'gaming', game: 'Elden Ring', sort: 'price-desc', affordableOnly: true, favoritesOnly: true,
  };
  const id = 'workshop:лампа #1';
  const product = new URL(shopHref(filters, id), 'https://example.test');
  const back = new URL(shopHref(filters, undefined, id), 'https://example.test');
  assert.equal(shopProductId(product.pathname), id);
  assert.equal(shopCardTarget(back.hash), shopCardId(id));
  assert.deepEqual(readShopFilters(product.searchParams), filters);
  assert.deepEqual(readShopFilters(back.searchParams), filters);
  assert.equal(shopHref(defaultShopFilters), '/shop');
});

test('a URL only enables a game within its collection and falls back for invalid sort values', () => {
  const filters = readShopFilters(new URLSearchParams('category=Свет&game=CS2&sort=other&favorites=0'));
  assert.deepEqual(filters, { ...defaultShopFilters, category: 'Свет' });
  assert.equal(shopCardTarget('#%zz'), undefined);
  assert.equal(shopCardTarget('#other'), undefined);
});

test('favorites narrow the chosen category and still respect the current balance', () => {
  const chosen = new Set(['lamp-honey', 'lamp-table', 'chair-sage']);
  const filters = { ...defaultShopFilters, category: 'Свет', favoritesOnly: true, affordableOnly: true };
  const filter = (balance: number) => catalog.filter(product => matchesShopFilters(product, filters, balance, chosen)).map(product => product.id);
  assert.deepEqual(filter(21), ['lamp-honey']);
  assert.deepEqual(filter(22), ['lamp-honey', 'lamp-table']);
});

test('ordinary catalog products have descriptions and furniture lists only supported decor', () => {
  assert.ok(catalog.filter(product => !product.game).every(product => shopDescriptions[product.id]));
  assert.match(compatibleDecor(catalog.find(product => product.id === 'desk-oak')!) ?? '', /фигурки/);
  assert.equal(compatibleDecor(catalog.find(product => product.id === 'bed-cloud')!), undefined);
});
