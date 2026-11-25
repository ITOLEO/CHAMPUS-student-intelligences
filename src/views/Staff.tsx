import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, ShieldCheck } from "lucide-react";
import { useStore, useBusy } from "../data/store";
import { check, requireDb } from "../data/client";
import {
  readEvidence,
  type Evidence,
  type Listing,
  type Opportunity,
  safeWebUrl,
} from "../data/model";
import { Empty, Notice } from "../components/Layout";
import { EvidenceList } from "./Skills";
const today = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function newRecord(): Opportunity {
  return {
    id: crypto.randomUUID(),
    title: "",
    organization: "",
    category: "Competition",
    location: "",
    mode: "",
    summary: "",
    description: "",
    sourceUrl: "",
    applicationUrl: "",
    deadline: {
      date: "",
      time: null,
      zone: "Asia/Makassar",
      label: "Registration closes",
      precision: "date-only",
    },
    eligibility: [],
    guidelines: [],
    skills: [],
    lastVerifiedAt: "",
    verificationType: "official-organizer-source",
  };
}
function Editor({ row, done }: { row: Listing | null; done: () => void }) {
  const s = useStore(),
    job = useBusy(),
    [data, D] = useState<Opportunity>(row?.data || newRecord()),
    [criteria, C] = useState(data.eligibility.map((r) => r.label).join("\n")),
    [verified, V] = useState(false);
  const update = (k: keyof Opportunity, v: string) =>
    D((old) => ({ ...old, [k]: v }));
  async function write(status: Listing["status"]) {
    const client = requireDb();
    if (
      !data.title.trim() ||
      !data.organization.trim() ||
      !safeWebUrl(data.sourceUrl) ||
      (data.applicationUrl && !safeWebUrl(data.applicationUrl))
    )
      throw Error("Enter the title, organizer and valid HTTPS destinations.");
    if (data.deadline.zone) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: data.deadline.zone });
      } catch {
        throw Error("Enter a valid IANA time zone.");
      }
    }
    const rules = criteria
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map(
        (label, i) =>
          data.eligibility.find((r) => r.label === label) || {
            id: "criterion-" + (i + 1),
            label,
            field: "confirmation",
            operator: "eq",
            value: true,
            sourceUrl: data.sourceUrl,
          },
      );
    if (new Set(rules.map((x) => x.id)).size !== rules.length) {
      rules.forEach((r, i) => {
        rules[i] = { ...r, id: "criterion-" + (i + 1) };
      });
    }
    if (
      status === "published" &&
      (!verified || !rules.length || !data.skills.length)
    )
      throw Error(
        "Check the source and include a rule and a skill before publishing.",
      );
    const value = {
      ...data,
      eligibility: rules,
      lastVerifiedAt: status === "published" ? today() : data.lastVerifiedAt,
    };
    const payload = {
      id: value.id,
      institution_id: s.institution,
      status,
      data: value,
    };
    const table = client.from("opportunities");
    const result = row
      ? await table
          .update(payload)
          .eq("id", row.id)
          .eq("revision", row.revision)
          .select("id")
          .single()
      : await table.insert(payload).select("id").single();
    check(result);
    s.refresh();
    done();
  }
  return (
    <form
      className="form panel"
      onSubmit={(e) => {
        e.preventDefault();
        job.run(() => write("draft"));
      }}
    >
      <h2>{row ? "Edit listing" : "New listing"}</h2>
      {(
        [
          "title",
          "organization",
          "summary",
          "description",
          "location",
          "mode",
          "sourceUrl",
          "applicationUrl",
        ] as const
      ).map((k) => (
        <label key={k}>
          {
            {
              title: "Title",
              organization: "Organizer",
              summary: "Short summary",
              description: "Description",
              location: "Location",
              mode: "Participation format",
              sourceUrl: "Official source URL",
              applicationUrl: "Application URL",
            }[k]
          }
          <input
            type={k.endsWith("Url") ? "url" : "text"}
            value={data[k]}
            onChange={(e) => update(k, e.target.value)}
            required={["title", "organization", "sourceUrl"].includes(k)}
          />
        </label>
      ))}
      <label>
        Category
        <select
          value={data.category}
          onChange={(e) => update("category", e.target.value)}
        >
          {["Competition", "Scholarship", "Mentoring", "Campus program"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
      </label>
      <div className="form-pair">
        <label>
          Closing date
          <input
            type="date"
            value={data.deadline.date}
            onChange={(e) =>
              D({
                ...data,
                deadline: { ...data.deadline, date: e.target.value },
              })
            }
          />
        </label>
        <label>
          Organizer time zone
          <input
            value={data.deadline.zone || ""}
            onChange={(e) =>
              D({
                ...data,
                deadline: { ...data.deadline, zone: e.target.value || null },
              })
            }
          />
        </label>
      </div>
      <label>
        Deadline type
        <select
          value={data.deadline.precision}
          onChange={(e) =>
            D({
              ...data,
              deadline: {
                ...data.deadline,
                precision: e.target.value,
                time: e.target.value === "minute" ? data.deadline.time : null,
              },
            })
          }
        >
          <option value="date-only">Closing day</option>
          <option value="before-date">Before this date</option>
          <option value="minute">Exact time</option>
        </select>
      </label>
      {data.deadline.precision === "minute" && (
        <label>
          Local closing time
          <input
            required
            type="time"
            value={data.deadline.time || ""}
            onChange={(e) =>
              D({
                ...data,
                deadline: { ...data.deadline, time: e.target.value },
              })
            }
          />
        </label>
      )}
      <label>
        Mandatory conditions, one per line
        <textarea value={criteria} onChange={(e) => C(e.target.value)} />
      </label>
      <label>
        Participation notes, one per line
        <textarea
          value={data.guidelines.join("\n")}
          onChange={(e) =>
            D({ ...data, guidelines: e.target.value.split("\n") })
          }
        />
      </label>
      <fieldset>
        <legend>Mapped skills</legend>
        {Object.values(s.skills).map((sk) => (
          <label className="check-label" key={sk.id}>
            <input
              type="checkbox"
              checked={data.skills.some((a) => a.id === sk.id)}
              onChange={(e) =>
                D({
                  ...data,
                  skills: e.target.checked
                    ? [...data.skills, sk]
                    : data.skills.filter((a) => a.id !== sk.id),
                })
              }
            />
            {sk.title}
          </label>
        ))}
      </fieldset>
      <label className="check-label">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => V(e.target.checked)}
        />
        I checked the source, destination, deadline and entry rules.
      </label>
      <div className="buttons">
        <button className="btn secondary" disabled={job.busy}>
          Save draft
        </button>
        <button
          className="btn primary"
          type="button"
          disabled={job.busy || !verified}
          onClick={() => job.run(() => write("published"))}
        >
          Publish checked listing
        </button>
        {row && (
          <button
            className="btn secondary"
            type="button"
            disabled={job.busy}
            onClick={() => job.run(() => write("archived"))}
          >
            Archive
          </button>
        )}
        <button className="text-btn" type="button" onClick={done}>
          Cancel
        </button>
      </div>
      {job.message && <Notice>{job.message}</Notice>}
    </form>
  );
}
function Review({ item, done }: { item: Evidence; done: () => void }) {
  const s = useStore(),
    job = useBusy(),
    [feedback, F] = useState(""),
    [decision, D] = useState("Verified");
  return (
    <form
      className="panel form"
      onSubmit={(e) => {
        e.preventDefault();
        job.run(async () => {
          check(
            await requireDb()
              .from("reviews")
              .insert({
                evidence_id: item.id,
                reviewer_id: s.user!.id,
                decision,
                feedback: feedback.trim(),
              }),
          );
          done();
          s.refresh();
        });
      }}
    >
      <strong>{s.skills[item.indicator_id]?.title || item.indicator_id}</strong>
      <p>{s.skills[item.indicator_id]?.indicator}</p>
      <EvidenceList rows={[item]} />
      <label>
        Decision
        <select value={decision} onChange={(e) => D(e.target.value)}>
          <option>Verified</option>
          <option>Needs revision</option>
        </select>
      </label>
      <label>
        Indicator-specific feedback
        <textarea
          required
          maxLength={2000}
          value={feedback}
          onChange={(e) => F(e.target.value)}
        />
      </label>
      <button className="btn primary" disabled={job.busy}>
        <Check size={16} />
        Record review
      </button>
      {job.message && <Notice>{job.message}</Notice>}
    </form>
  );
}
export function Staff() {
  const s = useStore(),
    [items, I] = useState<Listing[]>([]),
    [pending, P] = useState<Evidence[]>([]),
    [editing, E] = useState<Listing | null | undefined>(undefined),
    [error, Err] = useState(""),
    [busy, B] = useState(true),
    [rev, R] = useState(0);
  const curator = s.roles.includes("curator"),
    reviewer = s.roles.includes("reviewer");
  useEffect(() => {
    let valid = true;
    const client = requireDb();
    B(true);
    Err("");
    (async () => {
      if (curator) {
        const data = check(
          await client
            .from("opportunities")
            .select("*")
            .eq("institution_id", s.institution)
            .order("updated_at", { ascending: false }),
        );
        if (valid) I(data as Listing[]);
      }
      if (reviewer) {
        const data = check(
          await client
            .from("evidence")
            .select("*,reviews(*)")
            .eq("institution_id", s.institution)
            .neq("user_id", s.user!.id)
            .order("created_at"),
        );
        if (valid) P(readEvidence(data || []).filter((e) => !e.reviews.length));
      }
    })()
      .catch(() => {
        if (valid) Err("Could not load the staff workspace.");
      })
      .finally(() => {
        if (valid) B(false);
      });
    return () => {
      valid = false;
    };
  }, [rev, curator, reviewer, s.institution, s.user?.id]);
  if (!curator && !reviewer)
    return (
      <Empty
        title="Staff access required"
        text="Your account has no staff role for this institution."
        action={<Link to="/overview">Return to overview</Link>}
      />
    );
  const done = () => {
    E(undefined);
    R((n) => n + 1);
  };
  return (
    <>
      <p className="overline">
        <ShieldCheck size={16} />
        Institution workspace
      </p>
      <h1 className="page-title">Staff workspace</h1>
      {busy && <Notice>Loading records…</Notice>}
      {error && (
        <Notice>
          {error}{" "}
          <button className="text-btn" onClick={done}>
            Try again
          </button>
        </Notice>
      )}
      {curator &&
        (editing !== undefined ? (
          <Editor row={editing} done={done} />
        ) : (
          <section className="panel">
            <div className="panel-head">
              <h2>Opportunity curation</h2>
              <button className="btn secondary" onClick={() => E(null)}>
                <Plus size={16} />
                New listing
              </button>
            </div>
            {items.map((r) => (
              <div className="rule" key={r.id}>
                <strong>{r.data.title}</strong>
                <span className="status neutral">{r.status}</span>
                <button className="text-btn" onClick={() => E(r)}>
                  Edit
                </button>
              </div>
            ))}
          </section>
        ))}
      {reviewer && (
        <section>
          <h2>Evidence review</h2>
          {!busy && !pending.length && !error && (
            <Empty
              title="No submissions awaiting review"
              text="New student evidence will appear here."
            />
          )}
          {pending.map((e) => (
            <Review key={e.id} item={e} done={done} />
          ))}
        </section>
      )}
    </>
  );
}
