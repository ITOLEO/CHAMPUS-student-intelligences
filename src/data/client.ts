import { createClient } from "@supabase/supabase-js";
const env = import.meta.env || {};
const url = env.CHAMPUS_PUBLIC_URL || env.VITE_SUPABASE_URL;
const key =
  env.CHAMPUS_PUBLIC_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url || key);
export const previewMode =
  typeof window !== "undefined" &&
  /^\/preview(?:\/|$)/.test(window.location.pathname);
const previewAuth = {
  auth: {
    storageKey: "champus.preview.session",
    storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
    detectSessionInUrl: false,
  },
};
export const db =
  url && key && /^https?:\/\//.test(url)
    ? createClient(url, key, previewMode ? previewAuth : undefined)
    : null;
export function requireDb() {
  if (!db)
    throw new Error("Account access is unavailable. Please try again later.");
  return db;
}
export function check<T>(res: {
  data: T;
  error: { message: string } | null;
}): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
