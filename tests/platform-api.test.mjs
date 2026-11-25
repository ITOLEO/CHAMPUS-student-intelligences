import { test } from "node:test";
import assert from "node:assert/strict";
import accounts from "../api/accounts.js";
import advisor from "../api/advisor.js";

test("Vercel routes verify identity, provision one role, call the model and save a scoped reply", async (t) => {
  const oldFetch = globalThis.fetch;
  const env = {
    SUPABASE_URL: "https://campus.invalid",
    SUPABASE_KEY: "sb_publishable_fixture",
    SUPABASE_SECRET_KEY: "sb_secret_fixture",
    GEMINI_API_KEY: "test-provider",
    GEMINI_MODEL: "test-model",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, env);
  t.after(() => {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries(previous))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  });
  let role = "student",
    active = true,
    modelCalls = 0,
    creations = 0,
    bodySent,
    completed;
  const history = [];
  const id = "00000000-0000-4000-8000-000000000001";
  globalThis.fetch = async (urlArg, opts = {}) => {
    const url = new URL(urlArg.toString()),
      path = url.pathname;
    const reply = (value, status = 200) =>
      new Response(JSON.stringify(value), {
        status,
        headers: {
          "Content-Type": "application/json",
          "Content-Range": "0-0/1",
        },
      });
    if (path === "/auth/v1/user")
      return reply({
        id,
        email: "test@example.invalid",
        aud: "authenticated",
        user_metadata: {},
        app_metadata: {},
      });
    if (path === "/auth/v1/admin/users") {
      creations++;
      const b = JSON.parse(opts.body);
      assert.equal(b.app_metadata.champus.actor, id);
      assert.equal(b.app_metadata.champus.institution, "pib");
      assert.equal(b.app_metadata.champus.cohort, 2);
      return reply({ id, email: b.email });
    }
    if (path.endsWith("/profiles"))
      return reply({
        workspace: role,
        enabled: active,
        institution_id: "pib",
        program: "bizai",
        goals: "Develop web apps",
        interests: "interfaces",
      });
    if (path.endsWith("/start_advisor_turn")) return reply(id);
    if (path.endsWith("/advisor_turns")) {
      if (opts.method === "PATCH") {
        completed = JSON.parse(opts.body);
        history.push({
          ...completed,
          question: "Previous question",
          answer: completed.type_context
            ? "Type ENTP"
            : completed.record_context
              ? "Develop web apps"
              : "General guidance",
        });
        return reply({ id });
      }
      return reply(
        history.filter(
          (t) =>
            (!url.searchParams.has("record_context") || !t.record_context) &&
            (!url.searchParams.has("type_context") || !t.type_context),
        ),
      );
    }
    if (path.endsWith("/learning_preferences"))
      return reply({ work_style: "Plan", personality_type: "ENTP" });
    if (path.endsWith("/evidence") && opts.method === "HEAD")
      return new Response(null, { headers: { "Content-Range": "0-0/1" } });
    if (path.includes("/rest/v1/")) return reply([]);
    if (url.hostname === "generativelanguage.googleapis.com") {
      modelCalls++;
      bodySent = JSON.parse(opts.body);
      return reply({
        candidates: [
          { content: { parts: [{ text: "Test a join using two tables." }] } },
        ],
      });
    }
    throw Error("Unexpected test request");
  };
  async function run(handler, body, auth = true, method = "POST") {
    const res = {
      code: 0,
      payload: null,
      setHeader() {},
      status(code) {
        this.code = code;
        return this;
      },
      json(data) {
        this.payload = data;
      },
    };
    await handler(
      {
        method,
        headers: auth ? { authorization: "Bearer fixture" } : {},
        body,
      },
      res,
    );
    return res;
  }
  assert.equal((await run(accounts, {}, false)).code, 401);
  assert.equal((await run(accounts, {}, true, "GET")).code, 405);
  assert.equal((await run(accounts, { workspace: "admin" })).code, 403);
  role = "admin";
  const identity = {
    email: "student@example.invalid",
    password: "fixture credential",
    name: "Practice learner",
    workspace: "student",
    program: "bizai",
    cohort: 2,
    institution: "another",
  };
  assert.equal(
    (await run(accounts, { ...identity, workspace: "admin" })).code,
    400,
  );
  assert.equal((await run(accounts, identity)).code, 200);
  assert.equal(creations, 1);
  role = "student";
  assert.equal(
    (await run(advisor, { question: "What next?", includeContext: true })).code,
    200,
  );
  assert.equal(completed.status, "complete");
  assert.equal(completed.progress_snapshot.verified, 1);
  assert.match(JSON.stringify(bodySent), /Develop web apps/);
  assert.doesNotMatch(JSON.stringify(bodySent), /ENTP/);
  assert.equal(
    (
      await run(advisor, {
        question: "Suggest practice.",
        includeContext: true,
        shareType: true,
      })
    ).code,
    200,
  );
  assert.match(JSON.stringify(bodySent), /ENTP/);
  assert.equal(
    (await run(advisor, { question: "Explain databases." })).code,
    200,
  );
  assert.doesNotMatch(JSON.stringify(bodySent), /ENTP|Develop web apps/);
  for (role of ["campus", "industry"])
    assert.equal(
      (
        await run(advisor, {
          question: "What should the brief include?",
          includeContext: true,
        })
      ).code,
      200,
    );
  assert.equal(modelCalls, 5);
  active = false;
  assert.equal((await run(advisor, { question: "Hi" })).code, 403);
  active = true;
  delete process.env.GEMINI_API_KEY;
  assert.equal((await run(advisor, { question: "Hi" })).code, 503);
  assert.equal(modelCalls, 5);
});
