import { featureGroups, featurePath } from "../components/features";
import { PageSurface } from "../components/Layout";
import { illustration } from "../data/assets";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  GraduationCap,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CatalogState, Empty, Notice } from "../components/Layout";
import { useStore, useBusy } from "../data/store";
import { emptyProfile } from "../data/model";
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
      <section className="landing-hero">
        <img
          src={illustration("venture-workshop")}
          alt="Students work together on a project in a workshop."
          fetchPriority="high"
        />
        <div className="wrap landing-hero-content">
          <div className="hero-copy">
            <p className="overline">Agile curriculum platform</p>
            <h1>
              From learning
              <br />
              <em>to opportunity.</em>
            </h1>
            <p>
              Turn industry needs into course practice. Build evidence of what
              students can do.
            </p>
            <div className="hero-buttons">
              <Link replace className="btn primary" to="/sign-in">
                <GraduationCap size={18} /> Sign in to your workspace
              </Link>
              <Link replace className="btn secondary" to="/opportunities">
                Explore opportunities
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="wrap landing-story">
        <div className="landing-statement">
          <h2>What students learn should connect to what they do.</h2>
          <p>
            Partners describe changes in the workplace. Teachers connect those
            needs to course outcomes. Students practise, submit evidence, and
            learn from feedback.
          </p>
        </div>
        <div className="landing-workflow">
          {featureGroups.map((group) => {
            const primary = group.features[0];
            const Icon = primary.icon;
            return (
              <article className="landing-chapter" key={group.id}>
                <img
                  src={illustration(
                    group.image === "venture-workshop"
                      ? "food-photography"
                      : group.image,
                  )}
                  alt=""
                  loading="lazy"
                />
                <div className="landing-chapter-content">
                  <p className="overline">
                    <Icon size={17} /> {group.title}
                  </p>
                  <h2>{primary.title}</h2>
                  <p>{primary.description}</p>
                  <Link
                    replace
                    className="feature-action"
                    to={featurePath(primary.id)}
                  >
                    Explore {primary.title}
                    <ArrowRight size={16} />
                  </Link>
                  <div className="chapter-links">
                    {group.features.slice(1).map((feature) => (
                      <Link
                        replace
                        key={feature.id}
                        to={featurePath(feature.id)}
                      >
                        {feature.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
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
            <Link replace className="view-all" to="/opportunities">
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
    </main>
  );
}
export function Opportunities({ workspace = false }: { workspace?: boolean }) {
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
    <PageSurface workspace={workspace}>
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
    </PageSurface>
  );
}
