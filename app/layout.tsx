import type { Metadata } from "next";
import { createElement, type ReactNode } from "react";
import { EntryTransition } from "@/features/intro/entry-transition";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import "./studio.css";
import "./cozy.css";
import "./motion.css";
import "./notifications.css";
import "./statistics.css";
import "./refinements.css";
import "./select.css";
import "./inspector.css";
import "./account.css";
import "./welcome.css";
import "./design-tokens.css";
import "./polish.css";
import "./redesign.css";
import "./panel-layout.css";
import "./music-shelf.css";
import "./statistics-poster.css";
import "./landing-hero.css";
import "./room-details.css";
import "./settings-studio.css";
import "./evening-studio.css";
import "./sunset.css";
import "./themes.css";
const inter = Inter({subsets:["latin","cyrillic"],variable:"--font-inter",display:"swap"});
const cormorant = Cormorant_Garamond({subsets:["latin","cyrillic"],weight:["400","500","600"],variable:"--font-cormorant",display:"swap"});
export const metadata: Metadata = {
  title: "tiny me — твоё тихое место",
  description:
    "Личная пиксельная комната, любимая музыка и немного времени для себя.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: 'try{document.documentElement.dataset.theme=localStorage.getItem("tinyme:theme")==="light"?"light":"dark"}catch{document.documentElement.dataset.theme="dark"}' }} />
        <EntryTransition>{children}</EntryTransition>
      </body>
    </html>
  );
}
