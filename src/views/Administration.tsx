import { useState, type FormEvent } from "react";
import { useStore, useBusy } from "../data/store";
import {
  programs,
  programName,
  readRows,
  postAction,
  useRecords,
} from "../data/platform";
import { requireDb } from "../data/client";
import { Notice } from "../components/Layout";
type Account = {
  user_id: string;
  name: string;
  email: string;
  workspace: string | null;
  program: string;
  cohort: number | null;
  enabled: boolean;
};
function Placement({
  program = "bizai",
  cohort = 1,
}: {
  program?: string;
  cohort?: number;
}) {
  return (
    <div className="form-pair">
      <label>
        Program
        <select name="program" defaultValue={program}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cohort
        <select name="cohort" defaultValue={cohort}>
          {[1, 2, 3, 4].map((v) => (
            <option key={v} value={v}>
              Cohort {v}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
function DemoDirectory() {
  const [offset, setOffset] = useState(0);
  const records = useRecords(
    async () =>
      readRows(
        await requireDb().rpc("demo_directory", { page_offset: offset }),
      ) as {
        name: string;
        email: string;
        workspace: string;
        preview_id: string;
      }[],
    [offset],
  );
  return (
    <section className="panel">
      <h2>Demo accounts</h2>
      <p>Accounts with the same preview ID share a sample project.</p>
      {records.error && (
        <Notice>
          {records.error} <button onClick={records.reload}>Retry</button>
        </Notice>
      )}
      {records.data?.length === 0 && <p>No preview accounts on this page.</p>}
      {records.data?.map((a) => (
        <article className="curr-row" key={a.email}>
          <strong>{a.name}</strong>
          <span>{a.email}</span>
          <small>
            Preview {a.preview_id.slice(0, 8)} · {a.workspace}
          </small>
        </article>
      ))}
      <div className="buttons">
        <button type="button" onClick={records.reload}>
          Refresh
        </button>
        <button disabled={!offset} onClick={() => setOffset(offset - 30)}>
          Previous
        </button>
        <button
          disabled={records.data?.length !== 30}
          onClick={() => setOffset(offset + 30)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
export function Administration() {
  const s = useStore(),
    job = useBusy(),
    [kind, setKind] = useState("student"),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState("");
  const records = useRecords(async () => {
    const db = requireDb();
    const [accounts, events, roster] = await Promise.all([
      db.rpc("account_directory"),
      db
        .from("account_events")
        .select("id,target_id,event,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("teaching_roster")
        .select("id,student_label,course,teacher_id")
        .eq("institution_id", s.institution)
        .order("course"),
    ]);
    return {
      accounts: readRows(accounts) as Account[],
      events: readRows(events),
      roster: readRows(roster),
    };
  }, [s.institution]);
  const accounts = records.data?.accounts || [];
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form));
    job.run(async () => {
      await postAction("accounts", {
        ...values,
        workspace: kind,
        cohort: Number(values.cohort),
      });
      form.reset();
      setKind("student");
      records.reload();
    }, "Account created. Give the account holder their credentials through your campus channel.");
  }
  return (
    <>
      <p className="overline">Administration</p>
      <h1 className="page-title">Account administration</h1>
      <p className="lede">
        Create a workspace, place a student in a cohort and connect a lecturer
        to a course.
      </p>
      {records.error && (
        <Notice>
          {records.error} <button onClick={records.reload}>Retry</button>
        </Notice>
      )}
      <div className="curr-columns">
        <form className="panel form" onSubmit={create}>
          <h2>Create account</h2>
          <label>
            Full name
            <input name="name" maxLength={100} required />
          </label>
          <label>
            Institution email
            <input name="email" type="email" autoComplete="off" required />
          </label>
          <label>
            Initial password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <label>
            Workspace
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="student">Student</option>
              <option value="campus">Campus lecturer</option>
              <option value="industry">Industry partner</option>
            </select>
          </label>
          {kind === "student" && <Placement />}
          <button className="btn primary" disabled={job.busy || !records.data}>
            Create account
          </button>
        </form>
        <form
          className="panel form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget,
              values = Object.fromEntries(new FormData(form));
            job.run(async () => {
              readRows(await requireDb().rpc("assign_enrollment", values));
              form.reset();
              records.reload();
            }, "Enrollment saved.");
          }}
        >
          <h2>Assign a course</h2>
          {(["teacher", "student"] as const).map((w) => (
            <label key={w}>
              {w === "teacher" ? "Lecturer" : "Student"}
              <select name={w} required defaultValue="">
                <option value="">Choose an account</option>
                {accounts
                  .filter(
                    (a) =>
                      a.enabled &&
                      a.workspace === (w === "teacher" ? "campus" : "student"),
                  )
                  .map((a) => (
                    <option key={a.user_id} value={a.user_id}>
                      {a.name} · {a.email}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          <label>
            Course
            <input
              required
              name="subject"
              maxLength={160}
              list="subject-options"
            />
          </label>
          <datalist id="subject-options">
            {programs
              .flatMap((p) => p.courses)
              .map((c) => (
                <option value={c.title} key={c.id} />
              ))}
          </datalist>
          <button
            className="btn secondary"
            disabled={job.busy || !records.data}
          >
            Save enrollment
          </button>
          {records.data?.roster.map((r) => (
            <p key={r.id}>
              {r.student_label} · {r.course}
            </p>
          ))}
        </form>
      </div>
      {job.message && <Notice>{job.message}</Notice>}
      <section className="panel">
        <h2>Account directory</h2>
        <input
          className="directory-search"
          placeholder="Find a name or email"
          aria-label="Search accounts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {records.data &&
          !accounts.filter((a) =>
            (a.name + " " + a.email)
              .toLowerCase()
              .includes(query.toLowerCase()),
          ).length && <p>No accounts match.</p>}
        {accounts
          .filter((a) =>
            (a.name + " " + a.email)
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((a) => (
            <article className="curr-row" key={a.user_id}>
              <strong>{a.name || a.email}</strong>
              <p>
                {a.email} · {a.workspace || "Awaiting approval"} ·{" "}
                {a.enabled ? "Active" : "Suspended"}{" "}
                {a.cohort
                  ? "· " + programName(a.program) + " · Cohort " + a.cohort
                  : ""}
              </p>
              {a.workspace !== "admin" && (
                <button
                  className="text-btn"
                  onClick={() =>
                    setEditing(editing === a.user_id ? "" : a.user_id)
                  }
                >
                  {a.workspace ? "Manage access" : "Approve existing student"}
                </button>
              )}
              {editing === a.user_id && (
                <form
                  className="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = Object.fromEntries(new FormData(e.currentTarget));
                    job.run(async () => {
                      if (!a.workspace) {
                        readRows(
                          await requireDb().rpc("approve_legacy_student", {
                            target: a.user_id,
                            assigned_program: v.program,
                            assigned_cohort: Number(v.cohort),
                          }),
                        );
                      } else
                        readRows(
                          await requireDb().rpc("manage_account", {
                            target: a.user_id,
                            active: v.enabled === "yes",
                            assigned_program: v.program || null,
                            assigned_cohort: v.cohort ? Number(v.cohort) : null,
                          }),
                        );
                      setEditing("");
                      records.reload();
                    }, "Account updated.");
                  }}
                >
                  {(!a.workspace || a.workspace === "student") && (
                    <Placement program={a.program} cohort={a.cohort || 1} />
                  )}
                  {a.workspace && (
                    <label>
                      Access
                      <select
                        name="enabled"
                        defaultValue={a.enabled ? "yes" : "no"}
                      >
                        <option value="yes">Active</option>
                        <option value="no">Suspended</option>
                      </select>
                    </label>
                  )}
                  <button className="btn secondary" disabled={job.busy}>
                    Save access
                  </button>
                </form>
              )}
            </article>
          ))}
      </section>
      <DemoDirectory />
      <section className="panel">
        <h2>Access history</h2>
        {records.data?.events.length === 0 && (
          <p>Account changes will appear here.</p>
        )}
        {records.data?.events.map((e) => (
          <p className="curr-row" key={e.id}>
            {e.event} ·{" "}
            {accounts.find((a) => a.user_id === e.target_id)?.name || "Account"}{" "}
            · {new Date(e.created_at).toLocaleString()}
          </p>
        ))}
      </section>
    </>
  );
}
