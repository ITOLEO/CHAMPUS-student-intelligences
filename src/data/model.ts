import catalog from "./catalog.json";
type Seed = (typeof catalog.opportunities)[number];
export type Opportunity = Omit<Seed, "deadline" | "eligibility" | "skills"> & {
  deadline: {
    date: string;
    time: string | null;
    zone: string | null;
    label: string;
    precision: string;
  };
  eligibility: {
    id: string;
    label: string;
    field: string;
    operator: string;
    value: boolean | string[] | number[];
    sourceUrl: string;
  }[];
  skills: Seed["skills"][number][];
};
export type Skill = Opportunity["skills"][number];
export type Answer = "yes" | "no" | "unknown";
export type Listing = {
  id: string;
  institution_id: string;
  status: "draft" | "published" | "archived";
  revision: number;
  data: Opportunity;
};
export type Profile = {
  name: string;
  program: string;
  semester: number | null;
  interests: string;
  goals: string;
};
export type Evidence = {
  task_id?: string | null;
  id: string;
  user_id: string;
  indicator_id: string;
  title: string;
  description: string;
  link: string | null;
  file_path: string | null;
  created_at: string;
  reviews: {
    decision: "Verified" | "Needs revision";
    feedback: string;
    created_at: string;
    reviewer_id: string;
  }[];
};
type ReviewRow = Evidence["reviews"][number];
export function readEvidence(
  rows: (Omit<Evidence, "reviews"> & {
    reviews: ReviewRow[] | ReviewRow | null;
  })[],
): Evidence[] {
  return rows.map((row) => ({
    ...row,
    reviews: Array.isArray(row.reviews)
      ? row.reviews
      : row.reviews
        ? [row.reviews]
        : [],
  }));
}
export type Reflection = {
  indicator_id: string;
  assessment: string;
  confidence: string;
  user_id?: string;
};
export const emptyProfile: Profile = {
  name: "",
  program: "",
  semester: null,
  interests: "",
  goals: "",
};
export const sourceCatalog: Listing[] = catalog.opportunities.map((data) => ({
  id: data.id,
  data,
  institution_id: "pib",
  status: "published",
  revision: 1,
}));
export const courseLinks = catalog.academicMappings;
export const catalogSkills = Object.fromEntries(
  catalog.opportunities.flatMap((o) => o.skills).map((s) => [s.id, s]),
);
export const picture = (id: string) =>
  ({
    "nusantara-culinary-plating": "culinary-practice",
    "ef-hult-prize": "venture-workshop",
    "student-food-photographer": "food-photography",
    "china-indonesia-scholarship": "study-plan",
  })[id];
export function safeWebUrl(value: string | null | undefined) {
  try {
    const u = new URL(value || "");
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function safeReturn(value: string | null) {
  return value &&
    /^\/(?!\/)[\w-/]*(?:\?[\w%=&+.-]*)?$/.test(value) &&
    !value.startsWith("/sign-in")
    ? value
    : "/overview";
}
