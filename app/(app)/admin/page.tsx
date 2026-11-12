import type { Metadata } from "next";
import { AdminAccess } from "@/features/admin/admin-access";

export const metadata: Metadata = { title: "Админ-панель" };

export default function AdminPage() {
  return <AdminAccess />;
}
