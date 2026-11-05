import { test } from "node:test";
import assert from "node:assert/strict";
import { project, unproject, showcaseItems } from "../engine/isometric";
import { placementError } from "../domain/model";

test("isometric pointer coordinates map back to every floor cell", () => {
  for (let x = 0; x < 24; x++)
    for (let y = 0; y < 16; y++) {
      const [a, b] = unproject(...project(x + 0.5, y + 0.5));
      assert.equal(Math.floor(a), x);
      assert.equal(Math.floor(b), y);
    }
});
test("showcase uses valid furniture placements without collisions", () => {
  for (const item of showcaseItems)
    assert.equal(
      placementError(showcaseItems, item, item.x!, item.y!, item.rotation),
      null,
      item.productId,
    );
});
