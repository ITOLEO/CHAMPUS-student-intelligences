import test from "node:test";
import assert from "node:assert/strict";
import demo from "../api/demo.js";

test("a preview cookie joins three scoped Auth users and never grants an internal role", async (t) => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL,
    oldKey = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = "https://demo-test.invalid";
  process.env.SUPABASE_SECRET_KEY = "fixture-key";
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of [
      ["SUPABASE_URL", oldUrl],
      ["SUPABASE_SECRET_KEY", oldKey],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const users = new Map();
  let seedCount = 0;
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(String(url)).pathname,
      body = JSON.parse(options.body || "{}");
    let data;
    if (path.endsWith("/reserve_demo")) data = null;
    else if (path.endsWith("/demo_members"))
      data = [...users.values()]
        .filter((u) => u.app_metadata.champus_demo.run === body.run_id)
        .map((u) => ({
          user_id: u.id,
          workspace: u.app_metadata.champus_demo.role,
          enabled: true,
        }));
    else if (path.endsWith("/admin/users")) {
      assert.ok(!body.password);
      assert.match(body.email, /@preview\.champus\.invalid$/);
      data = {
        id: String(users.size + 1),
        email: body.email,
        app_metadata: body.app_metadata,
      };
      users.set(body.email, data);
    } else if (path.endsWith("/seed_demo")) {
      seedCount++;
      data = null;
    } else if (path.endsWith("/admin/generate_link")) {
      const selected = users.get(body.email);
      assert.ok(selected);
      data = {
        ...selected,
        hashed_token: "demo-test-" + selected.id,
        verification_type: "magiclink",
      };
    } else throw Error("Unexpected request " + path);
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  };
  async function enter(role, cookie = "") {
    const headers = {},
      res = {
        setHeader(k, v) {
          headers[k] = v;
        },
        status(code) {
          this.code = code;
          return this;
        },
        json(value) {
          this.body = value;
          return this;
        },
      };
    await demo({ method: "POST", body: { role }, headers: { cookie } }, res);
    return { ...res, headers };
  }
  assert.equal((await enter("admin")).code, 400);
  const first = await enter("student");
  assert.equal(first.code, 200);
  assert.match(first.headers["Set-Cookie"], /HttpOnly/);
  const cookie = first.headers["Set-Cookie"].split(";")[0];
  assert.equal(users.size, 3);
  const second = await enter("campus", cookie);
  assert.equal(second.code, 200);
  assert.notEqual(second.body.hash, first.body.hash);
  assert.equal(users.size, 3);
  const third = await enter("industry", cookie);
  assert.equal(third.code, 200);
  assert.equal(seedCount, 3);
  await enter("student", cookie + "bad");
  assert.equal(users.size, 6);
});
