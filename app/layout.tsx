import type { Metadata } from "next";
import { EntryTransition } from "@/features/intro/entry-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TinyMe — Дворец разума", template: "%s · TinyMe" },
  description: "Твоё маленькое пространство внутри большого мира.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body><EntryTransition>{children}</EntryTransition></body></html>;
}
