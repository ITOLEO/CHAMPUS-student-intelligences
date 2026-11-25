import { useState, type FormEvent } from "react";
import { ArrowUpRight, Eye, EyeOff, Mail } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { db, requireDb } from "../data/client";
import { safeReturn } from "../data/model";
import { useBusy, useStore } from "../data/store";
import { Notice } from "../components/Layout";

type Mode = "password" | "reset";
const modes = {
  password: {
    heading: "Sign in to CHAMPUS",
    instructions: "Enter your email and password.",
    action: "Sign in",
  },
  reset: {
    heading: "Reset your password",
    instructions: "We’ll send a link to set a password for your account.",
    action: "Send reset link",
  },
};

export function SignIn() {
  const { sessionUser: user, user: active, authLoading } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeReturn(params.get("next"));
  const recovery = params.get("flow") === "recovery";
  const [mode, setMode] = useState<Mode>(recovery ? "reset" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [sent, setSent] = useState(false);
  const job = useBusy();

  if (user && !recovery)
    return authLoading ? (
      <main className="wrap section" id="main">
        <Notice>Checking your workspace…</Notice>
      </main>
    ) : (
      <Navigate to={active ? next : "/status"} replace />
    );
  const settingPassword = !!user && recovery;
  const title = settingPassword
    ? "Set a new password"
    : sent
      ? "Check your email"
      : modes[mode].heading;
  const instruction = settingPassword
    ? "Choose a new password for your CHAMPUS account."
    : modes[mode].instructions;

  function chooseMode(nextMode: Mode) {
    setMode(nextMode);
    setSent(false);
    setPassword("");
    setVisible(false);
    job.setMessage("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    job.run(async () => {
      const client = requireDb();
      if (settingPassword) {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        navigate(next, { replace: true });
        return;
      }
      const address = email.trim();
      if (mode === "password") {
        const { error } = await client.auth.signInWithPassword({
          email: address,
          password,
        });
        if (error) throw error;
        return;
      }
      const redirect = new URL("/sign-in", window.location.origin);
      redirect.searchParams.set("next", next);
      if (mode === "reset") redirect.searchParams.set("flow", "recovery");
      const { error } = await client.auth.resetPasswordForEmail(address, {
        redirectTo: redirect.href,
      });
      if (error) throw error;
      setSent(true);
    });
  }

  return (
    <main id="main" className="auth-wrap">
      <section className="auth-box">
        <div className="auth-intro">
          <img src="/champus.svg" alt="CHAMPUS" width="49" height="49" />
          <h1>{title}</h1>
          <p>
            {settingPassword
              ? user.email
              : sent
                ? "Check the inbox for the address you entered."
                : "Your CHAMPUS contact provides your account. Use the email and password they gave you."}
          </p>
        </div>
        <div className="auth-action">
          {authLoading && recovery ? (
            <Notice>Checking your recovery link…</Notice>
          ) : !db ? (
            <Notice>
              Account access is unavailable until this site is connected to its
              campus service.
            </Notice>
          ) : sent ? (
            <div className="sent-actions">
              <p>
                If an account exists for <strong>{email.trim()}</strong>, you’ll
                receive a password reset link.
              </p>
              <a
                className="btn primary"
                href="https://mail.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Mail size={17} /> Open Gmail <ArrowUpRight size={15} />
              </a>
              <button
                type="button"
                className="text-btn"
                onClick={() => chooseMode(mode)}
              >
                Change email address
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p>{instruction}</p>
              {recovery && !settingPassword && (
                <Notice>
                  This recovery link is unavailable. Request a new one below.
                </Notice>
              )}
              {!settingPassword && (
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {(mode === "password" || settingPassword) && (
                <div className="password-field">
                  <label htmlFor="auth-password">
                    {settingPassword ? "New password" : "Password"}
                  </label>
                  <input
                    id="auth-password"
                    name="password"
                    type={visible ? "text" : "password"}
                    required
                    minLength={settingPassword ? 6 : undefined}
                    autoComplete={
                      settingPassword ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-btn password-visibility"
                    aria-label={visible ? "Hide password" : "Show password"}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              )}
              {job.message && (
                <p className="notice" role="alert">
                  {job.message}
                </p>
              )}
              <div className="auth-actions">
                {!settingPassword && mode === "password" && (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => chooseMode("reset")}
                  >
                    Forgot password?
                  </button>
                )}
                <button className="btn primary" disabled={job.busy}>
                  {job.busy
                    ? "Please wait…"
                    : settingPassword
                      ? "Save password"
                      : modes[mode].action}
                </button>
              </div>
            </form>
          )}
          {db && !sent && !settingPassword && mode === "reset" && (
            <div className="auth-method">
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  if (recovery)
                    navigate("/sign-in?next=" + encodeURIComponent(next), {
                      replace: true,
                    });
                  chooseMode("password");
                }}
              >
                Back to password sign-in
              </button>
            </div>
          )}
        </div>
      </section>
      <div className="auth-links">
        <Link to="/opportunities">Explore opportunities</Link>
        <Link to="/help">Sign-in help</Link>
      </div>
    </main>
  );
}
