import { featureGroups, featurePath } from "../components/features";
import { illustration } from "../data/assets";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ListChecks,
  GraduationCap,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CatalogState, Empty, PageSurface } from "../components/Layout";
import { useStore } from "../data/store";
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
// The guide uses the same instructions as each feature's public detail page.
const features = featureGroups.flatMap((group) => group.features);
const guideFeatures = [
  "industry-needs",
  "course-practice",
  "learning-plan",
  "student-advisor",
  "campus-guidance",
].map((id) => features.find((feature) => feature.id === id)!);

function WorkflowGuide() {
  const [selected, setSelected] = useState(guideFeatures[0]);
  const Icon = selected.icon;
  return (
    <section className="guide-section wrap" aria-labelledby="guide-title">
      <h2 id="guide-title">How it works</h2>
      <div className="workflow-guide">
        <div
          className="guide-choices"
          role="group"
          aria-label="Choose a feature"
        >
          {guideFeatures.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <button
                type="button"
                key={feature.id}
                aria-pressed={selected.id === feature.id}
                aria-controls="guide-panel"
                onClick={() => setSelected(feature)}
              >
                <FeatureIcon size={20} />
                {feature.title}
              </button>
            );
          })}
        </div>
        <div id="guide-panel" className="guide-panel" aria-live="polite">
          <div className="guide-panel-heading">
            <Icon size={24} />
            <h3>{selected.title}</h3>
          </div>
          <p>{selected.description}</p>
          <ol>
            {selected.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Link className="feature-action" to={featurePath(selected.id)}>
            <ListChecks size={17} /> Explore {selected.title}
          </Link>
        </div>
      </div>
    </section>
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
    <main id="main" className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <img
          src={illustration("venture-workshop")}
          alt="Students work together on a project in a workshop."
          fetchPriority="high"
          width={1120}
          height={747}
        />
        <div className="wrap landing-hero-content">
          <p className="overline">Agile curriculum platform</p>
          <h1 id="landing-title">
            From learning
            <br />
            <em>to opportunity.</em>
          </h1>
          <p className="landing-lede">
            Connect a workplace need to your course. Practise it through a
            project that fits your goal, then use lecturer feedback to improve.
          </p>
          <div className="hero-buttons">
            <Link
              className="btn primary"
              to={s.sessionUser ? "/status" : "/sign-in"}
            >
              <GraduationCap size={18} />{" "}
              {s.sessionUser ? "Check status" : "Sign in to your workspace"}
            </Link>
            <Link className="view-all" to="/programs">
              Explore the course guide
            </Link>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="wrap landing-story">
        <div className="landing-statement">
          <div>
            <h2>What students learn should connect to what they do.</h2>
            <p>
              Partners describe changes in the workplace. Teachers connect those
              needs to course outcomes. Students practise, submit evidence, and
              learn from feedback. A student can ask the AI advisor for a next
              step and choose which suggestion to discuss with their lecturer.
            </p>
          </div>
          <nav className="workspace-index" aria-label="Explore workspaces">
            {featureGroups.map(({ id, title, features }) => {
              const Icon = features[0].icon;
              return (
                <Link key={id} to={featurePath(features[0].id)}>
                  <Icon size={23} />
                  {title}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="landing-workflow">
          {featureGroups.map((group) => {
            const [primary, ...related] = group.features;
            const Icon = primary.icon;
            return (
              <article className="landing-chapter" key={group.id}>
                <div className="landing-chapter-content">
                  <p className="overline">
                    <Icon size={17} /> {group.title}
                  </p>
                  <h2>{primary.title}</h2>
                  <p>{primary.description}</p>
                  <Link className="feature-action" to={featurePath(primary.id)}>
                    Explore {primary.title}
                  </Link>
                  <div className="chapter-links">
                    {related.map((feature) => (
                      <Link key={feature.id} to={featurePath(feature.id)}>
                        {feature.title}
                      </Link>
                    ))}
                  </div>
                </div>
                <img
                  src={illustration(
                    group.image === "venture-workshop"
                      ? "food-photography"
                      : group.image,
                  )}
                  alt=""
                  loading="lazy"
                  width={960}
                  height={640}
                />
              </article>
            );
          })}
        </div>
      </section>
      <section className="wrap start-guide" aria-labelledby="access-title">
        <div>
          <p className="overline">Account access</p>
          <h2 id="access-title">Start with your campus account.</h2>
          <p>
            Your CHAMPUS contact arranges your workspace. Students receive a
            program and cohort before they sign in. Your lecturer connects
            practice to the courses you take.
          </p>
          <Link
            className="btn primary"
            to={s.sessionUser ? "/status" : "/sign-in"}
          >
            {s.sessionUser ? "Check status" : "Sign in with a password"}
          </Link>
        </div>
        <div>
          <p className="overline">Program guide</p>
          <h2>One course, different goals.</h2>
          <p>
            A developer can build an issue queue. A photographer can build a
            proof gallery. Both can demonstrate the same web development
            outcome. Explore nine BIZAI practice guides and the campus programs.
          </p>
          <Link className="feature-action" to="/programs">
            Explore programs and courses
          </Link>
        </div>
      </section>
      <WorkflowGuide />
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
