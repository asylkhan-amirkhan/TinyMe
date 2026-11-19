import type { Metadata } from "next";
import LocalAccess from "@/components/LocalAccess";
import MyRoom from "@/components/MyRoom";

export const metadata: Metadata = { title: "Магазин · tiny me" };

export default function ShopPage() {
  return <LocalAccess><MyRoom initialView="shop" /></LocalAccess>;
}
