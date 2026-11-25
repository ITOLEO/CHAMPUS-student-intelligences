import { createClient } from "@supabase/supabase-js";
const env = import.meta.env || {};
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url || key);
export const db =
  url && key && /^https?:\/\//.test(url) ? createClient(url, key) : null;
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
