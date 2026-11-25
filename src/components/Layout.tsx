import { useAppearance, saveSetting } from "../views/Preferences";
import { illustration } from "../data/assets";
import { useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  Settings,
  Building2,
  BookmarkCheck,
  ExternalLink,
  PanelLeft,
  ListChecks,
  Bookmark,
  CalendarDays,
  Check,
  Compass,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useStore, useBusy } from "../data/store";
import { requireDb, check } from "../data/client";
import { deadlineText } from "../recommendation/recommendationEngine";
import { picture, type Listing } from "../data/model";

import { Avatar, Brand } from "./Navigation";

export function Footer() {
  const { user } = useStore();
  return (
    <footer>
      <div className="footer-inner">
        <Brand to={user ? "/overview" : "/"} />
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
  const job = useBusy();
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
  return (
    <div className={"work-shell rail-" + rail}>
      <aside className="side">
        <div className="rail-mobile">
          <button
            type="button"
            className="btn secondary"
            aria-expanded={mobileOpen}
            aria-controls="workspace-nav"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <PanelLeft size={17} /> Workspace navigation
          </button>
        </div>
        <div
          id="workspace-nav"
          className={mobileOpen ? "rail-content mobile-open" : "rail-content"}
        >
          <div className="rail-heading">
            <Avatar />
            <div>
              <strong>{s.profile.name || "My workspace"}</strong>
              <small>
                {teacher ? "Teaching" : industry ? "Industry" : "Student"}
              </small>
            </div>
          </div>
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
          <nav className="rail-bottom" aria-label="Account navigation">
            <NavLink
              to="/profile"
              title="My profile"
              aria-label="My profile"
              onClick={() => setMobileOpen(false)}
            >
              <UserRound />
              <span>My profile</span>
            </NavLink>
            <NavLink
              to="/settings"
              title="Settings"
              aria-label="Settings"
              onClick={() => setMobileOpen(false)}
            >
              <Settings />
              <span>Settings</span>
            </NavLink>
            <NavLink
              to="/welcome"
              title="View landing page"
              aria-label="View landing page"
            >
              <ExternalLink />
              <span>View landing page</span>
            </NavLink>
            <button
              aria-label="Sign out"
              title="Sign out"
              className="text-btn signout"
              disabled={job.busy}
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
            <button
              type="button"
              className="text-btn rail-control"
              aria-label={
                rail === "expanded"
                  ? "Collapse navigation"
                  : "Expand navigation"
              }
              title={
                rail === "expanded"
                  ? "Collapse navigation"
                  : "Expand navigation"
              }
              onClick={() =>
                saveSetting(
                  "rail",
                  rail === "expanded" ? "collapsed" : "expanded",
                )
              }
            >
              <PanelLeft />
              <span>
                {rail === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
              </span>
            </button>
          </nav>
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
