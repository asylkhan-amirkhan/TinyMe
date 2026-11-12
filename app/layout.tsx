import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { EntryTransition } from "@/features/intro/entry-transition";
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/cormorant-garamond/index.css";
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
export const metadata: Metadata = {
  title: "tiny me — твоё тихое место",
  description:
    "Личная пиксельная комната, любимая музыка и немного времени для себя.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning style={{
      '--font-inter': '"Inter Variable", sans-serif',
      '--font-cormorant': '"Cormorant Garamond Variable", serif',
    } as CSSProperties}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: 'try{document.documentElement.dataset.theme=localStorage.getItem("tinyme:theme")==="light"?"light":"dark"}catch{document.documentElement.dataset.theme="dark"}' }} />
        <EntryTransition>{children}</EntryTransition>
      </body>
    </html>
  );
}
