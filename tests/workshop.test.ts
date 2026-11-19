import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../config/demo';
import { parseWorkshop } from '../domain/workshop';

test('workshop preserves image, description and collection membership across serialization', () => {
  const saved = { version: 1, items: [{ ...catalog[0], description: 'Plant', images: ['data:image/png;base64,YWJj'], collectionId: 'group' }], collections: [{ id: 'group', title: 'Plants', description: '' }] };
  assert.deepEqual(parseWorkshop(JSON.stringify(saved)), saved);
  assert.equal(parseWorkshop(JSON.stringify({ version: 1, items: catalog, collections: [] })).items.length, catalog.length);
});

test('workshop rejects malformed fields that previously reached the editor and image renderer', () => {
  const input = (item: object) => JSON.stringify({ version: 1, items: [{ ...catalog[0], ...item }], collections: [] });
  for (const invalid of [{ images: 'bad' }, { images: [null] }, { images: ['https://example.com/image'] }, { images: ['data:image/svg+xml;base64,YWJj'] }, { width: -1 }, { depth: 1.5 }, { price: null }, { color: 'bad' }, { purchasable: 'yes' }, { description: {} }, { collectionId: 'missing' }, { category: null }]) {
    assert.throws(() => parseWorkshop(input(invalid)));
  }
  assert.throws(() => parseWorkshop('{'));
  assert.throws(() => parseWorkshop(JSON.stringify({ version: 1, items: [catalog[0], catalog[0]], collections: [] })));
  assert.throws(() => parseWorkshop(JSON.stringify({ version: 1, items: [], collections: [{ id: 'group', title: 'Plants' }] })));
});
