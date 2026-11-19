-- Additive migration: existing application tables are not changed.
begin;

create table public.tinyme_products (
  id text primary key check (id ~ '^[a-z0-9-]{1,64}$'),
  title text not null check (length(btrim(title)) between 1 and 100),
  category text not null check (category in ('Мебель', 'Растения', 'Освещение', 'Декор')),
  width integer not null check (width between 1 and 12),
  depth integer not null check (depth between 1 and 8),
  price integer not null check (price between 0 and 1000000),
  purchasable boolean not null default true,
  illustration text not null check (illustration in ('plant','lamp','shelf','armchair','sofa','sculpture','bed','desk','chair')),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$')
);
create table public.tinyme_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.tinyme_cart (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.tinyme_products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  primary key (user_id, product_id)
);
create table public.tinyme_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.tinyme_products(id) on delete cascade,
  primary key (user_id, product_id)
);
create table public.tinyme_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance between 0 and 1000000000)
);
create table public.tinyme_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Snapshot keeps purchased items intact after product edits/deletion.
  product jsonb not null,
  created_at timestamptz not null default now()
);
create index tinyme_inventory_user on public.tinyme_inventory(user_id);
create index tinyme_cart_product on public.tinyme_cart(product_id);
create index tinyme_favorites_product on public.tinyme_favorites(product_id);

alter table public.tinyme_products enable row level security;
alter table public.tinyme_admins enable row level security;
alter table public.tinyme_cart enable row level security;
alter table public.tinyme_favorites enable row level security;
alter table public.tinyme_wallets enable row level security;
alter table public.tinyme_inventory enable row level security;

create policy products_read on public.tinyme_products for select to anon, authenticated using (true);
create policy admins_self on public.tinyme_admins for select to authenticated using (user_id = (select auth.uid()));
create policy products_admin on public.tinyme_products for all to authenticated
  using (exists (select 1 from public.tinyme_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.tinyme_admins where user_id = (select auth.uid())));
create policy cart_owner on public.tinyme_cart for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.tinyme_products where id = product_id and purchasable));
create policy favorites_owner on public.tinyme_favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy wallets_read on public.tinyme_wallets for select to authenticated using (user_id = (select auth.uid()));
create policy inventory_read on public.tinyme_inventory for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.tinyme_products, public.tinyme_admins, public.tinyme_cart,
  public.tinyme_favorites, public.tinyme_wallets, public.tinyme_inventory from anon, authenticated;
grant select on public.tinyme_products to anon, authenticated;
grant insert, update, delete on public.tinyme_products to authenticated;
grant select on public.tinyme_admins, public.tinyme_wallets, public.tinyme_inventory to authenticated;
grant select, insert, update, delete on public.tinyme_cart, public.tinyme_favorites to authenticated;

-- Serialize cart writes with checkout, including requests from another tab.
create function public.tinyme_cart_lock() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  end if;
  return null;
end;
$$;
create trigger tinyme_cart_lock before insert or update or delete on public.tinyme_cart
  for each statement execute function public.tinyme_cart_lock();
revoke all on function public.tinyme_cart_lock() from public;

create function public.tinyme_checkout(expected_total bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  cost bigint;
  coins integer;
  row_count integer;
begin
  if owner is null then raise exception 'Войдите в аккаунт'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text, 0));
  insert into public.tinyme_wallets(user_id) values (owner) on conflict do nothing;
  select balance into coins from public.tinyme_wallets where user_id = owner for update;
  -- Product prices and availability cannot change during this transaction.
  perform p.id from public.tinyme_products p join public.tinyme_cart c on c.product_id = p.id
    where c.user_id = owner order by p.id for share of p;
  select count(*), sum(c.quantity::bigint * p.price) into row_count, cost
    from public.tinyme_cart c join public.tinyme_products p on p.id = c.product_id where c.user_id = owner;
  if row_count = 0 then raise exception 'Корзина пуста'; end if;
  if exists (select 1 from public.tinyme_cart c join public.tinyme_products p on p.id = c.product_id
    where c.user_id = owner and not p.purchasable) then raise exception 'Один из товаров снят с продажи. Удалите его из корзины'; end if;
  if expected_total is null or cost <> expected_total then raise exception 'Цена изменилась. Обновите корзину'; end if;
  if coins < cost then raise exception 'Недостаточно монет'; end if;
  update public.tinyme_wallets set balance = balance - cost::integer where user_id = owner;
  insert into public.tinyme_inventory(user_id, product)
    select owner, to_jsonb(p) from public.tinyme_cart c join public.tinyme_products p on p.id = c.product_id
    cross join lateral generate_series(1, c.quantity) as copies where c.user_id = owner;
  delete from public.tinyme_cart where user_id = owner;
end;
$$;
revoke all on function public.tinyme_checkout(bigint) from public, anon;
grant execute on function public.tinyme_checkout(bigint) to authenticated;

insert into public.tinyme_products (id,title,category,width,depth,price,purchasable,illustration,color) values
('plant-small','Растение','Растения',1,1,5,true,'plant','#edf1e6'),
('lamp-floor','Торшер','Освещение',1,1,10,true,'lamp','#f6efdf'),
('shelf-low','Низкий стеллаж','Мебель',2,1,20,true,'shelf','#eee9e2'),
('armchair','Кресло','Мебель',2,2,30,true,'armchair','#e9ede5'),
('sofa','Диван','Мебель',3,2,60,true,'sofa','#ece9f0'),
('sculpture','Декоративная фигурка','Декор',1,1,15,true,'sculpture','#f3e9e2');
commit;
