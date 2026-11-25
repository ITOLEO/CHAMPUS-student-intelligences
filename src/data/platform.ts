import { useEffect, useState, type DependencyList } from "react";
import programs from "./programs.json";
import { requireDb } from "./client";

export { programs };
export const programName = (id: string) =>
  programs.find((p) => p.id === id)?.title || id;
export type WorkspaceKind = "student" | "campus" | "industry" | "admin";
export const homeFor = (kind: WorkspaceKind | null) =>
  kind === "student" || !kind ? "/overview" : "/" + kind;
export const workspaceNames = {
  student: "Student",
  campus: "Campus",
  industry: "Industry",
  admin: "Admin",
};
export async function postAction<T>(path: string, body: unknown): Promise<T> {
  const { data, error } = await requireDb().auth.getSession();
  if (error || !data.session) throw new Error("Sign in again to continue.");
  const res = await fetch("/api/" + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + data.session.access_token,
    },
    body: JSON.stringify(body),
  });
  const dataBody = await res.json().catch(() => null);
  if (!res.ok || !dataBody)
    throw new Error(dataBody?.error || "The campus server is unavailable.");
  return dataBody as T;
}
export function readRows<T>(result: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
export function useRecords<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, set] = useState<T | null>(null),
    [error, fail] = useState(""),
    [version, update] = useState(0);
  useEffect(() => {
    let active = true;
    set(null);
    fail("");
    load()
      .then((result) => {
        if (active) set(result);
      })
      .catch(() => {
        if (active)
          fail(
            "Records could not load. Check your connection and the campus database setup.",
          );
      });
    return () => {
      active = false;
    };
  }, [...deps, version]);
  return { data, error, reload: () => update((x) => x + 1) };
}
