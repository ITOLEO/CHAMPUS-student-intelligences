import { useSearchParams, Link } from "react-router-dom";
import { useStore } from "../data/store";
import { requireDb } from "../data/client";
import { readRows, useRecords, programName } from "../data/platform";
import { Notice } from "../components/Layout";

export function CourseMap() {
  const s = useStore(),
    [params, setParams] = useSearchParams(),
    student = s.workspace === "student";
  const rows = useRecords(async () => {
    const db = requireDb();
    const [roster, tasks, submissions] = await Promise.all([
      db
        .from("teaching_roster")
        .select("id,course,student_label,program")
        .eq(student ? "student_id" : "teacher_id", s.user!.id),
      db
        .from("curriculum_tasks")
        .select("id,roster_id,title,outcome,need_title,indicator_id")
        .order("created_at", { ascending: false }),
      db
        .from("evidence")
        .select("id,task_id,title,reviews(decision,feedback)")
        .not("task_id", "is", null),
    ]);
    return {
      roster: readRows(roster),
      tasks: readRows(tasks),
      submissions: readRows(submissions),
    };
  }, [s.user?.id, student]);
  const courses = Array.from(
    new Set(rows.data?.roster.map((r) => String(r.course)) || []),
  ).sort();
  const selection = params.get("course") || courses[0];
  const matching =
    rows.data?.roster.filter((r) => r.course === selection) || [];
  const tasks =
    rows.data?.tasks.filter((t) =>
      matching.some((r) => r.id === t.roster_id),
    ) || [];
  return (
    <>
      <p className="overline">Curriculum</p>
      <h1 className="page-title">Course knowledge map</h1>
      <p className="lede">
        Trace the connection between a formal course, a workplace need, assessed
        practice and student evidence.
      </p>
      {!rows.data ? (
        <Notice>
          {rows.error || "Loading course links…"}{" "}
          {rows.error && <button onClick={rows.reload}>Retry</button>}
        </Notice>
      ) : !courses.length ? (
        <section className="panel">
          <h2>No course enrollment yet</h2>
          <p>
            Your mapped coursework appears here when an administrator assigns a
            lecturer and course.
          </p>
          <Link to="/programs">Explore the practice guide</Link>
        </section>
      ) : (
        <>
          <label className="program-select">
            Course
            <select
              value={selection}
              onChange={(e) => setParams({ course: e.target.value })}
            >
              {courses.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          {!tasks.length && (
            <p className="panel">This course has no assigned practice yet.</p>
          )}
          {tasks.map((t) => {
            const roster = matching.find((r) => r.id === t.roster_id)!,
              skill = s.skills[t.indicator_id],
              work = rows.data!.submissions.filter((e) => e.task_id === t.id);
            return (
              <article className="panel" key={t.id}>
                <p className="overline">
                  {programName(roster.program)} · {roster.student_label}
                </p>
                <h2>{t.title}</h2>
                <dl className="trace-map">
                  <dt>Course</dt>
                  <dd>{roster.course}</dd>
                  <dt>Learning outcome</dt>
                  <dd>{t.outcome}</dd>
                  <dt>Workplace need</dt>
                  <dd>{t.need_title}</dd>
                  <dt>Competency cluster</dt>
                  <dd>{skill?.cluster}</dd>
                  <dt>Specific skill</dt>
                  <dd>{skill?.specificSkill}</dd>
                  <dt>Micro-skill</dt>
                  <dd>
                    <Link
                      to={
                        "/learning/" +
                        t.indicator_id +
                        (student ? "?task=" + t.id : "")
                      }
                    >
                      {skill?.title || t.indicator_id}
                    </Link>
                  </dd>
                  <dt>Observable indicator</dt>
                  <dd>{skill?.indicator}</dd>
                  <dt>Evidence and review</dt>
                  <dd>
                    {work.length
                      ? work.map((e) => (
                          <p key={e.id}>
                            {e.title} ·{" "}
                            {[e.reviews]
                              .flat()
                              .filter(Boolean)
                              .map((r) => r.decision)
                              .join(", ") || "Awaiting review"}
                          </p>
                        ))
                      : "No submission yet."}
                  </dd>
                </dl>
              </article>
            );
          })}
        </>
      )}
    </>
  );
}
