import { PageSurface } from "../components/Layout";
import { illustration } from "../data/assets";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { CatalogState, Empty, Notice, SaveButton } from "../components/Layout";
import { useStore, useBusy } from "../data/store";
import { check, requireDb } from "../data/client";
import { picture, safeWebUrl, type Answer, type Listing } from "../data/model";
import {
  dateLabel,
  deadlineText,
  eligibility,
  isClosed,
  matchingWords,
  nextPractice,
  readiness,
} from "../recommendation/recommendationEngine";
export function External({
  url,
  children,
  button = false,
}: {
  url: string;
  children: React.ReactNode;
  button?: boolean;
}) {
  const safe = safeWebUrl(url);
  return safe ? (
    <a
      className={button ? "btn primary" : "ext"}
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalLink size={14} />
    </a>
  ) : null;
}
function EntryRules({ row }: { row: Listing }) {
  const s = useStore(),
    task = useBusy(),
    [local, setLocal] = useState<Record<string, Answer>>({});
  const stored = s.confirmations[row.id + ":" + row.revision] || {};
  const answers = s.user ? stored : local;
  async function change(id: string, v: Answer) {
    if (!s.user) {
      setLocal((prev) => ({ ...prev, [id]: v }));
      return;
    }
    check(
      await requireDb().from("confirmations").upsert(
        {
          user_id: s.user.id,
          opportunity_id: row.id,
          revision: row.revision,
          rule_id: id,
          answer: v,
        },
        { onConflict: "user_id,opportunity_id,revision,rule_id" },
      ),
    );
    s.refresh();
  }
  return (
    <section className="panel" id="eligibility">
      <div className="panel-head">
        <h2>Entry requirements</h2>
        <span className="status">
          {eligibility(row.data.eligibility, answers)}
        </span>
      </div>
      <p className="muted">
        {s.user
          ? "Confirm each condition. The organizer makes the final decision."
          : "Check the conditions below. Sign in to keep your answers."}
      </p>
      {row.data.eligibility.map((r) => (
        <label className="rule" key={r.id}>
          <span>
            {r.label}
            <br />
            <External url={r.sourceUrl}>Rule source</External>
          </span>
          <select
            aria-label={r.label}
            value={answers[r.id] || "unknown"}
            disabled={task.busy || !!s.accountError || s.accountLoading}
            onChange={(e) =>
              task.run(() => change(r.id, e.target.value as Answer))
            }
          >
            <option value="unknown">Needs confirmation</option>
            <option value="yes">Condition met</option>
            <option value="no">Condition not met</option>
          </select>
        </label>
      ))}
      {task.message && <Notice>{task.message}</Notice>}
    </section>
  );
}
export function Detail({ workspace = false }: { workspace?: boolean }) {
  const s = useStore();
  const { id = "" } = useParams();
  const row = s.listings.find((r) => r.id === id);
  useEffect(() => {
    if (row) document.title = row.data.title + " | CHAMPUS";
  }, [row]);
  if (s.catalogLoading || s.catalogError)
    return (
      <PageSurface workspace={workspace}>
        <CatalogState />
      </PageSurface>
    );
  if (!row)
    return (
      <PageSurface workspace={workspace}>
        <Empty
          title="Opportunity unavailable"
          text="This listing may have been withdrawn."
          action={
            <Link className="btn" to="/opportunities">
              Browse opportunities
            </Link>
          }
        />
      </PageSurface>
    );
  const o = row.data,
    closed = isClosed(o.deadline),
    reasons = matchingWords(o, s.profile),
    next = nextPractice(o.skills, s.evidence, s.reflections),
    photo = picture(o.id);
  return (
    <PageSurface workspace={workspace}>
      <Link className="back" to="/opportunities">
        <ChevronLeft size={16} />
        Opportunities
      </Link>
      <div className="detail-grid">
        <div>
          <div className="overline">{o.category}</div>
          <h1 className="page-title">{o.title}</h1>
          <p className="lede">{o.summary}</p>
          <div className="meta-line">
            <span>
              <GraduationIcon />
              {o.organization}
            </span>
            <span>
              <MapPin size={16} />
              {o.location}
            </span>
          </div>
          <div className="mobile-date">
            <CalendarDays size={16} />
            {closed ? "Closed" : o.deadline.label} · {deadlineText(o)}
          </div>
          {s.accountError && (
            <Notice>
              {s.accountError}{" "}
              <button className="text-btn" onClick={s.refresh}>
                Try again
              </button>
            </Notice>
          )}
          <EntryRules row={row} key={row.id + ":" + row.revision} />
          <section className="panel">
            <h2>Why this opportunity?</h2>
            <p>
              {reasons.length
                ? "Your profile includes " +
                  reasons.join(", ") +
                  ". This listing relates to " +
                  o.skills.map((x) => x.specificSkill).join(" and ") +
                  "."
                : o.skills.length
                  ? "This opportunity connects to " +
                    o.skills.map((x) => x.specificSkill).join(" and ") +
                    "."
                  : o.summary}
            </p>
            {!reasons.length && s.user && (
              <Link to="/profile">Edit interests</Link>
            )}
          </section>
          <section className="panel">
            <h2>Skills and evidence</h2>
            <p className="muted">
              Review the indicators associated with this opportunity.
            </p>
            {o.skills.map((sk) => (
              <div className="skill-row" key={sk.id}>
                <div>
                  <span className="meta">
                    {sk.relationship === "assessed"
                      ? "Organizer assessment"
                      : sk.relationship === "recommended"
                        ? "Recommended practice"
                        : "Required deliverable"}
                  </span>
                  <h3>
                    <Link to={"/learning/" + sk.id}>{sk.title}</Link>
                  </h3>
                  <p>{sk.indicator}</p>
                </div>
                <span className="status neutral">
                  {s.accountLoading
                    ? "Loading records…"
                    : s.accountError
                      ? "Records unavailable"
                      : readiness(sk.id, s.evidence, s.reflections)}
                </span>
              </div>
            ))}
            {next && (
              <div className="next">
                <BookOpen />
                <div>
                  <strong>Next learning action</strong>
                  <p>{next.resource.title}</p>
                  <External url={next.resource.url}>
                    Open learning resource
                  </External>
                </div>
              </div>
            )}
          </section>
          <section className="panel">
            <h2>Participation details</h2>
            <p>{o.description}</p>
            <ul>
              {o.guidelines.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <External url={o.sourceUrl}>
              Read the organizer’s requirements
            </External>
          </section>
        </div>
        <aside className="detail-summary">
          {photo && (
            <img className="summary-img" src={illustration(photo)} alt="" />
          )}
          <div>
            <span className="meta">
              {closed ? "Applications closed" : o.deadline.label}
            </span>
            <h3>{deadlineText(o)}</h3>
            {o.deadline.precision !== "minute" && (
              <p className="meta">
                {o.deadline.zone
                  ? "Organizer location: " +
                    o.deadline.zone.replace("_", " ") +
                    ". "
                  : ""}
                Exact cutoff time unconfirmed.
              </p>
            )}
            <hr />
            <p>{o.mode}</p>
            <span className="verified">
              <ShieldCheck size={16} />
              Source checked {dateLabel(o.lastVerifiedAt, true)}
            </span>
            <div className="stack">
              {!closed && (
                <External url={o.applicationUrl || o.sourceUrl} button>
                  {o.applicationUrl
                    ? "Official application"
                    : "Official source"}
                </External>
              )}
              <SaveButton row={row} />
            </div>
          </div>
        </aside>
      </div>
    </PageSurface>
  );
}
function GraduationIcon() {
  return <CheckCircle2 size={16} />;
}
