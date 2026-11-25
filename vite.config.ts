import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["SUPABASE_URL", "SUPABASE_KEY"]);
  const key = env.SUPABASE_KEY || "";
  if (key && !key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_KEY must contain a Supabase publishable key (sb_publishable_...).",
    );
  }
  return {
    define: {
      "import.meta.env.CHAMPUS_PUBLIC_URL": JSON.stringify(
        env.SUPABASE_URL || "",
      ),
      "import.meta.env.CHAMPUS_PUBLIC_KEY": JSON.stringify(key),
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/node_modules/@supabase/")) return "supabase";
          },
        },
      },
    },
  };
});
