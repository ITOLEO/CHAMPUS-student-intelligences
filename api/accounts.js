import { caller, endpoint, problem, service } from "../server/platform.js";

export default endpoint(async (req) => {
  const { id, profile } = await caller(req, ["admin"]);
  const { email, password, name, workspace, program, cohort } = req.body || {};
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128 ||
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    !["student", "campus", "industry"].includes(workspace)
  )
    throw problem(
      400,
      "Enter a name, a valid email, a workspace and a password of 12–128 characters.",
    );
  if (
    workspace === "student" &&
    (!["bizai", "culinary", "hospitality", "events"].includes(program) ||
      ![1, 2, 3, 4].includes(cohort))
  )
    throw problem(400, "Choose a program and cohort.");
  const registration = {
    actor: id,
    institution: profile.institution_id,
    workspace,
    name: name.trim(),
    program: workspace === "student" ? program : null,
    cohort: workspace === "student" ? cohort : null,
  };
  const result = await service().auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    app_metadata: { champus: registration },
  });
  if (result.error) {
    if (["email_exists", "user_already_exists"].includes(result.error.code))
      throw problem(409, "An account with this email already exists.");
    throw problem(
      400,
      "Account creation failed. Check password requirements and the managed-account migration.",
    );
  }
  return { id: result.data.user.id };
});
