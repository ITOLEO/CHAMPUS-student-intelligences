import { Avatar } from "../components/Navigation";
import { safeWebUrl } from "../data/model";
import { Curriculum, Preference } from "./Curriculum";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { FileCheck2 } from "lucide-react";
import { Notice } from "../components/Layout";
import { useStore, useBusy } from "../data/store";
import { check, requireDb } from "../data/client";

import { EvidenceList } from "./Skills";
export function Overview() {
  const s = useStore();
  if (s.roles.includes("teacher")) return <Navigate replace to="/teacher" />;
  if (s.roles.includes("industry")) return <Navigate replace to="/industry" />;
  return (
    <>
      <Curriculum role="student" overview />
      <section className="panel">
        <h2>Recent evidence</h2>
        {s.evidence.length ? (
          <EvidenceList rows={s.evidence.slice(0, 3)} />
        ) : (
          <Link to="/skills">Choose a skill to demonstrate</Link>
        )}
      </section>
    </>
  );
}
function ProfilePhoto() {
  const { user } = useStore();
  const job = useBusy();
  const current = user?.user_metadata.avatar_url;
  const [url, setUrl] = useState(typeof current === "string" ? current : "");
  return (
    <form
      className="panel form"
      onSubmit={(e) => {
        e.preventDefault();
        job.run(async () => {
          const avatarUrl = safeWebUrl(url.trim());
          if (url.trim() && !avatarUrl)
            throw new Error("Enter an HTTPS link to your photo.");
          const { error } = await requireDb().auth.updateUser({
            data: { avatar_url: avatarUrl || null },
          });
          if (error) throw error;
        }, "Profile photo saved.");
      }}
    >
      <h2 className="profile-avatar-title">
        <Avatar /> Profile photo
      </h2>
      <label>
        Photo URL
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          maxLength={1000}
        />
      </label>
      <small>
        Use a direct HTTPS image link. Leave the field empty to use your
        initials.
      </small>
      <button className="btn secondary" disabled={job.busy}>
        Save photo
      </button>
      {job.message && <Notice>{job.message}</Notice>}
    </form>
  );
}
export function Profile() {
  const s = useStore(),
    job = useBusy();
  const [p, P] = useState(s.profile),
    [school, chooseSchool] = useState(s.institution);
  const student = !s.roles.includes("teacher") && !s.roles.includes("industry");
  return (
    <>
      <p className="overline">Account</p>
      <h1 className="page-title">My profile</h1>
      <p className="lede">Manage the details shown in your CHAMPUS account.</p>
      <ProfilePhoto />
      {student && <Preference />}
      <form
        className="form panel"
        onSubmit={(e) => {
          e.preventDefault();
          job.run(async () => {
            if (!s.institution && school)
              check(
                await requireDb().rpc("choose_institution", { inst: school }),
              );
            check(
              await requireDb()
                .from("profiles")
                .update({
                  name: p.name,
                  program: p.program,
                  semester: p.semester,
                  interests: p.interests,
                  goals: p.goals,
                })
                .eq("user_id", s.user!.id)
                .select("user_id")
                .single(),
            );
            s.refresh();
          }, "Profile saved.");
        }}
      >
        <h2>Profile details</h2>
        {s.institution ? (
          <p>
            <strong>Institution</strong> ·{" "}
            {s.institutions.find((i) => i.id === s.institution)?.name ||
              s.institution}
          </p>
        ) : (
          <label>
            Reviewing institution
            <select
              value={school}
              onChange={(e) => chooseSchool(e.target.value)}
            >
              <option value="">Choose when ready</option>
              {s.institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <small>
              Choose the institution whose teachers should review your evidence.
              An administrator can correct your choice.
            </small>
          </label>
        )}
        <label>
          Name
          <input
            value={p.name}
            maxLength={100}
            onChange={(e) => P({ ...p, name: e.target.value })}
          />
        </label>
        {student && (
          <>
            <div className="form-pair">
              <label>
                Program
                <input
                  value={p.program}
                  maxLength={160}
                  onChange={(e) => P({ ...p, program: e.target.value })}
                />
              </label>
              <label>
                Semester
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={p.semester ?? ""}
                  onChange={(e) =>
                    P({
                      ...p,
                      semester: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </label>
            </div>
            <label>
              Interests
              <input
                value={p.interests}
                maxLength={500}
                placeholder="e.g. culinary arts, photography"
                onChange={(e) => P({ ...p, interests: e.target.value })}
              />
            </label>
            <label>
              Development goals
              <textarea
                maxLength={1000}
                value={p.goals}
                onChange={(e) => P({ ...p, goals: e.target.value })}
              />
            </label>
          </>
        )}
        <button className="btn primary" disabled={job.busy}>
          Save profile
        </button>
        {job.message && <Notice>{job.message}</Notice>}
      </form>
      {student && (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>Competencies and reflections</h2>
              <Link to="/skills">View skills</Link>
            </div>
            {s.reflections.length ? (
              s.reflections.map((r) => (
                <p key={r.indicator_id}>
                  <Link to={"/learning/" + r.indicator_id}>
                    {s.skills[r.indicator_id]?.title || r.indicator_id}
                  </Link>{" "}
                  · {r.assessment} · {r.confidence} confidence
                </p>
              ))
            ) : (
              <p>Add a reflection from a skill detail page.</p>
            )}
          </section>
          <section className="panel">
            <h2>
              <FileCheck2 size={20} /> My evidence
            </h2>
            {s.evidence.length ? (
              <EvidenceList rows={s.evidence} />
            ) : (
              <p>Your submissions and teacher feedback appear here.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
