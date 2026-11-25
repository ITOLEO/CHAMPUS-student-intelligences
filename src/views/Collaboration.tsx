import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { requireDb } from "../data/client";
import { postAction, readRows, useRecords } from "../data/platform";
import { useStore, useBusy } from "../data/store";
import { Notice } from "../components/Layout";

function Loading({ error, retry }: { error: string; retry: () => void }) {
  return (
    <Notice>
      {error || "Loading records…"}{" "}
      {error && <button onClick={retry}>Try again</button>}
    </Notice>
  );
}
export function Partnerships() {
  const s = useStore(),
    industry = s.workspace === "industry",
    job = useBusy();
  const records = useRecords(
    async () =>
      readRows(
        await requireDb()
          .from("partner_briefs")
          .select("*")
          .eq("institution_id", s.institution)
          .order("created_at", { ascending: false }),
      ),
    [s.institution, s.workspace],
  );
  const partners = useRecords(
    async () =>
      industry
        ? []
        : readRows(
            await requireDb()
              .from("partner_profiles")
              .select("user_id,name,sector,description")
              .eq("institution_id", s.institution)
              .order("name"),
          ),
    [industry, s.institution],
  );
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fields = Object.fromEntries(new FormData(form));
    job.run(async () => {
      readRows(
        await requireDb()
          .from("partner_briefs")
          .insert({ ...fields, institution_id: s.institution }),
      );
      form.reset();
      records.reload();
    }, "Brief sent to the campus team.");
  }
  return (
    <>
      <p className="overline">{industry ? "Industry" : "Campus"} workspace</p>
      <h1 className="page-title">Partnerships</h1>
      <p className="lede">
        {industry
          ? "Propose a project, placement or curriculum update. Follow the campus response here."
          : "Review workplace proposals and record the next step with each partner."}
      </p>
      {!industry && partners.error && (
        <Loading error={partners.error} retry={partners.reload} />
      )}
      {!industry && !!partners.data?.length && (
        <section className="panel">
          <h2>Partner directory</h2>
          {partners.data.map((p) => (
            <p className="curr-row" key={p.user_id}>
              <strong>{p.name}</strong> · {p.sector}
              <br />
              {p.description}
            </p>
          ))}
        </section>
      )}
      {industry && (
        <form className="form panel" onSubmit={submit}>
          <h2>New partner brief</h2>
          <label>
            Organization
            <input name="organization" maxLength={120} required />
          </label>
          <label>
            Type
            <select name="kind">
              {["Project", "Placement", "Curriculum input"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input name="title" maxLength={160} required />
          </label>
          <label>
            Workplace task and expected result
            <textarea name="brief" maxLength={2400} required />
          </label>
          <button className="btn primary" disabled={job.busy}>
            Submit brief
          </button>
        </form>
      )}
      {job.message && <Notice>{job.message}</Notice>}
      {!records.data ? (
        <Loading error={records.error} retry={records.reload} />
      ) : records.data.length === 0 ? (
        <p className="panel">Submitted partner briefs will appear here.</p>
      ) : (
        records.data.map((x) => (
          <article className="panel" key={x.id}>
            <p className="overline">
              {x.kind} · {x.status}
            </p>
            <h2>{x.title}</h2>
            <p>{x.organization}</p>
            <p>{x.brief}</p>
            {x.response && (
              <p>
                <strong>Campus response</strong> · {x.response}
              </p>
            )}
            {!industry && (
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fields = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  job.run(async () => {
                    readRows(
                      await requireDb()
                        .from("partner_briefs")
                        .update(fields)
                        .eq("id", x.id)
                        .select("id")
                        .single(),
                    );
                    records.reload();
                  }, "Response saved.");
                }}
              >
                <label>
                  Status
                  <select defaultValue={x.status} name="status">
                    {["Submitted", "In discussion", "Accepted", "Closed"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Next step
                  <textarea
                    name="response"
                    defaultValue={x.response}
                    required
                    maxLength={1600}
                  />
                </label>
                <button className="btn secondary" disabled={job.busy}>
                  Save response
                </button>
              </form>
            )}
          </article>
        ))
      )}
    </>
  );
}

export function Advisor() {
  const s = useStore(),
    job = useBusy(),
    [question, setQuestion] = useState(""),
    [withContext, consent] = useState(false),
    [shareType, setShareType] = useState(false);
  const chat = useRecords(
    async () =>
      readRows(
        await requireDb()
          .from("advisor_turns")
          .select("id,question,answer,status,created_at,progress_snapshot")
          .eq("user_id", s.user!.id)
          .order("created_at", { ascending: false })
          .limit(40),
      ).reverse(),
    [s.user?.id],
  );
  const prompts =
    s.workspace === "student"
      ? [
          "What should I practise next for my goal?",
          "Explain one idea from my course.",
        ]
      : s.workspace === "campus"
        ? [
            "Help me design an observable indicator.",
            "How can I give specific feedback?",
          ]
        : [
            "Turn a workplace need into a practice brief.",
            "What evidence could show this skill?",
          ];
  async function send(e: FormEvent) {
    e.preventDefault();
    await job.run(async () => {
      try {
        await postAction("advisor", {
          question,
          includeContext: withContext,
          shareType: withContext && shareType,
        });
        setQuestion("");
        consent(false);
        setShareType(false);
      } finally {
        chat.reload();
      }
    });
  }
  return (
    <>
      <p className="overline">{s.workspace} workspace</p>
      <h1 className="page-title">AI advisor</h1>
      <p className="lede">
        {s.workspace === "student"
          ? "Discuss a course, your goal and a next action. You choose what to send to your lecturer."
          : s.workspace === "campus"
            ? "Develop a practice brief or ask for feedback on a teaching approach."
            : "Translate a workplace problem into a clear skill request for the campus."}
      </p>
      <div className="advisor-history" aria-label="Private conversation">
        {!chat.data ? (
          <Loading error={chat.error} retry={chat.reload} />
        ) : (
          chat.data.map((t) => (
            <article key={t.id} className="panel">
              <strong>You</strong>
              <p className="chat-message">{t.question}</p>
              <strong>CHAMPUS advisor</strong>
              <p className="chat-message">
                {t.answer ||
                  (t.status === "failed"
                    ? "A response was unavailable."
                    : "No completed reply yet.")}
              </p>
              {t.progress_snapshot && (
                <p className="muted">
                  At this recommendation ·{" "}
                  {t.progress_snapshot.completedResources} resources completed ·{" "}
                  {t.progress_snapshot.submissions} evidence submissions ·{" "}
                  {t.progress_snapshot.verified} verified
                </p>
              )}
              {s.workspace === "student" && t.answer && (
                <Link to={"/guidance?turn=" + t.id}>
                  Prepare for lecturer review
                </Link>
              )}
            </article>
          ))
        )}
      </div>
      <form className="panel form" onSubmit={send}>
        <h2>Ask a question</h2>
        <div className="pills">
          {prompts.map((p) => (
            <button
              type="button"
              key={p}
              className="pill"
              onClick={() => setQuestion(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <label>
          Message
          <textarea
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={2500}
          />
        </label>
        <label className="check-line">
          <input
            type="checkbox"
            checked={withContext}
            onChange={(e) => {
              consent(e.target.checked);
              if (!e.target.checked) setShareType(false);
            }}
          />
          {s.workspace === "student"
            ? "Include my goal, working preference, assigned tasks and recorded progress in this request."
            : "Include the workplace needs visible to my account."}
        </label>
        {s.workspace === "student" && withContext && (
          <label className="check-line">
            <input
              type="checkbox"
              checked={shareType}
              onChange={(e) => setShareType(e.target.checked)}
            />
            Also share my optional self-reported personality type as a
            reflection prompt.
          </label>
        )}
        <small>
          Gemini receives your question, course topics and recent replies that
          match your sharing choices. Keep names and private records out of your
          message. Your chat stays private inside CHAMPUS.
        </small>
        <button className="btn primary" disabled={job.busy || !question.trim()}>
          {job.busy ? "Preparing answer…" : "Send question"}
        </button>
        {job.message && <Notice>{job.message}</Notice>}
      </form>
    </>
  );
}

export function Guidance() {
  const s = useStore(),
    student = s.workspace === "student",
    job = useBusy(),
    [params] = useSearchParams();
  const turn = student ? params.get("turn") : null;
  const records = useRecords(async () => {
    const db = requireDb();
    const [roster, requests, draft] = await Promise.all([
      db
        .from("teaching_roster")
        .select("*")
        .eq(student ? "student_id" : "teacher_id", s.user!.id)
        .order("course"),
      db
        .from("guidance_requests")
        .select("*")
        .order("created_at", { ascending: false }),
      turn
        ? db
            .from("advisor_turns")
            .select("answer")
            .eq("user_id", s.user!.id)
            .eq("id", turn)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    return {
      roster: readRows(roster),
      requests: readRows(requests),
      draft: readRows(draft)?.answer as string | undefined,
    };
  }, [s.user?.id, turn, student]);
  return (
    <>
      <p className="overline">{student ? "Student" : "Campus"} workspace</p>
      <h1 className="page-title">Learning guidance</h1>
      <p className="lede">
        {student
          ? "Send one proposed next step to a lecturer on your roster. Edit the text before you share it."
          : "Review a learner’s proposed next step and explain what they should practise."}
      </p>
      {!records.data ? (
        <Loading error={records.error} retry={records.reload} />
      ) : (
        <>
          {student &&
            (records.data.roster.length ? (
              <form
                className="panel form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    fields = Object.fromEntries(new FormData(form));
                  job.run(async () => {
                    readRows(
                      await requireDb()
                        .from("guidance_requests")
                        .insert({
                          ...fields,
                          source: records.data?.draft ? "AI draft" : "Student",
                        }),
                    );
                    form.reset();
                    records.reload();
                  }, "Shared with your course lecturer.");
                }}
              >
                <label>
                  Course and lecturer
                  <select required name="roster_id" defaultValue="">
                    <option value="">Choose a course enrollment</option>
                    {records.data.roster.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.course} · {r.program}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Proposal visible to your lecturer
                  <textarea
                    required
                    maxLength={4200}
                    rows={6}
                    name="proposal"
                    defaultValue={records.data.draft?.slice(0, 4200) || ""}
                  />
                </label>
                <button className="btn primary" disabled={job.busy}>
                  Send for review
                </button>
              </form>
            ) : (
              <p className="panel">
                Ask your administrator to connect your lecturer and course
                before you request review.
              </p>
            ))}
          {records.data.requests.length === 0 && (
            <p className="panel">No guidance requests yet.</p>
          )}
          {records.data.requests.map((r) => (
            <article className="panel" key={r.id}>
              <p className="overline">
                {r.source} · {r.decision}
              </p>
              <h2>
                {records.data?.roster.find((e) => e.id === r.roster_id)?.course}
              </h2>
              <p className="chat-message">{r.proposal}</p>
              {r.feedback && (
                <p>
                  <strong>Lecturer feedback</strong> · {r.feedback}
                </p>
              )}
              {!student && (
                <form
                  className="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = Object.fromEntries(new FormData(e.currentTarget));
                    job.run(async () => {
                      readRows(
                        await requireDb()
                          .from("guidance_requests")
                          .update(v)
                          .eq("id", r.id)
                          .select("id")
                          .single(),
                      );
                      records.reload();
                    }, "Guidance saved.");
                  }}
                >
                  <label>
                    Decision
                    <select
                      name="decision"
                      defaultValue={
                        r.decision === "Revise" ? "Revise" : "Recommended"
                      }
                    >
                      <option>Recommended</option>
                      <option>Revise</option>
                    </select>
                  </label>
                  <label>
                    Reason and next action
                    <textarea
                      name="feedback"
                      maxLength={2000}
                      required
                      defaultValue={r.feedback}
                    />
                  </label>
                  <button className="btn secondary" disabled={job.busy}>
                    Send feedback
                  </button>
                </form>
              )}
            </article>
          ))}
        </>
      )}
      {job.message && <Notice>{job.message}</Notice>}
    </>
  );
}

export function ClassProgress() {
  const s = useStore(),
    [cohort, chooseCohort] = useState("");
  const load = useRecords(async () => {
    const db = requireDb(),
      [r, t, e] = await Promise.all([
        db.rpc("teaching_placements"),
        db.from("curriculum_tasks").select("id,roster_id,title"),
        db.from("evidence").select("task_id,reviews(decision)"),
      ]);
    return {
      roster: readRows(r) as {
        id: string;
        student_label: string;
        program: string;
        course: string;
        cohort: number | null;
      }[],
      tasks: readRows(t),
      evidence: readRows(e),
    };
  }, [s.user?.id]);
  return (
    <>
      <p className="overline">Campus workspace</p>
      <h1 className="page-title">Class progress</h1>
      <p className="lede">
        Follow assigned tasks and the evidence each learner submits.
      </p>
      <label className="program-select">
        Cohort
        <select value={cohort} onChange={(e) => chooseCohort(e.target.value)}>
          <option value="">All cohorts</option>
          {[1, 2, 3, 4].map((v) => (
            <option key={v} value={v}>
              Cohort {v}
            </option>
          ))}
        </select>
      </label>
      {load.data &&
        cohort &&
        !load.data.roster.some((r) => String(r.cohort) === cohort) && (
          <p>No assigned learners in this cohort.</p>
        )}
      {!load.data ? (
        <Loading error={load.error} retry={load.reload} />
      ) : load.data.roster.length === 0 ? (
        <p className="panel">
          Your administrator can assign learners to your courses.
        </p>
      ) : (
        load.data.roster
          .filter((r) => !cohort || String(r.cohort) === cohort)
          .map((r) => (
            <section className="panel" key={r.id}>
              <h2>{r.student_label}</h2>
              <p>
                {r.course} · {r.program}
              </p>
              {!load.data!.tasks.some((t) => t.roster_id === r.id) && (
                <p>No tasks assigned.</p>
              )}
              {load
                .data!.tasks.filter((t) => t.roster_id === r.id)
                .map((t) => {
                  const submissions = load.data!.evidence.filter(
                      (e) => e.task_id === t.id,
                    ),
                    reviews = submissions.flatMap((e) => e.reviews || []);
                  return (
                    <p className="curr-row" key={t.id}>
                      {t.title} ·{" "}
                      {reviews.some((v) => v.decision === "Verified")
                        ? "Verified"
                        : submissions.some((e) => !e.reviews?.length)
                          ? "Awaiting review"
                          : submissions.length
                            ? "Revision requested"
                            : "Assigned"}
                    </p>
                  );
                })}
            </section>
          ))
      )}
      <Link to="/staff">Open evidence review</Link>
    </>
  );
}

export function Organization() {
  const s = useStore(),
    job = useBusy();
  const records = useRecords<
    Partial<{ name: string; sector: string; description: string }>
  >(
    async () =>
      readRows(
        await requireDb()
          .from("partner_profiles")
          .select("*")
          .eq("user_id", s.user!.id)
          .maybeSingle(),
      ) || {},
    [s.user?.id],
  );
  return (
    <>
      <p className="overline">Industry workspace</p>
      <h1 className="page-title">Organization profile</h1>
      <p className="lede">
        Give the campus team context for your proposals and the kind of work
        your organization does.
      </p>
      {!records.data ? (
        <Loading error={records.error} retry={records.reload} />
      ) : (
        <form
          className="panel form"
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            job.run(async () => {
              readRows(
                await requireDb()
                  .from("partner_profiles")
                  .upsert({
                    user_id: s.user!.id,
                    institution_id: s.institution,
                    ...values,
                  }),
              );
              records.reload();
            }, "Organization profile saved.");
          }}
        >
          <label>
            Organization name
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={records.data.name}
            />
          </label>
          <label>
            Sector
            <input
              name="sector"
              required
              maxLength={120}
              defaultValue={records.data.sector}
            />
          </label>
          <label>
            Work and collaboration interests
            <textarea
              name="description"
              required
              maxLength={1400}
              defaultValue={records.data.description}
            />
          </label>
          <button className="btn primary" disabled={job.busy}>
            Save organization
          </button>
        </form>
      )}
      {job.message && <Notice>{job.message}</Notice>}
    </>
  );
}
