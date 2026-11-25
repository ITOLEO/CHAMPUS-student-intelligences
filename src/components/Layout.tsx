import { railModes } from "./Appearance";
import { useAppearance, saveSetting } from "../data/appearance";
import { illustration } from "../data/assets";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  Settings,
  Building2,
  BookmarkCheck,
  PanelLeft,
  ListChecks,
  Bookmark,
  CalendarDays,
  Check,
  Compass,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { useStore, useBusy } from "../data/store";
import { requireDb, check } from "../data/client";
import { deadlineText } from "../recommendation/recommendationEngine";
import { picture, type Listing } from "../data/model";

import { Brand } from "./Navigation";

export function Footer() {
  const { user } = useStore();
  const onIntroduction = useLocation().pathname === "/";
  return (
    <footer>
      <div className="footer-inner">
        <Brand to={user ? "/overview" : "/sign-in"} />
        <span>From learning to opportunity.</span>
        <Link replace={onIntroduction} to="/opportunities">
          Opportunities
        </Link>
        <Link replace={onIntroduction} to="/learning">
          Learning library
        </Link>
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
      <main id="main" className="wrap section">
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
      <main id="main" className="wrap section">
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
      <main id="main" className="wrap section">
        <Notice>Loading your workspace…</Notice>
      </main>
    );
  return <>{children}</>;
}
export function Workspace({ children }: { children: ReactNode }) {
  const s = useStore();
  const rail = useAppearance();
  const [mobileOpen, setMobileOpen] = useState(false);
  const teacher = s.roles.includes("teacher");
  const industry = s.roles.includes("industry");
  const reviewer = s.roles.some(
    (role) => role === "reviewer" || role === "curator",
  );
  const home = teacher ? "/teacher" : industry ? "/industry" : "/overview";
  const links: [string, string, typeof BookOpen][] = [
    [
      home,
      teacher ? "Teaching studio" : industry ? "Industry desk" : "Overview",
      LayoutDashboard,
    ],
  ];
  if (teacher || reviewer)
    links.push(["/staff", "Review and curation", ShieldCheck]);
  if (teacher && industry)
    links.push(["/industry", "Industry desk", Building2]);
  if (!teacher && !industry)
    links.push(
      ["/plan", "Learning plan", ListChecks],
      ["/skills", "Skill development", BookOpen],
      ["/opportunities", "Opportunities", Compass],
      ["/opportunities?saved=1", "Saved opportunities", BookmarkCheck],
    );
  const location = useLocation();
  const [railMenu, setRailMenu] = useState(false);
  const controls = useRef<HTMLDivElement>(null);
  const railButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!railMenu) return;
    const dismiss = (e: PointerEvent) => {
      if (!controls.current?.contains(e.target as Node)) setRailMenu(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRailMenu(false);
        railButton.current?.focus();
      }
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [railMenu]);
  return (
    <div className={"work-shell rail-" + rail}>
      <aside className="side">
        <div className="rail-mobile">
          <button
            type="button"
            className="btn secondary"
            aria-expanded={mobileOpen}
            aria-controls="workspace-nav"
            aria-label="Workspace navigation"
            title="Workspace navigation"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <PanelLeft size={19} />
          </button>
        </div>
        <div
          id="workspace-nav"
          className={mobileOpen ? "rail-content mobile-open" : "rail-content"}
        >
          <nav aria-label="Workspace navigation">
            {links.map(([to, label, Icon]) => {
              const isSaved = to.includes("?");
              const selected = isSaved
                ? location.pathname === "/opportunities" &&
                  new URLSearchParams(location.search).get("saved") === "1"
                : to === "/opportunities"
                  ? location.pathname.startsWith(to) &&
                    new URLSearchParams(location.search).get("saved") !== "1"
                  : location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  aria-label={label}
                  aria-current={selected ? "page" : undefined}
                  className={selected ? "active" : undefined}
                  title={label}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="rail-bottom" ref={controls}>
            <NavLink
              to="/settings"
              className="icon-btn rail-tool"
              title="Settings"
              aria-label="Settings"
              onClick={() => {
                setRailMenu(false);
                setMobileOpen(false);
              }}
            >
              <Settings size={17} />
            </NavLink>
            <button
              ref={railButton}
              type="button"
              className="icon-btn rail-tool rail-control"
              aria-label="Sidebar control"
              title="Sidebar control"
              aria-expanded={railMenu}
              aria-controls="sidebar-options"
              onClick={() => setRailMenu(!railMenu)}
            >
              <PanelLeft size={17} />
            </button>
            {railMenu && (
              <div
                className="sidebar-options"
                id="sidebar-options"
                role="group"
                aria-label="Sidebar control"
              >
                <strong>Sidebar control</strong>
                {railModes.map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    aria-pressed={rail === mode.id}
                    onClick={() => {
                      saveSetting("rail", mode.id);
                      setRailMenu(false);
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
          replace={loc.pathname === "/"}
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
  const onIntroduction = useLocation().pathname === "/";
  const o = row.data,
    photo = picture(o.id);
  return (
    <article className="opp-card">
      <Link
        className="card-img"
        replace={onIntroduction}
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
          <Link replace={onIntroduction} to={"/opportunities/" + row.id}>
            {o.title}
          </Link>
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

export function PageSurface({
  workspace,
  children,
}: {
  workspace: boolean;
  children: ReactNode;
}) {
  return workspace ? (
    <>{children}</>
  ) : (
    <main id="main" className="wrap section">
      {children}
    </main>
  );
}
