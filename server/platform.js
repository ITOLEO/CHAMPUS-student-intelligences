import { createClient } from "@supabase/supabase-js";

export function problem(status, message) {
  return Object.assign(new Error(message), { status });
}

export function checked(result) {
  if (result.error)
    throw problem(
      503,
      "Workspace data could not be read. Check the database migrations or try again.",
    );
  return result.data;
}

export function service() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key)
    throw problem(
      503,
      "The administrator must configure the server’s Supabase secret key.",
    );
  return createClient(process.env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function caller(req, allowed) {
  if (req.method !== "POST") throw problem(405, "Use POST for this operation.");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY)
    throw problem(503, "The campus service is not configured.");
  const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || "")?.[1];
  if (!token) throw problem(401, "Sign in to continue.");
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + token } },
  });
  const identity = await db.auth.getUser(token);
  if (identity.error || !identity.data.user)
    throw problem(401, "Your session has expired. Sign in again.");
  const id = identity.data.user.id;
  const profile = checked(
    await db
      .from("profiles")
      .select("workspace,enabled,institution_id,program,goals,interests,cohort")
      .eq("user_id", id)
      .single(),
  );
  if (!profile?.enabled || !allowed.includes(profile.workspace))
    throw problem(403, "This account cannot use this workspace.");
  return { id, db, profile };
}

export function endpoint(action) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const data = await action(req, res);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(error.status || 503).json({
        error: error.status
          ? error.message
          : "The service could not finish this request. Try again.",
      });
    }
  };
}
