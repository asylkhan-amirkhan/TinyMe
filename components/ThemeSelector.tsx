"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";
const key = "tinyme:theme";
const eventName = "tinyme:theme-change";
function snapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
function subscribe(listener: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== key) return;
    document.documentElement.dataset.theme = event.newValue === "light" ? "light" : "dark";
    listener();
  };
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", sync);
  };
}
function choose(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(key, theme); } catch { /* Theme still works for this visit. */ }
  window.dispatchEvent(new Event(eventName));
}

export default function ThemeSelector() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "dark" as const);
  return <section className="settings-card theme-settings">
    <Sun size={16} aria-hidden="true" />
    <h2>Оформление</h2>
    <p>Выбери светлую или тёмную тему. Выбор сохраняется на этом устройстве.</p>
    <fieldset className="theme-options">
      <legend className="theme-legend">Цветовая тема</legend>
      {(["dark", "light"] as const).map(value => <label key={value} className="theme-option" data-selected={theme === value}>
        <input type="radio" name="tinyme-theme" value={value} checked={theme === value} onChange={() => choose(value)} />
        {value === "dark" ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
        <span>{value === "dark" ? "Тёмная" : "Светлая"}</span>
      </label>)}
    </fieldset>
  </section>;
}
