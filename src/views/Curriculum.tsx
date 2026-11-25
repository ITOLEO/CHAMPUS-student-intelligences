import { LearningMilestones } from "../components/LearningMilestones";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  BookOpen,
  Building2,
  ClipboardList,
  GraduationCap,
  Layers,
  Pencil,
  Radar,
} from "lucide-react";
import { check, requireDb } from "../data/client";
import { programName } from "../data/platform";
import { useBusy, useStore } from "../data/store";
import { Notice } from "../components/Layout";
type Role = "student" | "teacher" | "industry";
type Need = {
  id: string;
  title: string;
  context: string;
  indicator_id: string;
};
type Roster = {
  id: string;
  course: string;
  program: string;
  student_label: string;
};
type Task = {
  need_title: string;
  id: string;
  roster_id: string;
  title: string;
  brief: string;
  outcome: string;
  indicator_id: string;
};
const approaches = {
  Explore: "Try two approaches and compare the results.",
  Plan: "Write a short sequence of steps before you start.",
  Collaborate:
    "Ask a peer to discuss your approach before submitting your own work.",
  Reflect: "Keep a short note on what worked and what you would change.",
};
export function Preference() {
  const s = useStore(),
    job = useBusy(),
    [style, set] = useState(""),
    [type, setType] = useState(""),
    [ready, R] = useState(false),
    [error, E] = useState(false),
    [rev, retry] = useState(0);
  useEffect(() => {
    let active = true;
    E(false);
    R(false);
    requireDb()
      .from("learning_preferences")
      .select("work_style,personality_type")
      .eq("user_id", s.user!.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) {
          set(data?.work_style || "");
          setType(data?.personality_type || "");
          E(!!error);
          R(!error);
        }
      });
    return () => {
      active = false;
    };
  }, [s.user?.id, rev]);
  return (
    <form
      className="panel form"
      onSubmit={(e) => {
        e.preventDefault();
        job.run(async () => {
          const table = requireDb().from("learning_preferences");
          check(
            style || type
              ? await table.upsert({
                  user_id: s.user!.id,
                  work_style: style || null,
                  personality_type: type || null,
                })
              : await table.delete().eq("user_id", s.user!.id),
          );
        }, "Preference saved.");
      }}
    >
      <h2>Working style</h2>
      <p>
        Which approach would you like to try on your next task? This optional
        reflection is private and can change.
      </p>
      <label>
        Preferred approach
        <select
          value={style}
          disabled={!ready}
          onChange={(e) => set(e.target.value)}
        >
          <option value="">No preference</option>
          {Object.keys(approaches).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <label>
        Self-reported personality type
        <select
          disabled={!ready}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Prefer not to specify</option>
          {[
            "INTJ",
            "INTP",
            "ENTJ",
            "ENTP",
            "INFJ",
            "INFP",
            "ENFJ",
            "ENFP",
            "ISTJ",
            "ISFJ",
            "ESTJ",
            "ESFJ",
            "ISTP",
            "ISFP",
            "ESTP",
            "ESFP",
          ].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <small>
          Optional. Enter a type you already identify with. You can choose to
          share it with the AI advisor for one request.
        </small>
      </label>
      {style && <p>{approaches[style as keyof typeof approaches]}</p>}
      <button className="btn secondary" disabled={!ready || job.busy}>
        Save preference
      </button>
      {error && (
        <button type="button" onClick={() => retry((x) => x + 1)}>
          Retry loading preferences
        </button>
      )}
      {job.message && <Notice>{job.message}</Notice>}
    </form>
  );
}
export function Curriculum({
  role,
  overview = false,
}: {
  role: Role;
  overview?: boolean;
}) {
  const s = useStore();
  if ((role === "teacher" ? "campus" : role) !== s.workspace)
    return <Navigate replace to="/overview" />;
  return <Board key={role + s.user!.id} role={role} overview={overview} />;
}
function Board({ role, overview }: { role: Role; overview: boolean }) {
  const s = useStore(),
    job = useBusy();
  const [needs, N] = useState<Need[]>([]),
    [roster, R] = useState<Roster[]>([]),
    [tasks, T] = useState<Task[]>([]),
    [style, S] = useState(""),
    [rev, refresh] = useState(0),
    [loading, L] = useState(true),
    [error, E] = useState<"schema" | "load" | null>(null),
    [edit, Edit] = useState<Need | null>(null);
  useEffect(() => {
    let mounted = true;
    const db = requireDb();
    function industryQuery() {
      const q = db
        .from("industry_needs")
        .select("*")
        .eq("institution_id", s.institution);
      return role === "industry" ? q.eq("author_id", s.user!.id) : q;
    }
    L(true);
    E(null);
    const read = <T,>(result: { data: T; error: { code: string } | null }) => {
      if (result.error) throw result.error;
      return result.data;
    };
    (async () => {
      const [n, r, t, p] = await Promise.all([
        role === "student"
          ? []
          : industryQuery()
              .order("updated_at", { ascending: false })
              .then(read),
        role === "industry"
          ? []
          : db
              .from("teaching_roster")
              .select("*")
              .eq(role === "teacher" ? "teacher_id" : "student_id", s.user!.id)
              .then(read),
        role === "industry"
          ? []
          : db
              .from("curriculum_tasks")
              .select("*")
              .order("created_at", { ascending: false })
              .then(read),
        role === "student"
          ? db
              .from("learning_preferences")
              .select("work_style")
              .eq("user_id", s.user!.id)
              .maybeSingle()
              .then((result) => result.data)
          : null,
      ]);
      if (mounted) {
        N(n || []);
        R(r || []);
        T((t || []).filter((x) => r?.some((y) => y.id === x.roster_id)));
        S(p?.work_style || "");
      }
    })()
      .catch((failure: unknown) => {
        if (!mounted) return;
        const code =
          typeof failure === "object" && failure && "code" in failure
            ? failure.code
            : null;
        E(code === "PGRST205" || code === "42P01" ? "schema" : "load");
      })
      .finally(() => {
        if (mounted) L(false);
      });
    return () => {
      mounted = false;
    };
  }, [role, s.user?.id, s.institution, rev]);
  const teacher = role === "teacher",
    industry = role === "industry",
    Icon = teacher ? GraduationCap : industry ? Building2 : BookOpen;
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = Object.fromEntries(new FormData(form));
    job.run(
      async () => {
        const db = requireDb();
        if (industry) {
          const values = {
            title: data.title,
            context: data.context,
            indicator_id: data.indicator_id,
          };
          check(
            edit
              ? await db
                  .from("industry_needs")
                  .update(values)
                  .eq("id", edit.id)
                  .select("id")
                  .single()
              : await db
                  .from("industry_needs")
                  .insert({ ...values, institution_id: s.institution }),
          );
          Edit(null);
        } else {
          check(
            await db
              .from("curriculum_tasks")
              .insert({ ...data, institution_id: s.institution }),
          );
        }
        form.reset();
        refresh((x) => x + 1);
      },
      industry ? "Industry need saved." : "Task assigned.",
    );
  }
  const taskState = (task: Task) => {
    const work = s.evidence.filter((e) => e.task_id === task.id);
    if (work.some((e) => e.reviews.some((r) => r.decision === "Verified")))
      return "Verified";
    if (work.some((e) => !e.reviews.length)) return "Submitted for review";
    if (work.length) return "Revision requested";
    return "Assigned";
  };
  const next =
    role === "student"
      ? tasks.find((t) => taskState(t) === "Revision requested") ||
        tasks.find((t) => taskState(t) === "Assigned")
      : null;
  return (
    <>
      <div className="overline">
        <Icon size={17} />
        {teacher ? "Campus" : role} workspace
      </div>
      <h1 className="page-title">
        {teacher
          ? "Campus dashboard"
          : industry
            ? "Industry desk"
            : overview
              ? "Student overview"
              : "My learning plan"}
      </h1>
      <p className="lede">
        {teacher
          ? "Translate workforce needs into practice within each learner’s course."
          : industry
            ? "Describe the capabilities your teams need in practice."
            : "Follow your course outcomes, practise one skill and submit evidence."}
      </p>
      {overview && role === "student" && (
        <p className="placement-line">
          <GraduationCap size={16} />
          {programName(s.profile.program)} · Cohort{" "}
          {s.cohort || "awaiting placement"}
        </p>
      )}
      <nav className="action-strip" aria-label="Workspace actions">
        {role !== "industry" && (
          <Link to="/programs">
            <BookOpen />
            Course guide
          </Link>
        )}
        {teacher && (
          <Link to="/progress">
            <GraduationCap />
            Class progress
          </Link>
        )}
        {role !== "student" && (
          <Link to="/partnerships">
            <Building2 />
            Partnerships
          </Link>
        )}
        {role !== "industry" && (
          <Link to="/guidance">
            <ClipboardList />
            Learning guidance
          </Link>
        )}
        <Link to="/advisor">
          <Layers />
          AI advisor
        </Link>
      </nav>
      {role === "student" && <LearningMilestones />}
      {loading ? (
        <Notice>Loading workspace…</Notice>
      ) : error ? (
        <section className="panel curriculum-unavailable">
          <h2>
            {error === "schema"
              ? "Course workspace needs setup"
              : "Course workspace is temporarily unavailable"}
          </h2>
          <p>
            {error === "schema"
              ? "Ask your institution administrator to finish the agile curriculum database setup."
              : "Try again to reload assignments and industry needs."}
          </p>
          <button
            className="btn secondary"
            onClick={() => refresh((x) => x + 1)}
          >
            Retry
          </button>
        </section>
      ) : (
        <>
          <div className="curr-stats">
            {(industry
              ? [
                  [Radar, "Published needs", needs.length],
                  [
                    Layers,
                    "Skills requested",
                    new Set(needs.map((n) => n.indicator_id)).size,
                  ],
                ]
              : teacher
                ? [
                    [Radar, "Industry needs", needs.length],
                    [GraduationCap, "Course enrollments", roster.length],
                    [ClipboardList, "Assigned tasks", tasks.length],
                  ]
                : [
                    [
                      BookOpen,
                      "Courses",
                      new Set(roster.map((r) => r.course)).size,
                    ],
                    [ClipboardList, "Assigned tasks", tasks.length],
                    [Layers, "Submitted artifacts", s.evidence.length],
                  ]
            ).map(([I, title, value]) => {
              const Glyph = I as typeof Radar;
              return (
                <div key={String(title)}>
                  <Glyph size={20} />
                  <b>{String(value)}</b>
                  <span>{String(title)}</span>
                </div>
              );
            })}
          </div>
          {next && (
            <section className="panel focus-task">
              <div className="overline">
                <ClipboardList size={16} />
                Next course action
              </div>
              <h2>{next.title}</h2>
              <p>
                {taskState(next) === "Revision requested"
                  ? "Your teacher requested a revision. Use the feedback to prepare a new submission."
                  : "Your teacher assigned this task to support the course outcome: " +
                    next.outcome}
              </p>
              <Link
                className="btn primary"
                to={"/learning/" + next.indicator_id + "?task=" + next.id}
              >
                Open practice
              </Link>
            </section>
          )}
          <div className="curr-columns">
            <section className="panel">
              <h2>{role === "student" ? "Course tasks" : "Industry needs"}</h2>
              {role !== "student" ? (
                needs.length ? (
                  needs.map((n) => (
                    <article className="curr-row" key={n.id}>
                      <strong>{n.title}</strong>
                      <p>{n.context}</p>
                      <small>{s.skills[n.indicator_id]?.title}</small>
                      {industry && (
                        <button className="text-btn" onClick={() => Edit(n)}>
                          <Pencil size={14} />
                          Edit
                        </button>
                      )}
                    </article>
                  ))
                ) : (
                  <p>No industry needs published yet.</p>
                )
              ) : tasks.length ? (
                tasks.map((t) => {
                  const r = roster.find((r) => r.id === t.roster_id);
                  return (
                    <article className="curr-row" key={t.id}>
                      <small>
                        {r?.program} · {r?.course}
                      </small>
                      <h3>{t.title}</h3>
                      <p>Industry need · {t.need_title}</p>
                      <strong>Course outcome</strong>
                      <p>{t.outcome}</p>
                      <p>{t.brief}</p>
                      <small>{taskState(t)}</small>
                      <Link
                        to={"/learning/" + t.indicator_id + "?task=" + t.id}
                      >
                        Open task and evidence
                      </Link>
                    </article>
                  );
                })
              ) : (
                <p>
                  Your teacher’s assignments appear here after course
                  enrollment.
                </p>
              )}
            </section>
            {role === "student" ? (
              <section className="panel">
                <h2>Practice approach</h2>
                <p>
                  {approaches[style as keyof typeof approaches] ||
                    "Choose how you like to start a task."}
                </p>
                <Link to="/profile">My working style</Link>
                <hr />
                <Link to="/skills">Browse skill indicators</Link>
              </section>
            ) : teacher && !s.roles.includes("teacher") ? (
              <section className="panel">
                <h2>Campus review</h2>
                <p>
                  Open the review and curation tools assigned to your account.
                </p>
                <Link to="/staff">Open review and curation</Link>
              </section>
            ) : (
              <form
                key={edit?.id || "new"}
                className="form panel"
                onSubmit={save}
              >
                <h2>
                  {teacher
                    ? "Assign course practice"
                    : edit
                      ? "Edit industry need"
                      : "Publish a need"}
                </h2>
                {teacher && (
                  <>
                    <label>
                      Industry need
                      <select required name="need_id" defaultValue="">
                        <option value="">Choose a need</option>
                        {needs.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Course enrollment
                      <select required name="roster_id" defaultValue="">
                        <option value="">Choose a learner and course</option>
                        {roster.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.student_label} · {r.program} · {r.course}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <label>
                  Title
                  <input
                    name="title"
                    required
                    maxLength={160}
                    defaultValue={edit?.title}
                  />
                </label>
                <label>
                  Skill indicator
                  <select
                    required
                    name="indicator_id"
                    defaultValue={edit?.indicator_id || ""}
                  >
                    <option value="">Choose an indicator</option>
                    {Object.values(s.skills).map((k) => (
                      <option value={k.id} key={k.id}>
                        {k.title}
                      </option>
                    ))}
                  </select>
                </label>
                {teacher && (
                  <label>
                    Formal course outcome
                    <input required name="outcome" maxLength={1200} />
                  </label>
                )}
                <label>
                  {teacher ? "Task and expected evidence" : "Workplace context"}
                  <textarea
                    required
                    name={teacher ? "brief" : "context"}
                    maxLength={teacher ? 2400 : 1600}
                    defaultValue={edit?.context}
                  />
                </label>
                {teacher && !roster.length && (
                  <p>
                    A campus administrator must register your course enrollments
                    first.
                  </p>
                )}
                <button
                  className="btn primary"
                  disabled={
                    job.busy || (teacher && (!needs.length || !roster.length))
                  }
                >
                  {teacher
                    ? "Assign task"
                    : edit
                      ? "Save changes"
                      : "Publish need"}
                </button>
                {edit && (
                  <button type="button" onClick={() => Edit(null)}>
                    Cancel
                  </button>
                )}
                {job.message && <Notice>{job.message}</Notice>}
              </form>
            )}
          </div>
          {teacher && (
            <section className="panel">
              <h2>Assigned practice</h2>
              {tasks.length ? (
                tasks.map((t) => (
                  <p key={t.id}>
                    {t.title} ·{" "}
                    {roster.find((r) => r.id === t.roster_id)?.student_label}
                  </p>
                ))
              ) : (
                <p>No tasks assigned yet.</p>
              )}
              <Link to="/staff">Review submitted evidence</Link>
            </section>
          )}
        </>
      )}
    </>
  );
}
