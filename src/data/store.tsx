import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { check, configured, db, requireDb } from "./client";
import {
  catalogSkills,
  courseLinks,
  readEvidence,
  emptyProfile,
  sourceCatalog,
  type Skill,
  type Answer,
  type Evidence,
  type Listing,
  type Profile,
  type Reflection,
} from "./model";
type Personal = {
  profile: Profile;
  completed: string[];
  saved: string[];
  evidence: Evidence[];
  reflections: Reflection[];
  confirmations: Record<string, Record<string, Answer>>;
  roles: string[];
  institution: string;
};
const blank: Personal = {
  profile: emptyProfile,
  completed: [],
  saved: [],
  evidence: [],
  reflections: [],
  confirmations: {},
  roles: [],
  institution: "",
};
function useBuildStore() {
  const [user, setUser] = useState<User | null>(null),
    [authLoading, setAuthLoading] = useState(!!db);
  const [listings, setListings] = useState<Listing[]>(
      configured ? [] : sourceCatalog,
    ),
    [catalogError, setCatalogError] = useState(""),
    [catalogLoading, setCatalogLoading] = useState(configured);
  const [institutions, setInstitutions] = useState<
    { id: string; name: string }[]
  >([]);
  const [skills, setSkills] = useState<Record<string, Skill>>(
    configured ? {} : catalogSkills,
  );
  const [mappings, setMappings] = useState<typeof courseLinks>(
    configured ? [] : courseLinks,
  );
  const [personal, setPersonal] = useState<{
      owner: string;
      value: Personal;
    } | null>(null),
    [accountError, setAccountError] = useState(""),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((x) => x + 1), []);
  useEffect(() => {
    if (!db) return;
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    if (!configured) return;
    if (!db) {
      setCatalogError("The opportunity service is unavailable.");
      setCatalogLoading(false);
      return;
    }

    Promise.all([
      db.from("opportunities").select("*").eq("status", "published"),
      db.from("skill_indicators").select("id,definition"),
      db.from("outcome_indicators").select("context"),
      db.from("institutions").select("id,name").order("name"),
    ])
      .then(([opportunities, registry, outcomes, schools]) => {
        if (!active) return;
        const rows = check(opportunities) as Listing[];
        const definitions = check(registry) || [];
        const contexts = check(outcomes) || [];
        setInstitutions(check(schools) || []);
        setListings(rows);
        setSkills(
          Object.fromEntries(definitions.map((x) => [x.id, x.definition])),
        );
        setMappings(contexts.map((x) => x.context));
        setCatalogError("");
      })
      .catch(() => {
        if (active) {
          setListings([]);
          setSkills({});
          setMappings([]);
          setCatalogError("The catalog could not load.");
        }
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, user?.id]);
  useEffect(() => {
    let active = true;
    setAccountError("");
    if (!user || !db) {
      setPersonal(null);
      return;
    }
    const uid = user.id;
    const client = db;
    (async () => {
      const [p, s, e, r, c, a, practice] = await Promise.all([
        client.from("profiles").select("*").eq("user_id", uid).single(),
        client
          .from("saved_opportunities")
          .select("opportunity_id")
          .eq("user_id", uid),
        client
          .from("evidence")
          .select("*,reviews(*)")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        client.from("self_assessments").select("*").eq("user_id", uid),
        client.from("confirmations").select("*").eq("user_id", uid),
        client.from("staff_roles").select("role").eq("user_id", uid),
        client
          .from("completed_resources")
          .select("indicator_id")
          .eq("user_id", uid),
      ]);
      const profile = check(p);
      const confirmations: Personal["confirmations"] = {};
      for (const row of check(c) || []) {
        const k = row.opportunity_id + ":" + row.revision;
        (confirmations[k] ??= {})[row.rule_id] = row.answer;
      }
      const value = {
        profile,
        completed: (check(practice) || []).map((x) => x.indicator_id),
        saved: (check(s) || []).map((v) => v.opportunity_id),
        evidence: readEvidence(check(e) || []),
        reflections: check(r) as Reflection[],
        confirmations,
        roles: (check(a) || []).map((v) => v.role),
        institution: profile.institution_id || "",
      };
      if (active) setPersonal({ owner: uid, value });
    })().catch(() => {
      if (active) {
        setAccountError(
          "Your workspace could not load. Check your connection or contact the campus administrator.",
        );
        setPersonal(null);
      }
    });
    return () => {
      active = false;
    };
  }, [user?.id, revision]);
  const current = user && personal?.owner === user.id ? personal.value : blank;
  async function saveListing(id: string) {
    if (!user) throw new Error("Sign in to save this opportunity.");
    const t = requireDb().from("saved_opportunities");
    check(
      current.saved.includes(id)
        ? await t.delete().eq("user_id", user.id).eq("opportunity_id", id)
        : await t.upsert(
            { user_id: user.id, opportunity_id: id },
            { onConflict: "user_id,opportunity_id" },
          ),
    );
    refresh();
  }
  return {
    user,
    authLoading,
    skills,
    mappings,
    institutions,
    listings,
    catalogError,
    catalogLoading,
    ...current,
    accountLoading: !!user && !accountError && personal?.owner !== user.id,
    accountError,
    refresh,
    saveListing,
  };
}
const Store = createContext<ReturnType<typeof useBuildStore> | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useBuildStore();
  return <Store.Provider value={value}>{children}</Store.Provider>;
}
export function useStore() {
  const v = useContext(Store);
  if (!v) throw new Error("Workspace context missing");
  return v;
}
export function useBusy() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return useMemo(
    () => ({
      busy,
      message,
      setMessage,
      run: async (fn: () => Promise<void>, ok = "") => {
        setBusy(true);
        setMessage("");
        try {
          await fn();
          setMessage(ok);
        } catch (e) {
          setMessage(
            e instanceof Error ? e.message : "The operation failed. Try again.",
          );
        } finally {
          setBusy(false);
        }
      },
    }),
    [busy, message],
  );
}
