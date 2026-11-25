import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceCatalog,
  emptyProfile,
  catalogSkills,
  readEvidence,
  safeReturn,
  safeWebUrl,
  type Evidence,
  type Reflection,
} from "../src/data/model";
import {
  eligibility,
  isClosed,
  learningOrder,
  nextPractice,
  readiness,
  recommended,
} from "../src/recommendation/recommendationEngine";

const [culinary, hult, photo, scholarship] = sourceCatalog;
const now = new Date("2026-11-25T02:00:00Z");
const skill = culinary.data.skills[0];
const artifact: Evidence = {
  id: "test",
  user_id: "student",
  indicator_id: skill.id,
  title: "Practice submission",
  description: "Test artifact",
  link: null,
  file_path: null,
  created_at: now.toISOString(),
  reviews: [],
};
const reflection: Reflection = {
  indicator_id: skill.id,
  assessment: "Can demonstrate",
  confidence: "High",
};
function review(decision: "Verified" | "Needs revision") {
  return {
    reviewer_id: "teacher",
    created_at: now.toISOString(),
    decision,
    feedback: "Evidence-specific observation.",
  };
}
test("mandatory conditions produce three distinct decisions", () => {
  const rules = culinary.data.eligibility,
    answers = Object.fromEntries(rules.map((r) => [r.id, "yes" as const]));
  assert.equal(eligibility([], {}), "Needs confirmation");
  assert.equal(eligibility(rules, {}), "Needs confirmation");
  assert.equal(eligibility(rules, answers), "Eligible");
  assert.equal(eligibility(rules, { [rules[0].id]: "no" }), "Not eligible");
  assert.equal(
    eligibility(rules, { ...answers, [rules[0].id]: "unknown" }),
    "Needs confirmation",
  );
});
test("unreviewed work and confidence never disqualify an otherwise eligible student", () => {
  assert.equal(
    eligibility(
      photo.data.eligibility,
      Object.fromEntries(photo.data.eligibility.map((r) => [r.id, "yes"])),
    ),
    "Eligible",
  );
  assert.equal(readiness(photo.data.skills[0].id, [], []), "Not assessed");
  assert.equal(readiness(skill.id, [], [reflection]), "Self-reported only");
});
test("pending, returned and verified evidence produce distinct indicator-scoped states", () => {
  assert.equal(readiness(skill.id, [artifact], []), "Partial evidence");
  assert.equal(
    readiness(
      skill.id,
      [{ ...artifact, reviews: [review("Needs revision")] }],
      [reflection],
    ),
    "Development suggested",
  );
  assert.equal(
    readiness(skill.id, [{ ...artifact, reviews: [review("Verified")] }], []),
    "Evidence available",
  );
  assert.equal(
    readiness("different-indicator", [artifact], [reflection]),
    "Not assessed",
  );
});
test("PostgREST one-to-one, null and array reviews use the same model", () => {
  const r = review("Verified");
  assert.deepEqual(
    readEvidence([{ ...artifact, reviews: null }])[0].reviews,
    [],
  );
  assert.deepEqual(readEvidence([{ ...artifact, reviews: r }])[0].reviews, [r]);
  assert.deepEqual(readEvidence([{ ...artifact, reviews: [r] }])[0].reviews, [
    r,
  ]);
});
test("date-only closing uses the organizer calendar, including the named day", () => {
  assert.equal(
    isClosed(culinary.data.deadline, new Date("2026-11-27T16:59:59Z")),
    false,
  );
  assert.equal(
    isClosed(culinary.data.deadline, new Date("2026-11-27T17:00:00Z")),
    true,
  );
});
test("precise and exclusive deadlines retain their published precision", () => {
  assert.equal(
    isClosed(hult.data.deadline, new Date("2027-02-28T23:59:59Z")),
    false,
  );
  assert.equal(
    isClosed(hult.data.deadline, new Date("2027-03-01T00:00:00Z")),
    true,
  );
  assert.equal(
    isClosed(scholarship.data.deadline, new Date("2027-02-13T16:01:00Z")),
    true,
  );
  assert.equal(
    isClosed({ ...scholarship.data.deadline, date: "" }, now),
    false,
  );
});
test("discovery excludes closed and withdrawn records and explains an interest match", () => {
  const all = recommended(
    sourceCatalog,
    { ...emptyProfile, interests: "photographer" },
    now,
  );
  assert.equal(all[0].id, photo.id);
  assert.equal(
    recommended(
      [
        { ...photo, status: "draft" },
        { ...scholarship, status: "archived" },
        culinary,
      ],
      emptyProfile,
      new Date("2026-12-01"),
    ).length,
    0,
  );
});
test("graph traversal terminates on cycles and chooses a remaining practice", () => {
  const [a, b] = culinary.data.skills;
  assert.deepEqual(
    learningOrder([a, b], { [a.id]: [b.id], [b.id]: [a.id] }).map((x) => x.id),
    [b.id, a.id],
  );
  assert.equal(
    nextPractice([a, b], [{ ...artifact, reviews: [review("Verified")] }], [])
      ?.id,
    b.id,
  );
});
test("each curated skill leads to a named, attributed HTTPS resource and organizer rule", () => {
  assert.equal(sourceCatalog.length, 4);
  assert.equal(Object.keys(catalogSkills).length, 6);
  for (const { data } of sourceCatalog) {
    assert.ok(safeWebUrl(data.sourceUrl));
    for (const rule of data.eligibility) assert.ok(safeWebUrl(rule.sourceUrl));
    for (const s of data.skills) {
      assert.ok(s.indicator && s.resource.provider && s.resource.title);
      assert.ok(safeWebUrl(s.resource.url));
    }
  }
});
test("sign-in destinations stay on the site and external destinations must use HTTPS", () => {
  assert.equal(
    safeReturn("/opportunities?category=Competition"),
    "/opportunities?category=Competition",
  );
  for (const value of ["//example.org", "https://example.org", "/sign-in"])
    assert.equal(safeReturn(value), "/overview");
  assert.equal(safeWebUrl("javascript:alert(0)"), undefined);
  assert.equal(safeWebUrl("https://a:b@example.org"), undefined);
});
