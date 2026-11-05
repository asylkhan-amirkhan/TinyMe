import type { Metadata } from "next";
import { createElement, type ReactNode } from "react";
import { EntryTransition } from "@/features/intro/entry-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TinyMe — Дворец разума", template: "%s · TinyMe" },
  description: "Твоё маленькое пространство внутри большого мира.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return createElement(
    "html",
    { lang: "ru" },
    createElement(
      "body",
      null,
      createElement(EntryTransition, null, children),
    ),
  );
}
