import { ExitDemo } from "../components/ExitDemo";
import { workspaceNames } from "../data/platform";
import { ThemeChoices } from "./Appearance";
import { useAppearance } from "../data/appearance";
import { previewMode, requireDb } from "../data/client";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  BriefcaseBusiness,
  GraduationCap,
  BookOpen,
  SunMoon,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Clock3,
  LogIn,
  MessageSquare,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useStore, useBusy } from "../data/store";
import { safeWebUrl } from "../data/model";
import { featureGroups, featurePath } from "./features";

export function Brand({
  to = "/",
  compact = false,
}: {
  to?: string;
  compact?: boolean;
}) {
  const { pathname } = useLocation();
  return (
    <Link
      className="brand"
      to={to}
      onClick={(event) => {
        if (
          to === "/" &&
          pathname === "/" &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          window.scrollTo(0, 0);
        }
      }}
      aria-label={
        to === "/overview"
          ? "CHAMPUS dashboard"
          : to === "/sign-in"
            ? "CHAMPUS sign-in"
            : "CHAMPUS home"
      }
    >
      <img src="/champus.svg" alt="" width="35" height="35" />
      {!compact && "CHAMPUS"}
    </Link>
  );
}

export function Avatar() {
  const { user, profile, workspace } = useStore();
  const name = profile.name.trim() || user?.email || "";
  const initials = name
    .split(/\s+|@/)
    .slice(0, name.includes("@") ? 1 : 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const value =
    workspace === "student"
      ? user?.app_metadata.avatar_url
      : user?.user_metadata.avatar_url;
  const path = workspace !== "student" && user?.user_metadata.avatar_path;
  const [uploaded, setUploaded] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setUploaded("");
    if (typeof path === "string" && path.startsWith(user?.id + "/"))
      requireDb()
        .storage.from("profile-photos")
        .download(path)
        .then(({ data }) => {
          if (active && data) {
            objectUrl = URL.createObjectURL(data);
            setUploaded(objectUrl);
          }
        });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, user?.id]);
  const photo =
    uploaded || (typeof value === "string" ? safeWebUrl(value) : undefined);
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

type Popup = "features" | "account" | "help" | "search" | "theme";
function LocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);
  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  }).formatToParts(now);
  const zone = parts.find((part) => part.type === "timeZoneName")?.value;
  const time = parts
    .filter((part) => ["hour", "minute", "second"].includes(part.type))
    .map((part) => part.value)
    .join(":");
  return (
    <time
      className="local-clock"
      dateTime={now.toISOString()}
      title={date + " · " + time + " " + zone}
    >
      <span>{date}</span>
      <b>{time}</b>
      <span>{zone}</span>
    </time>
  );
}

export function Header() {
  useAppearance();
  const {
    user,
    sessionUser,
    authLoading,
    profile,
    workspace: kind,
  } = useStore();
  const job = useBusy();
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = !!user;
  const role = kind ? workspaceNames[kind] : "Account";
  const RoleIcon =
    kind === "industry"
      ? BriefcaseBusiness
      : kind === "campus"
        ? GraduationCap
        : kind === "admin"
          ? Settings
          : BookOpen;
  const theme = useRef<HTMLButtonElement>(null);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const features = useRef<HTMLButtonElement>(null);
  const account = useRef<HTMLButtonElement>(null);
  const help = useRef<HTMLButtonElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const [groupId, setGroupId] = useState("student");
  const statusScreen =
    location.pathname === "/status" ||
    (!!sessionUser &&
      !user &&
      ![
        "/",
        "/demo",
        "/programs",
        "/learning",
        "/opportunities",
        "/help",
        "/search",
      ].some((path) =>
        path === "/"
          ? location.pathname === path
          : location.pathname.startsWith(path),
      ) &&
      !location.pathname.startsWith("/features/"));
  const hoverOpened = useRef(false);
  useEffect(() => {
    if (popup !== "features") return;
    function position() {
      const anchor = features.current?.getBoundingClientRect();
      if (!anchor || !header.current) return;
      header.current.style.setProperty("--feature-left", anchor.left + "px");
      header.current.style.setProperty("--feature-top", anchor.bottom + "px");
    }
    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [popup, groupId]);

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
      if (statusScreen || authLoading) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (popup === "search") search.current?.focus();
        else setPopup("search");
      }
      if (event.key === "Escape" && popup) {
        const buttons = {
          features,
          account,
          help,
          theme,
          search: searchButton,
        };
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
  }, [popup, statusScreen, authLoading]);

  const toggle = (next: Popup) =>
    setPopup((current) => (current === next ? null : next));
  const isFeaturesOpen = popup === "features";
  if (statusScreen || authLoading)
    return (
      <header className="global public-header">
        <div className="bar">
          <Brand compact />
        </div>
      </header>
    );
  return (
    <header
      ref={header}
      className={workspace ? "global workspace-header" : "global public-header"}
    >
      <div className="bar">
        <Brand compact to={user ? "/overview" : "/"} />
        {!workspace && (
          <nav aria-label="Main navigation" className="marketing-nav">
            {featureGroups.map((group) => {
              const title =
                group.id === "campus"
                  ? "Lecturer"
                  : group.id === "industry"
                    ? "Industry"
                    : "Student";
              const open = isFeaturesOpen && groupId === group.id;
              function show(button: HTMLButtonElement) {
                features.current = button;
                setGroupId(group.id);
                setPopup("features");
              }
              return (
                <div
                  className="feature-disclosure"
                  key={group.id}
                  onPointerLeave={(e) => {
                    if (
                      e.pointerType === "mouse" &&
                      !e.currentTarget.contains(document.activeElement)
                    )
                      setPopup((current) =>
                        current === "features" ? null : current,
                      );
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget))
                      setPopup((current) =>
                        current === "features" ? null : current,
                      );
                  }}
                >
                  <button
                    type="button"
                    className="nav-text role-trigger"
                    aria-expanded={open}
                    aria-controls={"menu-" + group.id}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse") {
                        hoverOpened.current = true;
                        show(e.currentTarget);
                      }
                    }}
                    onClick={(e) => {
                      if (open && !(hoverOpened.current && e.detail))
                        setPopup(null);
                      else show(e.currentTarget);
                      hoverOpened.current = false;
                    }}
                  >
                    {title}
                    <ChevronDown size={13} />
                  </button>
                  {open && (
                    <div
                      className="features-flyout role-flyout"
                      id={"menu-" + group.id}
                    >
                      <div className="features-inner role-menu">
                        {group.features.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              className="feature-menu-link"
                              key={item.id}
                              to={featurePath(item.id)}
                            >
                              <span className="feature-icon">
                                <Icon size={18} />
                              </span>
                              <span>
                                <strong>{item.title}</strong>
                                <small>{item.description}</small>
                              </span>
                            </Link>
                          );
                        })}
                        <div className="mobile-destinations">
                          <Link to="/opportunities">Opportunities</Link>
                          <Link to="/learning">Learning library</Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <Link className="nav-text marketing-link" to="/opportunities">
              Opportunities
            </Link>
            <Link className="nav-text marketing-link" to="/learning">
              Learning library
            </Link>
          </nav>
        )}
        {workspace && (
          <span className="workspace-header-label">
            <span aria-hidden="true" className="context-divider">
              /
            </span>
            <RoleIcon size={17} aria-hidden="true" />
            <span>{role} workspace</span>
            {previewMode && <Link to="/demo">Demo</Link>}
          </span>
        )}
        <div className="nav-actions">
          {workspace ? (
            <LocalClock />
          ) : (
            <Link
              className="nav-text desktop-feedback"
              to="/help#feedback"
              aria-label="Feedback"
              title="Feedback"
            >
              <MessageSquare size={16} />
              <span>Feedback</span>
            </Link>
          )}
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
          {!workspace && (
            <button
              ref={theme}
              type="button"
              className="icon-btn nav-utility"
              aria-label="Appearance"
              title="Appearance"
              aria-expanded={popup === "theme"}
              aria-controls="public-appearance"
              onClick={() => toggle("theme")}
            >
              <SunMoon size={18} />
            </button>
          )}
          {popup === "theme" && !workspace && (
            <div className="header-popup" id="public-appearance">
              <ThemeChoices />
            </div>
          )}
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
                  <div className="account-summary">
                    <Avatar />
                    <div>
                      <strong>{profile.name || role + " account"}</strong>
                      <small>
                        {previewMode ? "You’re in a demo account" : user.email}
                      </small>
                    </div>
                  </div>
                  <div className="account-section">
                    <Link to="/profile" onClick={() => setPopup(null)}>
                      <UserRound size={17} /> My profile
                    </Link>
                    {!previewMode && (
                      <Link to="/demo">
                        <LayoutDashboard size={17} />
                        Try demo
                      </Link>
                    )}
                    <Link to="/settings" onClick={() => setPopup(null)}>
                      <Settings size={17} /> Settings
                    </Link>
                  </div>
                  <div className="account-section account-appearance">
                    <span>Theme</span>
                    <ThemeChoices />
                  </div>
                  <div className="account-section account-zone">
                    <Clock3 size={16} />{" "}
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </div>
                  <div className="account-section">
                    {previewMode ? (
                      <ExitDemo />
                    ) : (
                      <button
                        type="button"
                        className="account-signout"
                        disabled={job.busy}
                        onClick={() =>
                          job.run(async () => {
                            const { error } = await requireDb().auth.signOut({
                              scope: "local",
                            });
                            if (error) throw error;
                            navigate("/sign-in", { replace: true });
                          })
                        }
                      >
                        <LogOut size={17} /> Sign out
                      </button>
                    )}
                    {job.message && <small role="alert">{job.message}</small>}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {" "}
              {!sessionUser && (
                <Link className="demo-entry" to="/demo">
                  Try demo
                </Link>
              )}
              <Link
                className="btn primary nav-login"
                to={sessionUser ? "/status" : "/sign-in"}
              >
                <LogIn size={16} />
                <span>{sessionUser ? "Check status" : "Sign in"}</span>
              </Link>
            </>
          )}
          {popup === "help" && (
            <div className="header-popup" id="header-help">
              <Link to="/help">
                <CircleHelp size={17} /> Help center
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
