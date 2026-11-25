import { LogOut } from "lucide-react";
import { requireDb } from "../data/client";
import { useBusy } from "../data/store";

export function ExitDemo() {
  const job = useBusy();
  return (
    <>
      <button
        type="button"
        className="demo-exit"
        disabled={job.busy}
        onClick={() =>
          job.run(async () => {
            const auth = requireDb().auth;
            const { data } = await auth.getSession();
            if (data.session) {
              const { error } = await auth.signOut({ scope: "local" });
              if (error) throw error;
            }
            window.location.replace("/");
          })
        }
      >
        <LogOut size={17} /> Exit demo
      </button>
      {job.message && <small role="alert">{job.message}</small>}
    </>
  );
}
