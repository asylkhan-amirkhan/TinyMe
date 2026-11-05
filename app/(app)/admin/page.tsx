import type { Metadata } from "next";
import { AdminPanel } from "@/features/admin/admin-panel";

export const metadata: Metadata = { title: "Админ-панель" };

export default function AdminPage() {
  return <AdminPanel />;
}
