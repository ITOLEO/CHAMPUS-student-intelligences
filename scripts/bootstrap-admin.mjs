import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email, name, institution = "pib"] = process.argv.slice(2);
if (
  !email ||
  !name ||
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SECRET_KEY
) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SECRET_KEY in your trusted terminal. Pass the verified admin email, name and institution ID.",
  );
  process.exit(1);
}
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const { error } = await db.auth.admin.createUser({
  email,
  password: randomBytes(48).toString("base64url"),
  email_confirm: true,
  app_metadata: {
    champus: { bootstrap: true, workspace: "admin", institution, name },
  },
});
if (error) {
  console.error(
    "Administrator creation failed. Check whether the migration is installed, the email already exists, or an administrator has already been assigned.",
  );
  process.exit(1);
}
console.log(
  "Administrator created. Use Forgot password on the CHAMPUS sign-in page to set your password.",
);
