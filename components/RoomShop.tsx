'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Coins, Heart, Maximize2, Plus, Search, X } from 'lucide-react';
import { games } from '@/domain/gaming-collection';
import { canPlaceOnTop, catalog, type Product } from '@/domain/model';
import { defaultShopFilters, matchesShopFilters, shopCardId, shopHref, type ShopFilters } from '@/domain/shop';
import { compatibleDecor, shopCollectionTitle, shopDescriptions } from '@/domain/shop-content';
import type { WorkshopProduct } from '@/domain/workshop-catalog';
import { characterDetails } from '@/engine/character-miniatures';
import { posterArt } from '@/engine/poster-assets';
import { useWorkshopProducts } from '@/lib/use-workshop-products';
import FurniturePreview from './FurniturePreview';
import Select from './Select';

const favoritesKey = 'myroom:shop-favorites:v1';
const sortOptions: { value: ShopFilters['sort']; label: string }[] = [
  { value: 'price', label: 'Сначала дешевле' },
  { value: 'price-desc', label: 'Сначала дороже' },
  { value: 'name', label: 'По названию' },
];
const normalize = (value: string) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
const descriptionOf = (product: WorkshopProduct) => product.description?.trim() || shopDescriptions[product.id] || posterArt[product.id]?.description || characterDetails[product.id];

type Props = {
  active: boolean;
  productId?: string;
  filters: ShopFilters;
  returnTarget?: string;
  balance: number;
  ownedCounts: ReadonlyMap<string, number>;
  busy: boolean;
  onNavigate: (id?: string) => void;
  onFiltersChange: (filters: ShopFilters) => void;
  onPurchase: (product: Product) => void;
  onInspect: (product: Product) => void;
  onNotice: (message: string) => void;
};

export default function RoomShop({ active, productId, filters, returnTarget, balance, ownedCounts, busy, onNavigate, onFiltersChange, onPurchase, onInspect, onNotice }: Props) {
  const workshop = useWorkshopProducts();
  const products = useMemo<WorkshopProduct[]>(() => [...catalog, ...workshop.products], [workshop.products]);
  const categoryOptions = useMemo(() => [
    { value: '', label: 'Все категории' }, { value: 'new', label: 'Новинки' }, { value: 'gaming', label: 'Игровая коллекция' },
    ...[...new Set(products.map(product => product.category))].map(value => ({ value, label: value })),
  ], [products]);
  const { search, game, sort, affordableOnly, favoritesOnly } = filters;
  const selectedCategory = categoryOptions.find(option => option.value === filters.category);
  const category = selectedCategory?.value ?? '';
  const [favorites, setFavorites] = useState<Set<string> | null>(null);

  useEffect(() => {
    const load = () => {
      let ids: unknown = [];
      try { ids = JSON.parse(localStorage.getItem(favoritesKey) ?? '[]'); } catch {}
      setFavorites(new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []));
    };
    const sync = (event: StorageEvent) => { if (event.key === favoritesKey || event.key === null) load(); };
    load();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const visibleProducts = useMemo(() => {
    const terms = normalize(search).split(/\s+/).filter(Boolean);
    const availableFilters = { ...filters, category };
    return products.filter(product => {
      if (!matchesShopFilters(product, availableFilters, balance, favorites)) return false;
      if (!terms.length) return true;
      const searchable = normalize([product.name, product.category, product.game, shopCollectionTitle(product), descriptionOf(product)].join(' '));
      return terms.every(term => searchable.includes(term));
    }).sort((a, b) => {
      const byName = a.name.localeCompare(b.name, 'ru');
      if (sort === 'name') return byName;
      return (sort === 'price-desc' ? b.price - a.price : a.price - b.price) || byName;
    });
  }, [balance, category, favorites, filters, products, search, sort]);

  const hasReturnCard = !!returnTarget && visibleProducts.some(product => shopCardId(product.id) === returnTarget);
  useEffect(() => {
    if (!active || productId !== undefined || !hasReturnCard || !returnTarget) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(returnTarget);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, hasReturnCard, productId, returnTarget]);

  function update(changes: Partial<ShopFilters>) {
    onFiltersChange({ ...filters, ...changes });
  }

  function toggleFavorite(id: string) {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      localStorage.setItem(favoritesKey, JSON.stringify([...next]));
      setFavorites(next);
    } catch {
      onNotice('Не удалось сохранить избранное на устройстве.');
    }
  }

  function favoriteButton(product: Product) {
    const selected = favorites?.has(product.id) ?? false;
    return <button type="button" className="favorite-toggle" aria-label={`Избранное: ${product.name}`} aria-pressed={selected}
      title={selected ? 'Убрать из избранного' : 'Добавить в избранное'} disabled={!favorites} onClick={() => toggleFavorite(product.id)}>
      <Heart size={18} strokeWidth={1.75} fill={selected ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>;
  }

  function purchaseButton(product: Product) {
    const shortage = product.price - balance;
    const label = ownedCounts.has(product.id) ? 'Купить ещё' : 'Купить';
    return <button type="button" className="button small primary" disabled={busy || shortage > 0}
      aria-label={shortage > 0 ? `${product.name}: не хватает ${shortage} монет` : `${label} ${product.name} за ${product.price} монет`}
      onClick={() => onPurchase(product)}>
      {shortage > 0 ? `Не хватает ${shortage}` : <>{label}<Plus size={16} strokeWidth={1.75} aria-hidden="true" /></>}
    </button>;
  }

  if (!active) return null;

  if (productId !== undefined) {
    const product = products.find(item => item.id === productId);
    return <section className="shop-detail" aria-labelledby="shop-product-title">
      {product && <Link href={`/catalog/${encodeURIComponent(product.id)}`} className="button secondary">Отзывы и обсуждение</Link>}
      <Link className="shop-back" href={shopHref(filters, undefined, productId)} prefetch={false} onNavigate={event => { event.preventDefault(); onNavigate(); }}>
        <ArrowLeft size={18} aria-hidden="true" />К каталогу
      </Link>
      {product ? <ProductDetails key={product.id} product={product} owned={ownedCounts.get(product.id) ?? 0}
        favorite={favoriteButton(product)} purchase={purchaseButton(product)} onInspect={onInspect} />
        : <div className="page-heading"><div>
          <h1 id="shop-product-title">{productId.startsWith('workshop:') && !workshop.loaded ? 'Открываем товар…' : 'Товар не найден'}</h1>
          {workshop.loaded && productId.startsWith('workshop:') && workshop.error ? <p role="alert">{workshop.error}</p> : null}
        </div></div>}
    </section>;
  }

  const favoriteCount = products.filter(product => favorites?.has(product.id)).length;
  const activeFilters: { key: keyof ShopFilters; label: string; clear: Partial<ShopFilters> }[] = [];
  if (search) activeFilters.push({ key: 'search', label: `Поиск «${search}»`, clear: { search: '' } });
  if (category) activeFilters.push({ key: 'category', label: selectedCategory!.label, clear: { category: '', game: '' } });
  if (category === 'gaming' && game) activeFilters.push({ key: 'game', label: game, clear: { game: '' } });
  if (favoritesOnly) activeFilters.push({ key: 'favoritesOnly', label: 'Избранное', clear: { favoritesOnly: false } });
  if (affordableOnly) activeFilters.push({ key: 'affordableOnly', label: 'Хватает монет', clear: { affordableOnly: false } });
  if (sort !== defaultShopFilters.sort) activeFilters.push({ key: 'sort', label: sortOptions.find(option => option.value === sort)!.label, clear: { sort: defaultShopFilters.sort } });
  return <section className="shop-showcase" aria-labelledby="shop-title">
    <div className="page-heading shop-heading">
      <Link href="/community" className="button secondary">Сообщество и подборки</Link>
      <div><h1 id="shop-title">Магазин</h1><p>Мебель, свет и декор для твоей комнаты.</p></div>
      <button type="button" className="shop-favorites-entry" aria-pressed={favoritesOnly}
        onClick={() => update({ favoritesOnly: !favoritesOnly })}>
        <Heart size={18} strokeWidth={1.75} fill={favoritesOnly ? 'currentColor' : 'none'} aria-hidden="true" />
        Избранное <span className="shop-favorites-count tabular-nums">{favoriteCount}</span>
      </button>
    </div>

    <section className="shop-toolbar" aria-label="Поиск и фильтры каталога">
      <div className="shop-search"><Search size={18} aria-hidden="true" />
        <input type="search" aria-label="Поиск товаров" placeholder="Поиск товаров" value={search} onChange={event => update({ search: event.target.value })} />
        {search && <button type="button" aria-label="Очистить поиск" onClick={() => update({ search: '' })}><X size={16} aria-hidden="true" /></button>}
      </div>
      <div className="shop-filters">
        <Select aria-label="Категория товаров" value={category} onValueChange={value => update({ category: value, game: '' })} options={categoryOptions} />
        {category === 'gaming' && <Select aria-label="Игра" value={game} onValueChange={value => update({ game: games.find(game => game === value) ?? '' })}
          options={[{ value: '', label: 'Все игры' }, ...games.map(value => ({ value, label: value }))]} />}
        <Select aria-label="Сортировка товаров" value={sort} onValueChange={value => update({ sort: sortOptions.find(option => option.value === value)?.value ?? defaultShopFilters.sort })} options={sortOptions} />
        <label className="shop-affordable"><input type="checkbox" checked={affordableOnly} onChange={event => update({ affordableOnly: event.target.checked })} />Хватает монет</label>
      </div>
    </section>

    <div className="shop-results-toolbar">
      <p className="search-count tabular-nums" role="status">Найдено: {visibleProducts.length}</p>
      {activeFilters.length > 0 && <div className="shop-active-filters" role="group" aria-label="Активные фильтры">
        {activeFilters.map(filter => <button key={filter.key} type="button" className="shop-filter-chip" aria-label={`Убрать: ${filter.label}`} onClick={() => update(filter.clear)}>
          <span>{filter.label}</span><X size={14} aria-hidden="true" />
        </button>)}
        <button type="button" className="shop-reset-filters" onClick={() => onFiltersChange(defaultShopFilters)}>Сбросить всё</button>
      </div>}
    </div>
    {workshop.error && <p role="alert">{workshop.error}</p>}
    {visibleProducts.length === 0 ? <div className="search-empty">
      <Search size={24} aria-hidden="true" />
      <h2>{favoritesOnly && !favoriteCount ? 'Избранное пока пусто' : 'Товары не найдены'}</h2>
    </div> : <div className="product-grid">
      {visibleProducts.map(product => <article className="product-card" key={product.id}>
        <div className="product-image">
          <div className="shop-card-preview" aria-hidden="true"><FurniturePreview product={product} /></div>
          {favoriteButton(product)}
          <span className="size-badge tabular-nums">{product.w} × {product.h}</span>
        </div>
        <small>{product.category}{product.collection === 'quiet-evening' ? ' · Тихий вечер' : ''}</small>
        <h2><Link id={shopCardId(product.id)} href={shopHref(filters, product.id)} prefetch={false}
          onNavigate={event => { event.preventDefault(); onNavigate(product.id); }}>
          {product.name}<ArrowRight size={16} aria-hidden="true" />
        </Link></h2>
        <small className="owned-count tabular-nums">У тебя: {ownedCounts.get(product.id) ?? 0}</small>
        <div className="product-bottom tabular-nums"><span><Coins size={16} aria-label="Монет" />{product.price}</span>{purchaseButton(product)}</div>
      </article>)}
    </div>}
  </section>;
}

function ProductDetails({ product, owned, favorite, purchase, onInspect }: {
  product: WorkshopProduct;
  owned: number;
  favorite: React.ReactNode;
  purchase: React.ReactNode;
  onInspect: (product: Product) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const image = product.images?.[imageIndex] ?? product.image;
  const poster = posterArt[product.id];
  const description = descriptionOf(product);
  const collection = shopCollectionTitle(product);
  const decor = compatibleDecor(product);
  const placement = product.surface === 'wall' ? 'На стене' : product.surface === 'rug' ? 'На полу, в том числе под мебелью' : canPlaceOnTop(product) ? 'На полу, столе, комоде или подходящей полке' : 'На полу';
  const decorLocation = product.kind === 'desk' ? 'На переднем краю столешницы' : product.kind === 'shelf' ? 'На полках и сверху' : 'На верхней поверхности';

  return <div className="shop-detail-layout">
    <div className="shop-detail-gallery">
      <div className="shop-detail-art">
        <FurniturePreview product={image === product.image ? product : { ...product, image }} />
        {favorite}
      </div>
      {product.images && product.images.length > 1 && <div className="shop-gallery-thumbs" role="group" aria-label="Изображения товара">
        {product.images.map((image, index) => <button type="button" key={index} aria-label={`Фото ${index + 1}`} aria-pressed={imageIndex === index} onClick={() => setImageIndex(index)}>
          <div aria-hidden="true"><FurniturePreview product={{ ...product, image }} /></div>
        </button>)}
      </div>}
      {(poster || product.kind === 'collectible') && <button type="button" className="button secondary" aria-haspopup="dialog" onClick={() => onInspect(product)}>
        <Maximize2 size={16} aria-hidden="true" />Рассмотреть ближе
      </button>}
    </div>
    <div className="shop-detail-info">
      <div className="page-heading"><div><p className="shop-detail-category">{product.category}</p><h1 id="shop-product-title">{product.name}</h1></div></div>
      {description && <p className="shop-detail-description">{description}</p>}
      <dl className="shop-details-specs">
        <div><dt>Размер</dt><dd>{product.w} × {product.h} кл.</dd></div>
        <div><dt>Размещение</dt><dd>{placement}</dd></div>
        {decor && <div><dt>{decorLocation}</dt><dd>{decor}{product.kind === 'shelf' && <small>Высокий декор можно ставить на верх стеллажа.</small>}</dd></div>}
        {collection && <div><dt>Коллекция</dt><dd>{collection}</dd></div>}
        {product.game && <div><dt>Игра</dt><dd>{product.game}</dd></div>}
        <div><dt>У тебя</dt><dd>{owned} шт.</dd></div>
      </dl>
      <div className="shop-detail-purchase tabular-nums"><span><Coins size={20} aria-hidden="true" />{product.price} мон.</span>{purchase}</div>
    </div>
  </div>;
}
