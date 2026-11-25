import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LayoutTemplate,
  LogIn,
  Menu,
  MessageSquare,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useStore } from "../data/store";
import { safeWebUrl } from "../data/model";
import { featureGroups } from "./features";

export function Brand({ to = "/" }: { to?: string }) {
  return (
    <Link
      className="brand"
      to={to}
      aria-label={to === "/overview" ? "CHAMPUS dashboard" : "CHAMPUS home"}
    >
      <img src="/champus.svg" alt="" width="35" height="35" />
      CHAMPUS
    </Link>
  );
}

export function Avatar() {
  const { user, profile } = useStore();
  const name = profile.name.trim() || user?.email || "";
  const initials = name
    .split(/\s+|@/)
    .slice(0, name.includes("@") ? 1 : 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const value = user?.user_metadata.avatar_url;
  const photo = typeof value === "string" ? safeWebUrl(value) : undefined;
  const [failed, setFailed] = useState("");
  return (
    <span className="avatar" aria-hidden="true">
      {photo && failed !== photo ? (
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(photo)}
        />
      ) : (
        initials || <UserRound size={16} />
      )}
    </span>
  );
}

type Popup = "features" | "account" | "help" | "search";
export function Header() {
  const { user } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const publicLanding =
    location.pathname === "/" || location.pathname === "/welcome";
  const workspace =
    !!user && !publicLanding && location.pathname !== "/sign-in";
  const [popup, setPopup] = useState<Popup | null>(null);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const features = useRef<HTMLButtonElement>(null);
  const account = useRef<HTMLButtonElement>(null);
  const help = useRef<HTMLButtonElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const hoverOpened = useRef(false);

  useEffect(() => {
    setPopup(null);
  }, [location.key]);
  useEffect(() => {
    if (popup === "search") search.current?.focus();
  }, [popup]);

  useEffect(() => {
    const clickOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setPopup(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (popup === "search") search.current?.focus();
        else setPopup("search");
      }
      if (event.key === "Escape" && popup) {
        const buttons = { features, account, help, search: searchButton };
        buttons[popup].current?.focus();
        setPopup(null);
      }
    };
    window.addEventListener("pointerdown", clickOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", clickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [popup]);

  const toggle = (next: Popup) =>
    setPopup((current) => (current === next ? null : next));
  const isFeaturesOpen = popup === "features";
  return (
    <header
      ref={header}
      className={workspace ? "global workspace-header" : "global"}
    >
      <div className="bar">
        <Brand to={user ? "/overview" : "/"} />
        {!workspace && (
          <nav aria-label="Main navigation" className="marketing-nav">
            <div
              className="feature-disclosure"
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse" && popup !== "features") {
                  hoverOpened.current = true;
                  setPopup("features");
                }
              }}
              onPointerLeave={(event) => {
                hoverOpened.current = false;
                if (
                  event.pointerType === "mouse" &&
                  !event.currentTarget.contains(document.activeElement)
                ) {
                  setPopup((current) =>
                    current === "features" ? null : current,
                  );
                }
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setPopup((current) =>
                    current === "features" ? null : current,
                  );
              }}
            >
              <button
                ref={features}
                type="button"
                className="nav-text features-trigger"
                aria-expanded={isFeaturesOpen}
                aria-controls="feature-menu"
                aria-label="Features"
                onClick={(event) => {
                  if (hoverOpened.current && event.detail) {
                    hoverOpened.current = false;
                    setPopup("features");
                    return;
                  }
                  toggle("features");
                }}
              >
                <Menu size={19} className="features-mobile-icon" />
                <span>Features</span>
                <ChevronDown size={14} />
              </button>
              <div
                className="features-flyout"
                id="feature-menu"
                hidden={!isFeaturesOpen}
              >
                <div className="features-inner">
                  {featureGroups.map((group) => (
                    <section className="feature-column" key={group.title}>
                      <h2>{group.title}</h2>
                      {group.features.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.id}
                            className="feature-menu-link"
                            to={
                              (user && publicLanding ? "/welcome" : "/") +
                              "#" +
                              item.id
                            }
                          >
                            <span className="feature-icon">
                              <Icon size={19} />
                            </span>
                            <span>
                              <strong>{item.title}</strong>
                              <small>{item.description}</small>
                            </span>
                          </Link>
                        );
                      })}
                    </section>
                  ))}
                </div>
              </div>
            </div>
            <Link className="nav-text marketing-link" to="/opportunities">
              Opportunities
            </Link>
            <Link className="nav-text marketing-link" to="/learning">
              Learning library
            </Link>
          </nav>
        )}
        {workspace && <span className="workspace-header-label">Workspace</span>}
        <div className="nav-actions">
          <button
            type="button"
            className="nav-text desktop-feedback"
            onClick={() => navigate("/help#feedback")}
          >
            Feedback
          </button>
          <button
            ref={searchButton}
            type="button"
            className="nav-search"
            aria-label="Search CHAMPUS"
            aria-expanded={popup === "search"}
            aria-controls="header-search"
            onClick={() => toggle("search")}
          >
            <Search size={16} />
            <span>Search</span>
            <kbd>Ctrl K</kbd>
          </button>
          <button
            ref={help}
            type="button"
            className="icon-btn nav-utility"
            aria-label="Help"
            aria-expanded={popup === "help"}
            aria-controls="header-help"
            onClick={() => toggle("help")}
          >
            <CircleHelp size={17} />
          </button>
          {user ? (
            <>
              <button
                ref={account}
                type="button"
                className="avatar-button"
                aria-label="Account"
                aria-expanded={popup === "account"}
                aria-controls="header-account"
                onClick={() => toggle("account")}
              >
                <Avatar />
              </button>
              {popup === "account" && (
                <div className="header-popup" id="header-account">
                  <Link to="/overview">
                    <LayoutDashboard size={17} /> Dashboard
                  </Link>
                  <Link to="/profile">
                    <UserRound size={17} /> My profile
                  </Link>
                  <Link to="/settings">
                    <Settings size={17} /> Settings
                  </Link>
                  {workspace && (
                    <Link to="/welcome">
                      <LayoutTemplate size={17} /> View landing page
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <Link className="btn primary nav-login" to="/sign-in">
              <LogIn size={16} />
              <span>Sign in</span>
            </Link>
          )}
          {popup === "help" && (
            <div className="header-popup" id="header-help">
              <Link to="/help">
                <CircleHelp size={17} /> Help center
              </Link>
              <Link to="/help#feedback">
                <MessageSquare size={17} /> Give feedback
              </Link>
            </div>
          )}
          {popup === "search" && (
            <form
              className="header-popup search-popup"
              id="header-search"
              onSubmit={(e) => {
                e.preventDefault();
                setPopup(null);
                navigate(
                  "/search" +
                    (query.trim()
                      ? "?" + new URLSearchParams({ q: query.trim() })
                      : ""),
                );
              }}
            >
              <label htmlFor="quick-search">Search CHAMPUS</label>
              <div className="search-popup-row">
                <input
                  ref={search}
                  id="quick-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Skills, pages or opportunities"
                />
                <button type="submit" className="btn primary">
                  Search
                </button>
              </div>
              <button
                type="button"
                className="icon-btn search-close"
                aria-label="Close search"
                onClick={() => {
                  setPopup(null);
                  searchButton.current?.focus();
                }}
              >
                <X size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
