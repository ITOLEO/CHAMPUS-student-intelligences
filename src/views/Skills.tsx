import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  FileUp,
  LibraryBig,
} from "lucide-react";
import { CatalogState, Empty, Notice } from "../components/Layout";
import { useStore, useBusy } from "../data/store";
import { check, requireDb } from "../data/client";
import { safeWebUrl, type Skill, type Evidence } from "../data/model";
import {
  dateLabel,
  learningOrder,
  readiness,
} from "../recommendation/recommendationEngine";
import { External } from "./Detail";
const readinessReason = {
  "Evidence available":
    "A teacher verified at least one submission for this indicator.",
  "Partial evidence": "Submitted work is waiting for a teacher to review it.",
  "Development suggested":
    "A teacher requested a revision. Read the feedback and submit new work.",
  "Self-reported only":
    "Your reflection is available. A teacher has yet to verify work for this indicator.",
  "Not assessed":
    "No submitted evidence or self-assessment is available for this indicator.",
};
export function EvidenceList({ rows }: { rows: Evidence[] }) {
  const job = useBusy();
  const [download, setDownload] = useState<
    Record<string, { url: string; expires: number }>
  >({});
  return (
    <>
      {rows.map((e) => (
        <div className="evidence" key={e.id}>
          <div>
            <strong>{e.title}</strong>
            <span className="status neutral">
              {e.reviews[0]?.decision || "Submitted for review"}
            </span>
          </div>
          <p>{e.description}</p>
          <small>Submitted {dateLabel(e.created_at, true)}</small>
          {e.link && (
            <p>
              <External url={e.link}>Open submitted work</External>
            </p>
          )}
          {e.file_path &&
            (download[e.id]?.expires > Date.now() ? (
              <a
                className="ext"
                target="_blank"
                rel="noopener noreferrer"
                href={download[e.id].url}
                onClick={(event) => {
                  if (Date.now() >= download[e.id].expires) {
                    event.preventDefault();
                    setDownload((old) => ({
                      ...old,
                      [e.id]: { url: "", expires: 0 },
                    }));
                  }
                }}
              >
                Open private file
              </a>
            ) : (
              <button
                className="text-btn"
                disabled={job.busy}
                onClick={() =>
                  job.run(async () => {
                    const res = check(
                      await requireDb()
                        .storage.from("evidence")
                        .createSignedUrl(e.file_path!, 120),
                    );
                    if (!res) throw Error("File unavailable.");
                    setDownload((old) => ({
                      ...old,
                      [e.id]: {
                        url: res.signedUrl,
                        expires: Date.now() + 115000,
                      },
                    }));
                  })
                }
              >
                Get private file link
              </button>
            ))}
          {e.reviews.map((r) => (
            <blockquote key={r.created_at}>
              <strong>
                Teacher feedback · {dateLabel(r.created_at, true)}
              </strong>
              <p>{r.feedback}</p>
            </blockquote>
          ))}
        </div>
      ))}
      {job.message && <Notice>{job.message}</Notice>}
    </>
  );
}
function Practice({ skill }: { skill: Skill }) {
  const s = useStore(),
    job = useBusy(),
    complete = s.completed.includes(skill.id);
  return (
    <section className="panel">
      <h2>Practice activity</h2>
      <p>
        Record whether you finished the resource. Your teacher reviews submitted
        work separately.
      </p>
      <button
        className="btn secondary"
        aria-pressed={complete}
        disabled={job.busy}
        onClick={() =>
          job.run(
            async () => {
              const table = requireDb().from("completed_resources");
              const user = s.user!.id;
              check(
                complete
                  ? await table
                      .delete()
                      .eq("user_id", user)
                      .eq("indicator_id", skill.id)
                  : await table.upsert(
                      { user_id: user, indicator_id: skill.id },
                      { onConflict: "user_id,indicator_id" },
                    ),
              );
              s.refresh();
            },
            complete ? "Activity reopened." : "Practice recorded.",
          )
        }
      >
        {complete ? "Reopen practice" : "Mark practice complete"}
      </button>
      {job.message && <Notice>{job.message}</Notice>}
    </section>
  );
}
function SubmitWork({ skill }: { skill: Skill }) {
  const [query] = useSearchParams();
  const task = query.get("task");
  const s = useStore(),
    job = useBusy();
  const [title, T] = useState(""),
    [desc, D] = useState(""),
    [link, L] = useState(""),
    [file, F] = useState<File | null>(null),
    [key, K] = useState(0);
  async function send(e: FormEvent) {
    e.preventDefault();
    await job.run(async () => {
      if (!s.user) throw Error("Sign in to submit work.");
      if (!file && !link.trim())
        throw Error("Add a private file or an HTTPS link to your work.");
      if (link.trim() && !safeWebUrl(link.trim()))
        throw Error("Enter a valid HTTPS link.");
      const client = requireDb();
      const id = crypto.randomUUID();
      let path: string | null = null;
      if (file) {
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ].includes(file.type) ||
          file.size > 8 * 1024 * 1024
        )
          throw Error("Choose a PDF, JPG, PNG or WebP file up to 8 MB.");
        path =
          s.user.id +
          "/" +
          id +
          "." +
          {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "application/pdf": "pdf",
          }[file.type];
        check(
          await client.storage
            .from("evidence")
            .upload(path, file, { contentType: file.type }),
        );
      }
      const res = await client.from("evidence").insert({
        id,
        user_id: s.user.id,
        institution_id: s.institution,
        indicator_id: skill.id,
        title: title.trim(),
        description: desc.trim(),
        link: link.trim() || null,
        file_path: path,
        ...(task ? { task_id: task } : {}),
      });
      if (res.error) {
        if (path) await client.storage.from("evidence").remove([path]);
        throw Error(res.error.message);
      }
      T("");
      D("");
      L("");
      F(null);
      K((k) => k + 1);
      s.refresh();
    }, "Evidence submitted for review.");
  }
  return (
    <form className="panel form" onSubmit={send}>
      <h2>Submit evidence</h2>
      <p className="muted">
        Show how your work demonstrates the indicator above.
      </p>
      <label>
        Work title
        <input
          required
          maxLength={140}
          value={title}
          onChange={(e) => T(e.target.value)}
        />
      </label>
      <label>
        What does your work show?
        <textarea
          required
          maxLength={2000}
          value={desc}
          onChange={(e) => D(e.target.value)}
        />
      </label>
      <label>
        Work link
        <input
          type="url"
          placeholder="https://"
          value={link}
          onChange={(e) => L(e.target.value)}
        />
      </label>
      <label>
        Private file
        <input
          key={key}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => F(e.target.files?.[0] || null)}
        />
        <small>PDF, JPG, PNG or WebP. Up to 8 MB.</small>
      </label>
      <button className="btn primary" disabled={job.busy}>
        <FileUp size={16} />
        Submit evidence
      </button>
      {job.message && <Notice>{job.message}</Notice>}
    </form>
  );
}
function ReflectionForm({ skill }: { skill: Skill }) {
  const s = useStore(),
    job = useBusy(),
    record = s.reflections.find((r) => r.indicator_id === skill.id);
  const [assessment, A] = useState(record?.assessment || ""),
    [confidence, C] = useState(record?.confidence || "");
  return (
    <form
      className="panel form"
      onSubmit={(e) => {
        e.preventDefault();
        job.run(async () => {
          check(
            await requireDb().from("self_assessments").upsert(
              {
                user_id: s.user!.id,
                indicator_id: skill.id,
                assessment,
                confidence,
              },
              { onConflict: "user_id,indicator_id" },
            ),
          );
          s.refresh();
        }, "Reflection saved.");
      }}
    >
      <h2>My reflection</h2>
      <label>
        Self-assessment
        <select required value={assessment} onChange={(e) => A(e.target.value)}>
          <option value="">Choose a response</option>
          {["New to this", "Practising", "Can demonstrate"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Confidence in this assessment
        <select required value={confidence} onChange={(e) => C(e.target.value)}>
          <option value="">Choose confidence</option>
          {["Low", "Moderate", "High"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <button className="btn secondary" disabled={job.busy}>
        Save reflection
      </button>
      {job.message && <Notice>{job.message}</Notice>}
    </form>
  );
}
export function Learning({ workspace = false }: { workspace?: boolean }) {
  const s = useStore(),
    { id } = useParams(),
    [q, Q] = useState("");
  const [params] = useSearchParams();
  const assigned = !!params.get("task");
  const skills = learningOrder(Object.values(s.skills));
  const sk = skills.find((x) => x.id === id);
  const content =
    s.catalogError || s.catalogLoading ? (
      <CatalogState />
    ) : id && !sk ? (
      <Empty
        title="Skill unavailable"
        text="Choose another skill from the library."
        action={<Link to="/learning">Learning library</Link>}
      />
    ) : sk ? (
      <>
        <Link className="back" to={assigned ? "/plan" : "/learning"}>
          <ChevronLeft size={16} />
          {assigned ? "My learning plan" : "Learning library"}
        </Link>
        <div className="overline">
          {sk.cluster} / {sk.specificSkill}
        </div>
        <h1 className="page-title">{sk.title}</h1>
        <div className="detail-grid">
          <div>
            <section className="panel">
              <h2>Observable indicator</h2>
              <p>{sk.indicator}</p>
              <External url={sk.sourceUrl}>Indicator source</External>
            </section>
            <div className="next">
              <BookOpen />
              <div>
                <strong>{sk.resource.title}</strong>
                <p>{sk.resource.provider}</p>
                <External url={sk.resource.url}>
                  Open learning resource
                </External>
              </div>
            </div>
            {s.mappings
              .filter((m) => m.microSkillId === sk.id)
              .map((m) => (
                <section key={m.id} className="panel">
                  <h2>Related course outcome</h2>
                  <p>
                    {m.course} · {m.institution}
                  </p>
                  <strong>{m.outcome}</strong>
                  <p>
                    {m.scope} {m.mappingStatus}.
                  </p>
                  <External url={m.sourceUrl}>
                    Published course description
                  </External>
                </section>
              ))}
            <section className="panel">
              <h2>Connected opportunities</h2>
              {s.listings
                .filter((r) => r.data.skills.some((a) => a.id === sk.id))
                .map((r) => (
                  <p key={r.id}>
                    <Link to={"/opportunities/" + r.id}>{r.data.title}</Link>
                  </p>
                ))}
            </section>
            {s.accountError && (
              <Notice>
                {s.accountError}{" "}
                <button className="text-btn" onClick={s.refresh}>
                  Try again
                </button>
              </Notice>
            )}
            {s.workspace === "student" &&
            !s.accountLoading &&
            !s.accountError ? (
              <>
                <Practice skill={sk} />
                {s.institution ? (
                  <SubmitWork key={sk.id} skill={sk} />
                ) : (
                  <div className="panel">
                    <h2>Submit evidence</h2>
                    <p>
                      Ask your administrator to assign your institution before
                      submitting work.
                    </p>
                    <Link to="/profile">View account profile</Link>
                  </div>
                )}
                <section className="panel">
                  <h2>My submissions</h2>
                  {s.evidence.some((e) => e.indicator_id === sk.id) ? (
                    <EvidenceList
                      rows={s.evidence.filter((e) => e.indicator_id === sk.id)}
                    />
                  ) : (
                    <p>No work submitted for this indicator.</p>
                  )}
                </section>
              </>
            ) : (
              !s.user && (
                <Link
                  className="btn primary"
                  to={"/sign-in?next=/learning/" + sk.id}
                >
                  Sign in to submit work
                </Link>
              )
            )}
          </div>
          <aside>
            <section className="panel">
              <h2>Skill readiness</h2>
              {s.accountLoading ? (
                <Notice>Loading your records…</Notice>
              ) : s.accountError ? (
                <p>Personal readiness is unavailable.</p>
              ) : (
                <>
                  <span className="status">
                    {readiness(sk.id, s.evidence, s.reflections)}
                  </span>
                  <p>
                    {s.user
                      ? readinessReason[
                          readiness(sk.id, s.evidence, s.reflections)
                        ]
                      : "Sign in to see your own evidence and assessments."}
                  </p>
                </>
              )}
            </section>
            {s.workspace === "student" &&
              !s.accountLoading &&
              !s.accountError && <ReflectionForm key={sk.id} skill={sk} />}
          </aside>
        </div>
      </>
    ) : (
      <>
        <p className="overline">
          <span className="tiny-rule" />
          Learning resources
        </p>
        <h1 className="page-title">
          {workspace ? "Skill development" : "Learning library"}
        </h1>
        <p className="lede">
          Choose a skill to see its indicator, practice resource and connected
          opportunities.
        </p>
        <label className="search">
          <LibraryBig size={18} />
          <input
            type="search"
            aria-label="Search skills"
            placeholder="Search skills or topics"
            value={q}
            onChange={(e) => Q(e.target.value)}
          />
        </label>
        <div className="library-grid">
          {skills
            .filter((sk) =>
              (sk.title + " " + sk.cluster + " " + sk.specificSkill)
                .toLowerCase()
                .includes(q.toLowerCase()),
            )
            .map((sk) => (
              <Link
                className="library-card"
                key={sk.id}
                to={"/learning/" + sk.id}
              >
                <BookOpen size={20} />
                <small>{sk.cluster}</small>
                <h3>{sk.title}</h3>
                <p>{sk.indicator}</p>
                <span>
                  <CheckCircle2 size={14} />
                  {readiness(sk.id, s.evidence, s.reflections)}
                </span>
              </Link>
            ))}
        </div>
        {!skills.some((sk) =>
          (sk.title + " " + sk.cluster + " " + sk.specificSkill)
            .toLowerCase()
            .includes(q.toLowerCase()),
        ) && (
          <Empty title="No matching skills" text="Try a different search." />
        )}
      </>
    );
  return workspace ? (
    <>{content}</>
  ) : (
    <main id="main" className="wrap section">
      {content}
    </main>
  );
}
