import type { Metadata } from "next";
import { AdminPanel } from "@/features/admin/admin-panel";
import LocalAccess from '@/components/LocalAccess';

export const metadata: Metadata = { title: "Админ-панель" };

export default function AdminPage() {
  return <LocalAccess admin><AdminPanel /></LocalAccess>;
}
