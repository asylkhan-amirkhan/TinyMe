import type { Metadata } from "next";
import { PageHeading } from "@/components/ui/page-heading";
import { Inventory } from "@/features/shop/inventory";

export const metadata: Metadata = { title: "Инвентарь" };
export default function InventoryPage() {
  return <><PageHeading eyebrow="Бережно собрано" title="Инвентарь" description="Стартовые предметы и покупки из магазина."/><Inventory/></>;
}
