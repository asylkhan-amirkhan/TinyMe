import type { CatalogItem } from "@/config/demo";

export type Product = CatalogItem;
export type CartLine = { product_id: string; quantity: number };
export type OwnedItem = { id: string; product: Product };
export const illustrations = ["plant", "lamp", "shelf", "armchair", "sofa", "sculpture", "bed", "desk", "chair"] as const;
