import { setting, saveSetting, useAppearance } from "../data/appearance";
import { railModes, ThemeChoices } from "../components/Appearance";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../data/store";
import { Monitor, PanelLeft, Search, UserRound } from "lucide-react";
export function Settings() {
  useAppearance();
  const rail = setting("rail", "hover");
  return (
    <div className="settings-page">
      <div className="settings-heading">
        <h1 className="page-title">Settings</h1>
        <p className="lede">
          Manage how CHAMPUS looks and behaves on this device.
        </p>
      </div>
      <div className="settings-layout">
        <nav className="settings-index" aria-label="Settings sections">
          <Link to="#appearance">
            <Monitor size={17} /> Appearance
          </Link>
          <Link to="#sidebar">
            <PanelLeft size={17} /> Sidebar
          </Link>
          <Link to="/profile">
            <UserRound size={17} /> Profile settings
          </Link>
        </nav>
        <div className="settings-body">
          <section className="panel settings-group" id="appearance">
            <div>
              <h2>Appearance</h2>
              <p>Choose a theme or follow your device.</p>
            </div>
            <ThemeChoices preview />
          </section>
          <section className="panel settings-group" id="sidebar">
            <div>
              <h2>Sidebar</h2>
              <p>Choose how the desktop navigation opens.</p>
            </div>
            <div
              className="sidebar-setting-options"
              role="group"
              aria-label="Desktop navigation"
            >
              {railModes.map((mode) => (
                <button
                  className="btn secondary"
                  key={mode.id}
                  type="button"
                  aria-pressed={mode.id === rail}
                  onClick={() => saveSetting("rail", mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
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
