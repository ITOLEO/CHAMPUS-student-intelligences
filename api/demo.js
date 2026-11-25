import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { service, checked, problem, endpoint } from "../server/platform.js";

const roles = ["student", "campus", "industry"];
function sign(value) {
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY)
    .update("champus-preview-v1:" + value)
    .digest("hex");
}
function currentRun(cookie) {
  const value =
    /(?:^|;\s*)champus_preview=([0-9a-f-]{36})\.([0-9a-f]{64})(?:;|$)/.exec(
      cookie || "",
    );
  return value &&
    timingSafeEqual(Buffer.from(value[2]), Buffer.from(sign(value[1])))
    ? value[1]
    : null;
}

export default endpoint(async (req, res) => {
  if (req.method !== "POST")
    throw problem(405, "Use POST to select a preview.");
  const role = req.body?.role;
  if (!roles.includes(role))
    throw problem(400, "Choose a public preview role.");
  if (req.headers["sec-fetch-site"] === "cross-site")
    throw problem(403, "Open the preview from CHAMPUS.");
  const db = service(),
    existing = currentRun(req.headers.cookie),
    id = existing || randomUUID();
  const ip = String(
    req.headers["x-vercel-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "local",
  )
    .split(",")[0]
    .trim();
  const { error } = await db.rpc("reserve_demo", {
    run_id: id,
    source_key: sign("source:" + ip),
  });
  if (error) {
    if (error.message.includes("capacity"))
      throw problem(429, "Preview capacity is full. Try again later.");
    throw problem(
      503,
      "The preview database is awaiting setup. Please try again later.",
    );
  }
  if (!existing)
    res.setHeader(
      "Set-Cookie",
      "champus_preview=" +
        id +
        "." +
        sign(id) +
        "; Path=/api/demo; Max-Age=604800; HttpOnly; SameSite=Strict" +
        (process.env.VERCEL || process.env.NODE_ENV === "production"
          ? "; Secure"
          : ""),
    );
  const members = async () =>
    checked(await db.rpc("demo_members", { run_id: id }));
  const provisioned = await members();
  for (const kind of roles) {
    if (provisioned.some((p) => p.workspace === kind)) continue;
    const result = await db.auth.admin.createUser({
      email: kind + "-demo+" + id + "@preview.champus.invalid",
      email_confirm: true,
      app_metadata: { champus_demo: { run: id, role: kind } },
    });
    if (result.error && !(await members()).some((p) => p.workspace === kind))
      throw problem(
        503,
        "Sample accounts could not be prepared. Please retry.",
      );
  }
  checked(await db.rpc("seed_demo", { run_id: id }));
  const account = (await members()).find(
    (p) => p.workspace === role && p.enabled,
  );
  if (!account) throw problem(403, "This preview is unavailable.");
  const link = await db.auth.admin.generateLink({
    type: "magiclink",
    email: role + "-demo+" + id + "@preview.champus.invalid",
  });
  if (
    link.error ||
    link.data?.user?.id !== account.user_id ||
    link.data.user.app_metadata?.champus_demo?.run !== id
  )
    throw problem(503, "The preview could not start. Please try again.");
  return { hash: link.data.properties.hashed_token };
});
