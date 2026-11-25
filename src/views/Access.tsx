import { Link, Navigate, useNavigate } from "react-router-dom";
import { BookOpen, BriefcaseBusiness, GraduationCap } from "lucide-react";
import { useEffect } from "react";
import { useStore, useBusy } from "../data/store";
import { previewMode, requireDb } from "../data/client";
import { homeFor } from "../data/platform";
import { Notice } from "../components/Layout";

export function AccountStatus() {
  const s = useStore(),
    job = useBusy(),
    navigate = useNavigate();
  if (s.authLoading)
    return (
      <main id="main" className="wrap section">
        <Notice>Checking access…</Notice>
      </main>
    );
  if (!s.sessionUser) return <Navigate replace to="/sign-in" />;
  if (s.user) return <Navigate replace to={homeFor(s.workspace)} />;
  return (
    <main id="main" className="wrap section">
      <section className="panel">
        <h1>
          {s.accountError
            ? "Status unavailable"
            : "Your workspace is awaiting activation"}
        </h1>
        <p>
          {s.accountError
            ? "We could not check your account. Try again when your connection is available."
            : "You can explore CHAMPUS while your contact confirms access for " +
              s.sessionUser.email +
              "."}
        </p>
        {s.checkedAt && (
          <p className="muted" aria-live="polite">
            Last checked at {new Date(s.checkedAt).toLocaleTimeString()}
          </p>
        )}
        <div className="buttons">
          <button type="button" className="btn primary" onClick={s.refresh}>
            Check status again
          </button>
          <Link to="/">Explore CHAMPUS</Link>
          <button
            type="button"
            className="text-btn"
            disabled={job.busy}
            onClick={() =>
              job.run(async () => {
                const { error } = await requireDb().auth.signOut({
                  scope: "local",
                });
                if (error) throw error;
                navigate("/sign-in", { replace: true });
              })
            }
          >
            Use a different account
          </button>
        </div>
        {job.message && <Notice>{job.message}</Notice>}
      </section>
    </main>
  );
}

const choices = [
  {
    role: "student",
    title: "Student",
    icon: BookOpen,
    description:
      "Open your Database task, submit evidence and read lecturer feedback.",
  },
  {
    role: "campus",
    title: "Campus",
    icon: GraduationCap,
    description:
      "Review the student’s submission and turn the industry brief into course practice.",
  },
  {
    role: "industry",
    title: "Industry",
    icon: BriefcaseBusiness,
    description:
      "Update a workplace need and see the campus response to your project.",
  },
] as const;
export function Demo() {
  const job = useBusy(),
    navigate = useNavigate();
  useEffect(() => {
    if (!previewMode) window.location.replace("/preview/demo");
  }, []);
  async function start(role: (typeof choices)[number]["role"]) {
    await job.run(async () => {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok || !data.hash)
        throw new Error(data.error || "The preview could not open. Try again.");
      const { error } = await requireDb().auth.verifyOtp({
        token_hash: data.hash,
        type: "magiclink",
      });
      if (error)
        throw new Error(
          "Your preview link expired. Select the workspace again.",
        );
      navigate(homeFor(role), { replace: true });
    });
  }
  return (
    <main className="wrap section" id="main">
      <h1 className="page-title">Try a workspace</h1>
      <p className="lede">
        Follow one project from an industry brief to lecturer feedback. The
        three roles share sample records for this preview.
      </p>
      <div className="demo-picker">
        {choices.map(({ role, title, icon: Icon, description }) => (
          <button
            className="panel"
            disabled={job.busy || !previewMode}
            onClick={() => start(role)}
            key={role}
          >
            <Icon size={24} />
            <strong>{title}</strong>
            <span>{description}</span>
            <small>{role}-demo</small>
          </button>
        ))}
      </div>
      {job.busy && (
        <Notice>Opening your sample accounts and coursework…</Notice>
      )}
      {job.message && <Notice>{job.message}</Notice>}
      <a href="/">Exit demo</a>
    </main>
  );
}
