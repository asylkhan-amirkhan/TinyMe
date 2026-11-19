-- Additive schema for the existing MyRoom database. Apply as one migration after
-- checking the hosted schema. No room, inventory, wallet or music data is removed.
begin;
alter table public.catalog_items
  add column if not exists description text not null default '',
  add column if not exists category text not null default 'Мебель',
  add column if not exists kind text not null default 'chair',
  add column if not exists color text not null default '#a68b78',
  add column if not exists image text,
  add column if not exists archived boolean not null default false;
alter table public.catalog_items add constraint community_product_text check(length(name) between 1 and 100 and length(description)<=2000 and length(category) between 1 and 60);
alter table public.catalog_items add constraint community_product_art check(color ~ '^#[0-9a-fA-F]{6}$' and (image is null or (length(image)<=670000 and image ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$')));
create index catalog_category_price on public.catalog_items(category,price) where not archived;
create policy community_catalog_read on public.catalog_items for select to anon,authenticated using(not archived or (select auth.jwt()->'app_metadata'->>'role')='admin');
create policy community_catalog_insert on public.catalog_items for insert to authenticated with check((select auth.jwt()->'app_metadata'->>'role')='admin');
create policy community_catalog_update on public.catalog_items for update to authenticated using((select auth.jwt()->'app_metadata'->>'role')='admin') with check((select auth.jwt()->'app_metadata'->>'role')='admin');
grant select on public.catalog_items to anon;
grant insert,update on public.catalog_items to authenticated;

create table public.community_profiles(
  user_id uuid primary key references auth.users on delete cascade,
  name text not null check(length(trim(name)) between 2 and 50),
  bio text not null default '' check(length(bio)<=500),is_public boolean not null default false
);
create table public.product_reviews(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
  product_id text not null references public.catalog_items,
  rating integer not null check(rating between 1 and 5),body text not null check(length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),unique(user_id,product_id)
);
create index product_reviews_product on public.product_reviews(product_id,created_at);
create table public.review_comments(
  id uuid primary key default gen_random_uuid(),review_id uuid not null references public.product_reviews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,body text not null check(length(trim(body)) between 1 and 1000),created_at timestamptz not null default now()
);
create index review_comments_review on public.review_comments(review_id,created_at);
create index review_comments_user on public.review_comments(user_id);
create table public.review_likes(review_id uuid not null references public.product_reviews on delete cascade,user_id uuid not null references auth.users on delete cascade,primary key(review_id,user_id));
create index review_likes_user on public.review_likes(user_id);
create table public.shopping_cart(user_id uuid not null references auth.users on delete cascade,product_id text not null references public.catalog_items,quantity integer not null check(quantity between 1 and 99),primary key(user_id,product_id));
create index shopping_cart_product on public.shopping_cart(product_id);
create table public.product_favorites(user_id uuid not null references auth.users on delete cascade,product_id text not null references public.catalog_items,primary key(user_id,product_id));
create index product_favorites_product on public.product_favorites(product_id);
create table public.product_selections(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,title text not null check(length(trim(title)) between 1 and 100),description text not null default '' check(length(description)<=1000),is_public boolean not null default false);
create index product_selections_user on public.product_selections(user_id);
create table public.selection_products(selection_id uuid not null references public.product_selections on delete cascade,product_id text not null references public.catalog_items,primary key(selection_id,product_id));
create index selection_products_product on public.selection_products(product_id);

alter table public.community_profiles enable row level security;
alter table public.product_reviews enable row level security;
alter table public.review_comments enable row level security;
alter table public.review_likes enable row level security;
alter table public.shopping_cart enable row level security;
alter table public.product_favorites enable row level security;
alter table public.product_selections enable row level security;
alter table public.selection_products enable row level security;
create policy profile_read on public.community_profiles for select to anon,authenticated using(is_public or user_id=(select auth.uid()));
create policy profile_insert on public.community_profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy profile_update on public.community_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy reviews_read on public.product_reviews for select to anon,authenticated using(true);
create policy reviews_insert on public.product_reviews for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.catalog_items p where p.id=product_id and not p.archived));
create policy reviews_update on public.product_reviews for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy reviews_delete on public.product_reviews for delete to authenticated using(user_id=(select auth.uid()));
create policy comments_read on public.review_comments for select to anon,authenticated using(true);
create policy comments_insert on public.review_comments for insert to authenticated with check(user_id=(select auth.uid()));
create policy comments_delete on public.review_comments for delete to authenticated using(user_id=(select auth.uid()));
create policy likes_read on public.review_likes for select to anon,authenticated using(true);
create policy likes_insert on public.review_likes for insert to authenticated with check(user_id=(select auth.uid()));
create policy likes_delete on public.review_likes for delete to authenticated using(user_id=(select auth.uid()));
create policy cart_read on public.shopping_cart for select to authenticated using(user_id=(select auth.uid()));
create policy cart_insert on public.shopping_cart for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.catalog_items p where p.id=product_id and not p.archived));
create policy cart_update on public.shopping_cart for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.catalog_items p where p.id=product_id and not p.archived));
create policy cart_delete on public.shopping_cart for delete to authenticated using(user_id=(select auth.uid()));
create policy favorites_read on public.product_favorites for select to authenticated using(user_id=(select auth.uid()));
create policy favorites_insert on public.product_favorites for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.catalog_items p where p.id=product_id and not p.archived));
create policy favorites_delete on public.product_favorites for delete to authenticated using(user_id=(select auth.uid()));
create policy selections_read on public.product_selections for select to anon,authenticated using(is_public or user_id=(select auth.uid()));
create policy selections_insert on public.product_selections for insert to authenticated with check(user_id=(select auth.uid()));
create policy selections_update on public.product_selections for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy selections_delete on public.product_selections for delete to authenticated using(user_id=(select auth.uid()));
create policy selection_products_read on public.selection_products for select to anon,authenticated using(exists(select 1 from public.product_selections s where s.id=selection_id and (s.is_public or s.user_id=(select auth.uid()))));
create policy selection_products_insert on public.selection_products for insert to authenticated with check(exists(select 1 from public.product_selections s where s.id=selection_id and s.user_id=(select auth.uid())) and exists(select 1 from public.catalog_items p where p.id=product_id and not p.archived));
create policy selection_products_delete on public.selection_products for delete to authenticated using(exists(select 1 from public.product_selections s where s.id=selection_id and s.user_id=(select auth.uid())));

grant select on public.community_profiles,public.product_reviews,public.review_comments,public.review_likes,public.product_selections,public.selection_products to anon,authenticated;
grant insert,update on public.community_profiles to authenticated;
grant insert,update,delete on public.product_reviews to authenticated;
grant insert,delete on public.review_comments,public.review_likes,public.product_favorites,public.selection_products to authenticated;
grant select,insert,update,delete on public.shopping_cart,public.product_selections to authenticated;
grant select on public.product_favorites to authenticated;

-- A single invoker transaction keeps selection metadata and its products together.
create function public.save_product_selection(p_id uuid,p_title text,p_description text,p_public boolean,p_products text[])
returns void language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED';end if;
  if coalesce(cardinality(p_products),0)>100 then raise exception 'SELECTION_LIMIT';end if;
  insert into public.product_selections(id,user_id,title,description,is_public) values(p_id,auth.uid(),p_title,p_description,p_public)
  on conflict(id) do update set title=excluded.title,description=excluded.description,is_public=excluded.is_public;
  delete from public.selection_products where selection_id=p_id;
  insert into public.selection_products(selection_id,product_id) select p_id,unnest(p_products) on conflict do nothing;
end;$$;
revoke all on function public.save_product_selection(uuid,text,text,boolean,text[]) from public,anon;
grant execute on function public.save_product_selection(uuid,text,text,boolean,text[]) to authenticated;
commit;
