import type {
  Answer,
  Evidence,
  Listing,
  Opportunity,
  Profile,
  Reflection,
  Skill,
} from "../data/model";

function localStamp(now: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (key: string) => parts.find((p) => p.type === key)?.value;
  return (
    get("year") +
    "-" +
    get("month") +
    "-" +
    get("day") +
    "T" +
    get("hour") +
    ":" +
    get("minute")
  );
}
export function isClosed(deadline: Opportunity["deadline"], now = new Date()) {
  if (!deadline.date) return false;
  // A missing zone uses the pilot calendar for archive scheduling only.
  const local = localStamp(now, deadline.zone || "Asia/Makassar");
  if (deadline.precision === "minute" && deadline.time)
    return local > deadline.date + "T" + deadline.time;
  if (deadline.precision === "before-date")
    return local.slice(0, 10) >= deadline.date;
  return local.slice(0, 10) > deadline.date;
}
export function dateLabel(value: string, short = false) {
  if (!value) return "Date not confirmed";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value.slice(0, 10) + "T12:00:00Z"));
}
export function deadlineText(o: Opportunity) {
  const d = o.deadline;
  if (!d.date) return "Date not confirmed";
  return (
    (d.precision === "before-date" ? "Before " : "") +
    dateLabel(d.date, true) +
    (d.time ? " · " + d.time + " " + (d.zone || "") : "")
  );
}
export function eligibility(
  rules: Opportunity["eligibility"],
  answers: Record<string, Answer>,
) {
  if (rules.some((r) => answers[r.id] === "no")) return "Not eligible";
  return rules.length && rules.every((r) => answers[r.id] === "yes")
    ? "Eligible"
    : "Needs confirmation";
}
export function readiness(
  id: string,
  evidence: Evidence[],
  reflections: Reflection[],
) {
  const work = evidence.filter((e) => e.indicator_id === id);
  if (work.some((e) => e.reviews?.some((r) => r.decision === "Verified")))
    return "Evidence available";
  if (work.some((e) => !e.reviews?.length)) return "Partial evidence";
  if (work.some((e) => e.reviews?.some((r) => r.decision === "Needs revision")))
    return "Development suggested";
  if (reflections.some((r) => r.indicator_id === id && r.assessment))
    return "Self-reported only";
  return "Not assessed";
}
export function matchingWords(o: Opportunity, profile: Profile) {
  const hay = [
    o.title,
    o.summary,
    o.category,
    ...o.skills.map((s) => [s.cluster, s.specificSkill, s.title].join(" ")),
  ]
    .join(" ")
    .toLowerCase();
  return [
    ...new Set(
      (profile.interests + "," + profile.goals)
        .toLowerCase()
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 3 && hay.includes(s)),
    ),
  ];
}
export function recommended(
  rows: Listing[],
  profile: Profile,
  now = new Date(),
) {
  return rows
    .filter((r) => r.status === "published" && !isClosed(r.data.deadline, now))
    .sort(
      (a, b) =>
        matchingWords(b.data, profile).length -
          matchingWords(a.data, profile).length ||
        (a.data.deadline.date || "9999").localeCompare(
          b.data.deadline.date || "9999",
        ),
    );
}
// Adapt the original NEXORA traversal to sourced skill IDs. Visit each node once.
export function learningOrder(
  skills: Skill[],
  edges: Record<string, string[]> = {},
): Skill[] {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const result: Skill[] = [];
  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const skill = byId.get(id);
    if (!skill) return;
    for (const other of edges[id] || []) visit(other);
    result.push(skill);
  }
  for (const skill of skills) visit(skill.id);
  return result;
}
export function nextPractice(
  skills: Skill[],
  work: Evidence[],
  reflections: Reflection[],
) {
  return learningOrder(skills).find(
    (s) => readiness(s.id, work, reflections) !== "Evidence available",
  );
}
