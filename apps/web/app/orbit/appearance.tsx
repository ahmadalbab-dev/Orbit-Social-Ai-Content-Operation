"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "./design-ui";
const key = "orbit-appearance-v1";
type Appearance = {
  theme: "light" | "dark";
  motion: boolean;
  reduced: boolean;
};
function read(): Appearance {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    motion: !reduced,
    reduced,
  };
}
function change(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(key, JSON.stringify({ theme }));
  } catch {
    /* Applied for this visit when storage is blocked. */
  }
  window.dispatchEvent(new Event("orbit-appearance"));
}
export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>({
    theme: "light",
    motion: true,
    reduced: false,
  });
  useEffect(() => {
    const sync = () => {
      const next = read();
      document.documentElement.dataset.motion = next.motion ? "on" : "paused";
      setAppearance(next);
    };
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    sync();
    window.addEventListener("orbit-appearance", sync);
    media.addEventListener("change", sync);
    const storage = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        const value = JSON.parse(event.newValue ?? "null");
        if (value && (value.theme === "light" || value.theme === "dark")) {
          document.documentElement.dataset.theme = value.theme;
          window.dispatchEvent(new Event("orbit-appearance"));
        }
      } catch {
        /* Ignore malformed preferences. */
      }
    };
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("orbit-appearance", sync);
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", storage);
    };
  }, []);
  return {
    ...appearance,
    setTheme: change,
    toggleTheme: () => change(read().theme === "dark" ? "light" : "dark"),
  };
}
export function AppearanceToggle() {
  const { theme, toggleTheme } = useAppearance();
  return (
    <div className="appearance-toggle">
      <IconButton
        label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        onClick={toggleTheme}
      >
        {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
      </IconButton>
    </div>
  );
}
export function AppearanceSettings() {
  const { theme, setTheme } = useAppearance();
  return (
    <section className="surface appearance-settings">
      <h2>Appearance</h2>
      <p>Choose how Orbit looks on this device.</p>
      <fieldset>
        <legend>Colour mode</legend>
        <div className="appearance-options">
          {(["light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={theme === mode}
              onClick={() => setTheme(mode)}
            >
              {mode === "light" ? <Sun size={18} /> : <Moon size={18} />}
              <span>{mode === "light" ? "Light" : "Dark"}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
