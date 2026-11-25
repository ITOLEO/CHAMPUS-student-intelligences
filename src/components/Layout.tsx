import { useAppearance, saveSetting } from "../views/Preferences";
import { illustration } from "../data/assets";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  Search,
  Settings,
  Building2,
  PanelLeft,
  ListChecks,
  Bookmark,
  CalendarDays,
  Check,
  Compass,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useStore, useBusy } from "../data/store";
import { requireDb, check } from "../data/client";
import { deadlineText } from "../recommendation/recommendationEngine";
import { picture, type Listing } from "../data/model";

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="CHAMPUS home">
      <img src="/champus.svg" alt="" width="37" height="37" />
      CHAMPUS
    </Link>
  );
}
export function Header() {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const loc = useLocation(),
    btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="global">
      <div className="bar">
        <Brand />
        <nav
          aria-label="Main navigation"
          className={open ? "main-nav opened" : "main-nav"}
        >
          <NavLink to="/opportunities">Opportunities</NavLink>
          <NavLink to="/learning">Learning library</NavLink>
          <Link to="/#how-it-works">How it works</Link>
        </nav>
        <div className="nav-actions">
          {user && (
            <Link
              to="/search"
              aria-label="Search workspace"
              title="Search workspace"
              className="icon-btn"
            >
              <Search size={17} />
            </Link>
          )}
          {user && (
            <Link
              to="/settings"
              aria-label="Website settings"
              title="Website settings"
              className="icon-btn"
            >
              <Settings size={17} />
            </Link>
          )}
          <Link className="btn nav-login" to={user ? "/overview" : "/sign-in"}>
            {user ? <LayoutDashboard size={16} /> : <LogIn size={16} />}{" "}
            {user ? "Dashboard" : "Sign in"}
          </Link>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="mobile-menu icon-btn"
            ref={btn}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <Brand />
        <span>From learning to opportunity.</span>
        <Link to="/opportunities">Opportunities</Link>
        <Link to="/learning">Learning library</Link>
      </div>
    </footer>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="notice">
      {children}
    </p>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Compass size={23} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function CatalogState() {
  const s = useStore();
  if (s.catalogError)
    return (
      <Empty
        title="Catalog unavailable"
        text={s.catalogError}
        action={
          <button className="btn" onClick={s.refresh}>
            Try again
          </button>
        }
      />
    );
  if (s.catalogLoading) return <Notice>Loading opportunities…</Notice>;
  return null;
}
export function Guard({ children }: { children: ReactNode }) {
  const s = useStore();
  const loc = useLocation();
  if (s.authLoading)
    return (
      <main className="wrap section">
        <Notice>Checking your session…</Notice>
      </main>
    );
  if (!s.user)
    return (
      <Navigate
        replace
        to={"/sign-in?next=" + encodeURIComponent(loc.pathname + loc.search)}
      />
    );
  if (s.accountError)
    return (
      <main className="wrap section">
        <Empty
          title="Workspace unavailable"
          text={s.accountError}
          action={
            <button className="btn" onClick={s.refresh}>
              Try again
            </button>
          }
        />
      </main>
    );
  if (s.accountLoading)
    return (
      <main className="wrap section">
        <Notice>Loading your workspace…</Notice>
      </main>
    );
  return <>{children}</>;
}
export function Workspace({ children }: { children: ReactNode }) {
  const s = useStore();
  const job = useBusy();
  const rail = useAppearance();
  return (
    <div className={"work-shell rail-" + rail}>
      <aside className="side">
        <button
          className="text-btn rail-control"
          title="Change navigation width"
          aria-label="Change navigation width"
          onClick={() =>
            saveSetting("rail", rail === "expanded" ? "collapsed" : "expanded")
          }
        >
          <PanelLeft />
          <span>Workspace</span>
        </button>
        <nav aria-label="Student workspace">
          {(
            [
              ["/overview", "Overview", LayoutDashboard],
              ["/plan", "Learning plan", ListChecks],
              ["/profile", "My profile", UserRound],
              ["/skills", "Skill development", BookOpen],
              ["/opportunities", "Opportunities", Compass],
              ...(s.roles.includes("teacher")
                ? [["/teacher", "Teaching studio", GraduationCap]]
                : []),
              ...(s.roles.includes("industry")
                ? [["/industry", "Industry desk", Building2]]
                : []),
              ...(s.roles.some((r) =>
                ["curator", "teacher", "reviewer"].includes(r),
              )
                ? [["/staff", "Review and curation", ShieldCheck]]
                : []),
              ["/search", "Search", Search],
              ["/settings", "Settings", Settings],
            ] as [string, string, typeof BookOpen][]
          ).map(([to, label, Icon]) => (
            <NavLink key={to} to={to} aria-label={label} title={label}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          aria-label="Sign out"
          title="Sign out"
          className="text-btn signout"
          onClick={() =>
            job.run(async () => {
              const { error } = await requireDb().auth.signOut();
              if (error) throw error;
            })
          }
        >
          <LogOut size={17} />
          <span>Sign out</span>
        </button>
        {job.message && <Notice>{job.message}</Notice>}
      </aside>
      <main id="main" className="work-main">
        {children}
      </main>
    </div>
  );
}
export function SaveButton({
  row,
  compact = false,
}: {
  row: Listing;
  compact?: boolean;
}) {
  const s = useStore(),
    job = useBusy(),
    loc = useLocation();
  const saved = s.saved.includes(row.id);
  const cls = compact ? "icon-btn save-icon" : "btn secondary";
  const label = saved ? "Remove saved opportunity" : "Save opportunity";
  return (
    <div className={compact ? "save-wrap compact" : "save-wrap"}>
      {s.user ? (
        <button
          title={label}
          aria-label={label}
          aria-pressed={saved}
          className={cls}
          disabled={job.busy || s.accountLoading || !!s.accountError}
          onClick={() => job.run(() => s.saveListing(row.id))}
        >
          {saved ? <Check size={18} /> : <Bookmark size={18} />}{" "}
          {!compact && (saved ? "Saved" : "Save opportunity")}
        </button>
      ) : (
        <Link
          className={cls}
          aria-label="Sign in to save opportunity"
          title="Sign in to save opportunity"
          to={
            "/sign-in?next=" +
            encodeURIComponent(
              loc.pathname === "/" ? "/opportunities/" + row.id : loc.pathname,
            )
          }
        >
          <Bookmark size={18} />
          {!compact && "Save opportunity"}
        </Link>
      )}
      {job.message && <Notice>{job.message}</Notice>}
    </div>
  );
}
export function Card({ row }: { row: Listing }) {
  const o = row.data,
    photo = picture(o.id);
  return (
    <article className="opp-card">
      <Link
        className="card-img"
        to={"/opportunities/" + row.id}
        aria-label={"View " + o.title}
      >
        {photo ? (
          <img loading="lazy" src={illustration(photo)} alt="" />
        ) : (
          <span className="image-fallback">
            <GraduationCap size={60} />
          </span>
        )}
        <span className="category-chip">{o.category}</span>
      </Link>
      <div className="card-copy">
        <div className="card-org">{o.organization}</div>
        <h3>
          <Link to={"/opportunities/" + row.id}>{o.title}</Link>
        </h3>
        <p>{o.summary}</p>
        <div className="card-foot">
          <span>
            <CalendarDays size={15} />
            {deadlineText(o)}
          </span>
          <SaveButton row={row} compact />
        </div>
      </div>
    </article>
  );
}
