import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../data/store";
import { Monitor, Search, UserRound } from "lucide-react";
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
  return setting("rail", "expanded");
}
export function Settings() {
  useAppearance();
  return (
    <>
      <h1 className="page-title">Settings</h1>
      <div className="panel form">
        <h2>
          <Monitor size={20} /> Appearance
        </h2>
        <label>
          Color theme
          <select
            value={setting("theme", "light")}
            onChange={(e) => saveSetting("theme", e.target.value)}
          >
            {["light", "dark", "system"].map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desktop navigation
          <select
            value={setting("rail", "expanded")}
            onChange={(e) => saveSetting("rail", e.target.value)}
          >
            {["expanded", "collapsed", "hover"].map((v, i) => (
              <option key={v} value={v}>
                {["Expanded", "Collapsed", "Expand on hover or focus"][i]}
              </option>
            ))}
          </select>
        </label>
        <p>Appearance is saved on this device.</p>
      </div>
      <section className="panel">
        <h2>
          <UserRound size={20} /> Profile settings
        </h2>
        <Link to="/profile">Edit profile and working style</Link>
      </section>
    </>
  );
}
export function WorkspaceSearch() {
  const [params, set] = useSearchParams(),
    q = params.get("q") || "",
    s = useStore();
  const links = [
    ...(s.user
      ? [
          ["My profile", "/profile"],
          ["Settings", "/settings"],
        ]
      : []),
    ...(s.user && !s.roles.includes("teacher") && !s.roles.includes("industry")
      ? [["My learning plan", "/plan"]]
      : []),
    ...(s.roles.includes("teacher") ? [["Teaching studio", "/teacher"]] : []),
    ...(s.roles.includes("industry") ? [["Industry desk", "/industry"]] : []),
    ...Object.values(s.skills).map((k) => [k.title, "/learning/" + k.id]),
    ...s.listings.map((r) => [r.data.title, "/opportunities/" + r.id]),
  ].filter(([name]) => name.toLowerCase().includes(q.trim().toLowerCase()));
  const content = (
    <>
      <h1 className="page-title">
        {s.user ? "Workspace search" : "Search CHAMPUS"}
      </h1>
      <label className="search">
        <Search size={17} />
        <input
          aria-label="Search pages, skills and opportunities"
          type="search"
          placeholder="Search pages, skills and opportunities"
          value={q}
          onChange={(e) => set({ q: e.target.value }, { replace: true })}
        />
      </label>
      <div className="panel">
        {links.length ? (
          links.map(([name, url]) => (
            <p className="curr-row" key={url}>
              <Link to={url}>{name}</Link>
            </p>
          ))
        ) : (
          <p>No matches. Try another term.</p>
        )}
      </div>
    </>
  );
  return s.user ? (
    content
  ) : (
    <main className="wrap section" id="main">
      {content}
    </main>
  );
}
