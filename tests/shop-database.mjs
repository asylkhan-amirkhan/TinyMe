import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Real PostgreSQL engine in memory; Supabase's Auth schema is stubbed only here.
const db = new PGlite();
const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
const admin = "00000000-0000-4000-8000-000000000003";
async function role(name, id = "") {
  await db.exec(`reset role; set role ${name};`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
}
async function scalar(sql) { return Object.values((await db.query(sql)).rows[0])[0]; }
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${alice}'), ('${bob}'), ('${admin}');
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/202611180001_shop.sql", import.meta.url), "utf8"));
  await db.exec(`insert into tinyme_admins values ('${admin}'); insert into tinyme_wallets values ('${alice}', 100);`);
  await role("anon");
  assert.equal(await scalar("select count(*)::int from tinyme_products"), 6);
  await assert.rejects(db.exec("insert into tinyme_favorites values ('" + alice + "', 'plant-small')"));
  await assert.rejects(db.exec("select tinyme_checkout(0)"));

  await role("authenticated", alice);
  await assert.rejects(db.exec("update tinyme_wallets set balance = 999"));
  await assert.rejects(db.exec(`insert into tinyme_admins values ('${alice}')`));
  await assert.rejects(db.exec(`insert into tinyme_cart values ('${bob}', 'plant-small', 1)`));
  await assert.rejects(db.exec(`insert into tinyme_cart values ('${alice}', 'plant-small', 100)`));
  await db.exec(`insert into tinyme_favorites values ('${alice}', 'plant-small'); insert into tinyme_cart values ('${alice}', 'plant-small', 2);`);
  await db.exec("update tinyme_products set price = 0 where id = 'plant-small'");
  assert.equal(await scalar("select price from tinyme_products where id = 'plant-small'"), 5);
  await assert.rejects(db.exec("select tinyme_checkout(1)"), /Цена изменилась/);
  assert.equal(await scalar("select balance from tinyme_wallets"), 100);
  assert.equal(await scalar("select count(*)::int from tinyme_cart"), 1);

  await role("authenticated", bob);
  for (const table of ["tinyme_cart", "tinyme_favorites", "tinyme_wallets", "tinyme_inventory", "tinyme_admins"])
    assert.equal(await scalar(`select count(*)::int from ${table}`), 0, `${table}: no cross-user access`);
  await db.exec(`insert into tinyme_cart values ('${bob}', 'plant-small', 1)`);
  await assert.rejects(db.exec("select tinyme_checkout(5)"), /Недостаточно монет/);
  assert.equal(await scalar("select count(*)::int from tinyme_cart"), 1);
  assert.equal(await scalar("select count(*)::int from tinyme_inventory"), 0);

  await role("authenticated", alice);
  await db.exec("select tinyme_checkout(10)");
  assert.equal(await scalar("select balance from tinyme_wallets"), 90);
  assert.equal(await scalar("select count(*)::int from tinyme_inventory"), 2);
  assert.equal(await scalar("select count(*)::int from tinyme_cart"), 0);
  await assert.rejects(db.exec("select tinyme_checkout(10)"), /Корзина пуста/);
  assert.equal(await scalar("select balance from tinyme_wallets"), 90);

  await role("authenticated", admin);
  await db.exec("insert into tinyme_products values ('test', 'Тест', 'Декор', 1, 1, 7, true, 'plant', '#ffffff')");
  await db.exec("update tinyme_products set title = 'Изменён' where id = 'test'");
  assert.equal(await scalar("select title from tinyme_products where id = 'test'"), "Изменён");
  await db.exec("update tinyme_products set purchasable = false where id = 'plant-small'");
  await role("authenticated", bob);
  await assert.rejects(db.exec("select tinyme_checkout(5)"), /снят с продажи/);
  await db.exec("delete from tinyme_cart where product_id = 'plant-small'");
  await role("authenticated", admin);
  await db.exec("delete from tinyme_products where id in ('test', 'plant-small')");
  await role("authenticated", alice);
  assert.equal(await scalar("select count(*)::int from tinyme_favorites"), 0);
  assert.equal(await scalar("select count(*)::int from tinyme_inventory"), 2);
  assert.equal(await scalar("select product->>'title' from tinyme_inventory limit 1"), "Растение");
  console.log("PASS: migration, CRUD, RLS, validation, checkout, rollback, repeated purchase, inventory snapshots");
} finally { await db.close(); }
