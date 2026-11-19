import type { Metadata } from "next";
import { PageHeading } from "@/components/ui/page-heading";
import { Shop } from "@/features/shop/shop";

export const metadata: Metadata = { title: "Магазин" };
export default function ShopPage() {
  return <><PageHeading eyebrow="Маленькие находки" title="Магазин" description="Собирайте избранное и покупайте вещи для своей комнаты за виртуальные монеты."/><Shop/></>;
}
