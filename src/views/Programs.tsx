import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, FileText } from "lucide-react";
import { programs, readRows, useRecords } from "../data/platform";
import { db, requireDb } from "../data/client";
import { useBusy, useStore } from "../data/store";
import { Notice, PageSurface } from "../components/Layout";

type Published = {
  id: string;
  title: string;
  program: string;
  outcome: string;
  practice: string;
  artifact: string;
  indicator_id: string;
  source_url: string;
};
export function Programs() {
  const s = useStore(),
    [params, setParams] = useSearchParams(),
    job = useBusy();
  const program =
    programs.find(
      (p) => p.id === (params.get("program") || s.profile.program),
    ) || programs[0];
  const selected =
    program.courses.find((c) => c.id === params.get("course")) ||
    program.courses[0];
  const [path, setPath] = useState<"developer" | "photographer">("developer");
  const campus = useRecords(
    async (): Promise<Published[]> =>
      db
        ? readRows(
            await db
              .from("program_lessons")
              .select("*")
              .eq("institution_id", s.institution || "pib")
              .eq("program", program.id)
              .eq("origin", "Campus practice")
              .order("title"),
          )
        : [],
    [s.institution, program.id],
  );
  function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fields = Object.fromEntries(new FormData(form));
    job.run(async () => {
      readRows(
        await requireDb().rpc("publish_practice", {
          program_id: program.id,
          ...fields,
        }),
      );
      form.reset();
      campus.reload();
      s.refresh();
    }, "Course practice published.");
  }
  return (
    <PageSurface workspace={!!s.user}>
      <p className="overline">Programs and cohorts</p>
      <h1 className="page-title">Course guide</h1>
      <p className="lede">
        Explore a program, see the task and check what a teacher will look for
        in your work.
      </p>
      <label className="program-select">
        Program
        <select
          value={program.id}
          onChange={(e) => setParams({ program: e.target.value })}
        >
          {programs.map((p) => (
            <option value={p.id} key={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <p>{program.curriculumBasis}</p>
      {s.workspace === "student" && (
        <p className="muted">
          Your cohort · {s.cohort || "Awaiting placement"}
        </p>
      )}
      {selected ? (
        <div className="course-spread">
          <nav aria-label="Courses">
            {program.courses.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={selected.id === c.id}
                onClick={() => setParams({ program: program.id, course: c.id })}
              >
                {c.title}
              </button>
            ))}
          </nav>
          <article className="panel course-detail">
            <p className="overline">CHAMPUS practice</p>
            <h2>{selected.title}</h2>
            <p>{selected.overview}</p>
            <h3>Learning outcome</h3>
            <p>{selected.outcome}</p>
            <ul>
              {selected.topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <h3>Practice brief</h3>
            <p>{selected.practice}</p>
            <label>
              Try a career example
              <select
                value={path}
                onChange={(e) => setPath(e.target.value as typeof path)}
              >
                <option value="developer">Web developer</option>
                <option value="photographer">Photographer</option>
              </select>
            </label>
            <p className="notice">{selected.paths[path]}</p>
            <h3>What to submit</h3>
            <p>{selected.artifact}</p>
            <h3>Observable indicator</h3>
            <p>{selected.indicator}</p>
            <div className="buttons">
              <a href={selected.resource.url} target="_blank" rel="noreferrer">
                <BookOpen size={15} /> {selected.resource.title}
              </a>
              {s.workspace === "student" && (
                <Link to={"/learning/bizai-" + selected.id}>
                  <FileText size={15} /> Open evidence and reflection
                </Link>
              )}
            </div>
          </article>
        </div>
      ) : (
        <p className="panel">
          Your campus can publish course outcomes and source materials for this
          program here.
        </p>
      )}
      {campus.error && (
        <Notice>
          Campus-published practice could not load.{" "}
          <button onClick={campus.reload}>Retry</button>
        </Notice>
      )}
      {campus.data?.map((c) => (
        <article key={c.id} className="panel">
          <p className="overline">Campus practice</p>
          <h2>{c.title}</h2>
          <p>{c.outcome}</p>
          <p>{c.practice}</p>
          <strong>What to submit</strong>
          <p>{c.artifact}</p>
          <a href={c.source_url} target="_blank" rel="noreferrer">
            Course resource
          </a>{" "}
          · <Link to={"/learning/" + c.indicator_id}>Skill indicator</Link>
        </article>
      ))}
      {s.workspace === "campus" && s.roles.includes("teacher") && (
        <form className="panel form" onSubmit={publish}>
          <h2>Publish campus practice</h2>
          <p>This guide will be public. Use your approved course materials.</p>
          {(
            [
              ["lesson_title", "Course title", 160],
              ["outcome_text", "Course outcome", 1000],
              ["practice_text", "Practice instructions", 2000],
              ["indicator_text", "Observable indicator", 1200],
              ["artifact_text", "Expected evidence", 600],
              ["resource_url", "HTTPS course resource", 1000],
            ] as const
          ).map(([name, label, length]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                required
                maxLength={length}
                type={name === "resource_url" ? "url" : "text"}
              />
            </label>
          ))}
          <button className="btn primary" disabled={job.busy}>
            Publish practice
          </button>
          {job.message && <Notice>{job.message}</Notice>}
        </form>
      )}
    </PageSurface>
  );
}
