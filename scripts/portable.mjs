// Build the public review copy from the same React entry. Keep personal records on the hosted site.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { build } from "vite";
import react from "@vitejs/plugin-react";
const target = process.argv[2] || "dist/CHAMPUS.html";
const result = await build({
  configFile: false,
  plugins: [react()],
  envFile: false,
  publicDir: false,
  define: {
    "import.meta.env": JSON.stringify({
      MODE: "production",
      PROD: true,
      BASE_URL: "/",
    }),
  },
  build: {
    write: false,
    assetsInlineLimit: 100000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const output = (Array.isArray(result) ? result[0] : result).output;
const app = output.find((x) => x.type === "chunk" && x.isEntry);
const style = output.find(
  (x) => x.type === "asset" && x.fileName.endsWith(".css"),
);
let js = app.code;
let html = await readFile("index.html", "utf8");
const files = [
  "champus.svg",
  ...[
    "culinary-practice",
    "venture-workshop",
    "food-photography",
    "study-plan",
  ].map((s) => "images/" + s + ".webp"),
];
for (const path of files) {
  const buffer = await readFile("public/" + path);
  const url =
    "data:" +
    (path.endsWith("svg") ? "image/svg+xml" : "image/webp") +
    ";base64," +
    buffer.toString("base64");
  js = js.replaceAll("/" + path, url);
  html = html.replaceAll("/" + path, url);
}
html = html
  .replace("</head>", () => "<style>" + style.source + "</style></head>")
  .replace(
    /<script[^>]*src="\/src\/main\.tsx"[^>]*><\/script>/,
    () =>
      '<script type="module">' +
      js.replaceAll("</script", "<\\/script") +
      "</script>",
  );
await mkdir(dirname(target), { recursive: true });
await writeFile(target, html);
