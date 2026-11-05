import type { ReactNode } from "react";
const paths: Record<string, ReactNode> = {
  settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/></>,
  music: <><path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/></>,
  room: <><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></>,
  shop: <><path d="M3 9h18l-2-5H5Z"/><path d="M4 9v11h16V9M9 20v-7h6v7"/></>,
  box: <><path d="m3 7 9-4 9 4-9 4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10M7 5l10 4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  edit: <path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>,
  grid: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>,
  leaf: <><path d="M19 3C7 2 2 8 6 15c7 5 14 0 13-12Z"/><path d="m4 21 10-11"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
};
export function Icon({ name, className = "size-5" }: { name: string; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}
export function Coin({ className = "size-5" }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className={className} shapeRendering="crispEdges"><path fill="#9c6b26" d="M5 1h10v2h3v3h1v8h-2v3h-3v2H5v-2H2v-3H1V6h2V3h2Z"/><path fill="#e8bc5b" d="M6 3h8v2h2v10h-3v2H6v-2H4V6h2Z"/><path fill="#ffe4a0" d="M6 5h3v3H6Z"/><path fill="#b88838" d="M10 6h2v8h-2Z"/></svg>;
}
