import { illustration } from "../data/assets";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import {
  BookOpen,
  CheckCheck,
  Compass,
  GraduationCap,
  Layers,
  Mail,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CatalogState, Empty, Notice } from "../components/Layout";
import { useStore, useBusy } from "../data/store";
import { check, db, requireDb } from "../data/client";
import { emptyProfile, safeReturn } from "../data/model";
import { isClosed, recommended } from "../recommendation/recommendationEngine";

function CategoryFilters({
  value,
  onChange,
  values,
}: {
  value: string;
  onChange: (v: string) => void;
  values: string[];
}) {
  return (
    <div className="pills" aria-label="Filter opportunities">
      {["All", ...values].map((v) => (
        <button
          key={v}
          aria-pressed={value === v}
          className={value === v ? "pill selected" : "pill"}
          onClick={() => onChange(v)}
        >
          {v === "All"
            ? "All opportunities"
            : v === "Campus program"
              ? "Campus programs"
              : v === "Mentoring"
                ? v
                : v + "s"}
        </button>
      ))}
    </div>
  );
}
export function Landing() {
  const s = useStore(),
    [category, setCategory] = useState("All");
  const active = recommended(s.listings, emptyProfile);
  const chosen = active
    .filter((x) => category === "All" || x.data.category === category)
    .slice(0, 3);
  return (
    <main id="main">
      <section className="hero wrap">
        <div className="hero-copy">
          <div className="overline">
            <span className="tiny-rule" />
            Campus intelligence platform
          </div>
          <h1>
            From learning
            <br />
            <em>to opportunity.</em>
          </h1>
          <p>
            Find opportunities that fit your goals. See what you can demonstrate
            and what to learn next.
          </p>
          <div className="hero-buttons">
            <Link className="btn primary" to="/opportunities">
              <Compass size={18} />
              Explore opportunities
            </Link>
            <Link
              className="btn secondary"
              to={s.user ? "/overview" : "/sign-in"}
            >
              {s.user ? "Open dashboard" : "Student sign in"}
            </Link>
          </div>
        </div>
        <figure className="hero-image">
          <img
            src={illustration("culinary-practice")}
            alt="A cook places a garnish on a dish with tweezers."
            fetchPriority="high"
          />
          <figcaption>
            <span className="photo-mark">
              <Layers size={20} />
            </span>
            <div>
              <span>Culinary arts</span>
              <strong>Plate composition</strong>
            </div>
          </figcaption>
        </figure>
      </section>
      <section className="explore-band">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="overline">
                <span className="tiny-rule" />
                Opportunity hub
              </p>
              <h2>Explore opportunities</h2>
            </div>
            <Link className="view-all" to="/opportunities">
              View all opportunities
            </Link>
          </div>
          <CategoryFilters
            value={category}
            onChange={setCategory}
            values={[...new Set(active.map((r) => r.data.category))]}
          />
          <CatalogState />
          {!s.catalogLoading &&
            !s.catalogError &&
            (chosen.length ? (
              <div className="card-grid">
                {chosen.map((r) => (
                  <Card key={r.id} row={r} />
                ))}
              </div>
            ) : (
              <Empty
                title="No open opportunities"
                text="Check again when the next listings are published."
              />
            ))}
        </div>
      </section>
      <section id="how-it-works" className="wrap how">
        <div className="section-head">
          <h2>How CHAMPUS works</h2>
        </div>
        <div className="how-grid">
          {[
            [
              Compass,
              "Find an opportunity",
              "Check the organizer, closing date and entry requirements.",
            ],
            [
              CheckCheck,
              "Understand your readiness",
              "See which conditions you meet and which skills have reviewed evidence.",
            ],
            [
              BookOpen,
              "Take the next step",
              "Open a practice resource, submit your work or visit the official application.",
            ],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof Compass;
            return (
              <section key={String(title)}>
                <I size={24} />
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
export function Opportunities() {
  const s = useStore(),
    [q, setQ] = useSearchParams();
  const search = q.get("q") || "",
    category = q.get("category") || "All",
    when = q.get("when") || "all",
    saved = q.get("saved") === "1";
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(q);
    if (v && v !== "All" && v !== "all") n.set(k, v);
    else n.delete(k);
    setQ(n, { replace: true });
  };
  const active = useMemo(
    () => recommended(s.listings, s.profile),
    [s.listings, s.profile],
  );
  const end = new Date();
  end.setDate(end.getDate() + (when === "week" ? 7 : 30));
  const matches = active.filter((r) => {
    const o = r.data;
    return (
      (category === "All" || o.category === category) &&
      (!saved || s.saved.includes(r.id)) &&
      (when === "all" || (!!o.deadline.date && isClosed(o.deadline, end))) &&
      [
        o.title,
        o.organization,
        o.category,
        o.location,
        o.summary,
        ...o.skills.map((sk) => sk.title),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );
  });
  return (
    <main id="main" className="wrap section">
      <p className="overline">
        <span className="tiny-rule" />
        Opportunity hub
      </p>
      <h1 className="page-title">Opportunities</h1>
      <p className="lede">
        Explore published opportunities and check the requirements before you
        apply.
      </p>
      <div className="search-row">
        <label className="search">
          <Search size={18} />
          <input
            type="search"
            aria-label="Search opportunities"
            placeholder="Search opportunities, skills or organizers"
            value={search}
            onChange={(e) => set("q", e.target.value)}
          />
        </label>
        <label className="filter">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Closing date"
            value={when}
            onChange={(e) => set("when", e.target.value)}
          >
            <option value="all">All deadlines</option>
            <option value="week">Next 7 days</option>
            <option value="month">Next 30 days</option>
          </select>
        </label>
        {s.user && (
          <label className="filter">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => set("saved", e.target.checked ? "1" : "")}
            />
            Saved
          </label>
        )}
      </div>
      <CategoryFilters
        value={category}
        onChange={(v) => set("category", v)}
        values={["Competition", "Scholarship", "Mentoring", "Campus program"]}
      />
      <CatalogState />
      {!s.catalogError && !s.catalogLoading && (
        <>
          <p className="muted results-count" role="status">
            {matches.length}{" "}
            {matches.length === 1 ? "opportunity" : "opportunities"}
          </p>
          {matches.length ? (
            <div className="card-grid">
              {matches.map((r) => (
                <Card key={r.id} row={r} />
              ))}
            </div>
          ) : (
            <Empty
              title="No matches"
              text="Try another search or clear the filters."
              action={
                <button className="btn" onClick={() => setQ({})}>
                  Clear filters
                </button>
              }
            />
          )}
        </>
      )}
    </main>
  );
}
export function SignIn() {
  const s = useStore(),
    [params] = useSearchParams(),
    job = useBusy();
  const next = safeReturn(params.get("next"));
  const [email, setEmail] = useState(""),
    [sent, setSent] = useState(false);
  useEffect(() => {
    document.title = "Sign in | CHAMPUS";
  }, []);
  if (s.user) return <Navigate to={next} replace />;
  return (
    <main id="main" className="auth-wrap">
      <section className="auth-box">
        <GraduationCap className="big-icon" />
        <h1>{sent ? "Check your email" : "Sign in to CHAMPUS"}</h1>
        <p>
          {sent
            ? "Use the secure link in your email to open your workspace."
            : "Use your email to access your profile, saved opportunities and learning evidence."}
        </p>
        {!db ? (
          <>
            <Notice>
              Account access is unavailable until this site is connected to its
              campus service.
            </Notice>
            <Link className="btn primary" to="/opportunities">
              Explore opportunities
            </Link>
          </>
        ) : sent ? (
          <button className="btn secondary" onClick={() => setSent(false)}>
            Use another email
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              job.run(async () => {
                const redirect = new URL("/sign-in", window.location.origin);
                redirect.searchParams.set("next", next);
                check(
                  await requireDb().auth.signInWithOtp({
                    email: email.trim(),
                    options: { emailRedirectTo: redirect.href },
                  }),
                );
                setSent(true);
              });
            }}
          >
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button className="btn primary" disabled={job.busy}>
              <Mail size={17} />
              {job.busy ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        )}
        {job.message && <Notice>{job.message}</Notice>}
      </section>
    </main>
  );
}
