import type { Metadata } from 'next';
import LocalAccess from '@/components/LocalAccess';
import MyRoom from '@/components/MyRoom';
import { catalog } from '@/domain/model';

type Props = { params: Promise<{ productId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  const product = catalog.find(item => item.id === productId);
  return { title: `${product?.name ?? 'Магазин'} · tiny me` };
}

export default async function ProductPage({ params }: Props) {
  const { productId } = await params;
  return <LocalAccess><MyRoom initialView="shop" initialProductId={productId} /></LocalAccess>;
}
