import { useEffect, useState } from "react";

export function setting(key: string, fallback: string) {
  try {
    return window.localStorage.getItem("champus.ui." + key) || fallback;
  } catch {
    return fallback;
  }
}
export function saveSetting(key: string, value: string) {
  try {
    window.localStorage.setItem("champus.ui." + key, value);
  } catch {}
  window.dispatchEvent(new window.Event("champus-ui"));
}
export function useAppearance() {
  const [v, set] = useState(0);
  useEffect(() => {
    const update = () => set((x) => x + 1);
    window.addEventListener("champus-ui", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("champus-ui", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  useEffect(() => {
    const choice = setting("theme", "light"),
      media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        choice === "system" ? (media?.matches ? "dark" : "light") : choice;
    };
    apply();
    media?.addEventListener("change", apply);
    return () => media?.removeEventListener("change", apply);
  }, [v]);
  return setting("rail", "hover");
}
