import { ExitDemo } from "../components/ExitDemo";
import { homeFor, programName } from "../data/platform";
import { Avatar } from "../components/Navigation";
import { previewMode } from "../data/client";
import { Curriculum } from "./Curriculum";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { FileCheck2 } from "lucide-react";
import { Notice } from "../components/Layout";
import { useStore, useBusy } from "../data/store";
import { check, requireDb } from "../data/client";

import { EvidenceList } from "./Skills";
export function Overview() {
  const s = useStore();
  if (s.workspace !== "student")
    return <Navigate replace to={homeFor(s.workspace)} />;
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
  const [file, setFile] = useState<File | null>(null);
  return (
    <form
      className="panel form"
      onSubmit={(e) => {
        e.preventDefault();
        job.run(async () => {
          if (!file || !user) throw new Error("Choose a photo first.");
          const ext = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
          }[file.type];
          if (!ext || file.size > 2 * 1024 * 1024)
            throw new Error("Choose a JPEG, PNG or WebP under 2 MB.");
          const path = user.id + "/" + crypto.randomUUID() + "." + ext;
          const db = requireDb(),
            bucket = db.storage.from("profile-photos");
          check(await bucket.upload(path, file));
          const { error } = await db.auth.updateUser({
            data: { avatar_path: path },
          });
          if (error) {
            await bucket.remove([path]);
            throw error;
          }
          const old = user.user_metadata.avatar_path;
          if (typeof old === "string" && old.startsWith(user.id + "/"))
            await bucket.remove([old]);
        }, "Profile photo saved.");
      }}
    >
      <h2 className="profile-avatar-title">
        <Avatar /> Profile photo
      </h2>
      <label>
        Upload photo
        <input
          required
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
      <small>JPEG, PNG or WebP · up to 2 MB</small>
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
  const [p, P] = useState(s.profile);
  const student = s.workspace === "student";
  return (
    <>
      <div className="profile-identity panel">
        <Avatar />
        <h1>{p.name || "My profile"}</h1>
        <p>
          {s.institutions.find((i) => i.id === s.institution)?.name ||
            s.institution}{" "}
          · Active
        </p>
        {previewMode ? (
          <small>You’re in a demo account</small>
        ) : (
          <Link to="/demo">Try demo</Link>
        )}
      </div>
      {student ? (
        <>
          <p className="profile-notice">
            Your campus maintains your official profile.{" "}
            <Link to="/help">Request a correction</Link>
          </p>
          <details className="panel">
            <summary>Academic information</summary>
            <p>
              {programName(p.program) || "Program pending"} · Cohort{" "}
              {s.cohort || "pending"}
            </p>
          </details>
          <details className="panel">
            <summary>Personal information</summary>
            <p>{p.name}</p>
            <p>Interests · {p.interests || "Not recorded"}</p>
            <p>Learning goal · {p.goals || "Not recorded"}</p>
          </details>
          <details className="panel">
            <summary>Contact information</summary>
            <p>{s.user?.email}</p>
          </details>
          <section className="panel">
            <h2>Learning preferences</h2>
            <p>Choose how you would like to approach your next assignment.</p>
            <Link to="/learning-preferences">Open private reflection</Link>
          </section>
        </>
      ) : (
        <>
          <ProfilePhoto />
          <form
            className="form panel"
            onSubmit={(e) => {
              e.preventDefault();
              job.run(async () => {
                check(
                  await requireDb()
                    .from("profiles")
                    .update({
                      name: p.name,
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
            <p>
              <strong>Institution</strong> ·{" "}
              {s.institutions.find((i) => i.id === s.institution)?.name ||
                s.institution}
            </p>
            <label>
              Name
              <input
                value={p.name}
                maxLength={100}
                onChange={(e) => P({ ...p, name: e.target.value })}
              />
            </label>
            <button className="btn primary" disabled={job.busy}>
              Save profile
            </button>
            {job.message && <Notice>{job.message}</Notice>}
          </form>
        </>
      )}
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
      <section className="panel">
        <h2>Help Center</h2>
        <p>Contact your campus about account details or access.</p>
        <Link to="/help">Open Help Center</Link>
      </section>
      {previewMode && (
        <section className="panel">
          <ExitDemo />
        </section>
      )}
    </>
  );
}
