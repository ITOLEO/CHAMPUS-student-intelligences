import { readFileSync, writeFileSync } from "node:fs";
const data = JSON.parse(readFileSync("src/data/catalog.json", "utf8"));
const lit = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const json = (v) => lit(JSON.stringify(v)) + "::jsonb";
const sql = ["begin;"];
for (const s of new Map(
  data.opportunities.flatMap((o) => o.skills).map((s) => [s.id, s]),
).values()) {
  sql.push(
    "insert into public.skill_indicators(id,definition) values(" +
      lit(s.id) +
      "," +
      json(s) +
      ");",
  );
}
for (const mapping of data.academicMappings) {
  sql.push(
    "insert into public.courses values(" +
      [mapping.id, "pib", mapping.course, mapping.sourceUrl]
        .map(lit)
        .join(",") +
      ");",
    "insert into public.learning_outcomes values(" +
      [mapping.id, mapping.id, mapping.outcome, mapping.sourceUrl]
        .map(lit)
        .join(",") +
      ");",
    "insert into public.outcome_indicators values(" +
      [mapping.id, mapping.microSkillId, mapping.mappingStatus]
        .map(lit)
        .join(",") +
      "," +
      json(mapping) +
      ");",
  );
}
for (const o of data.opportunities) {
  sql.push(
    "insert into public.opportunities(id,institution_id,status,data) values(" +
      lit(o.id) +
      ",'pib','published'," +
      json(o) +
      ");",
  );
}
sql.push("commit;", "");
writeFileSync("supabase/migrations/202611240002_catalog.sql", sql.join("\n"));
