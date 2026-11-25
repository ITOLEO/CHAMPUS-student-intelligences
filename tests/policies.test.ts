import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { sourceCatalog } from "../src/data/model";

const db = new PGlite();
const [student, peer, reviewer, curator, external, proof] = Array.from(
  { length: 6 },
  (_, i) => "00000000-0000-4000-8000-" + String(i + 1).padStart(12, "0"),
);
const listing = sourceCatalog[0],
  indicator = listing.data.skills[0].id;
const path = student + "/" + proof + ".pdf";
async function actor(id: string | null) {
  await db.exec("reset role;set role " + (id ? "authenticated" : "anon"));
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
  ]);
}
async function count(sql: string, params: unknown[] = []) {
  return (await db.query(sql, params)).rows.length;
}
before(async () => {
  await db.exec(`
 create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid stable language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage,public to authenticated,anon;
 grant select,insert,update,delete on storage.objects to authenticated;grant select on storage.objects to anon;`);
  for (const filename of [
    "202611240001_champus.sql",
    "202611240002_catalog.sql",
  ])
    await db.exec(await readFile("supabase/migrations/" + filename, "utf8"));
  for (const id of [student, peer, reviewer, curator, external])
    await db.query("insert into auth.users values($1)", [id]);
  await db.exec(
    "insert into institutions values ('another','Test institution')",
  );
  await db.query(
    "update profiles set institution_id='another' where user_id=$1",
    [external],
  );
  await db.query(
    "update profiles set institution_id='pib' where user_id=any($1::uuid[])",
    [[reviewer, curator]],
  );
  await db.query(
    "insert into staff_roles values ($1,'pib','reviewer'),($2,'pib','curator'),($3,'another','reviewer')",
    [reviewer, curator, external],
  );
});
after(() => db.close());
test("both production migrations create the public catalog, graph and private bucket", async () => {
  assert.equal(await count("select * from opportunities"), 4);
  assert.equal(await count("select * from skill_indicators"), 6);
  assert.equal(
    await count(
      "select * from courses join learning_outcomes l on course_id=courses.id join outcome_indicators m on m.outcome_id=l.id",
    ),
    1,
  );
  const b = (
    await db.query<{ public: boolean; file_size_limit: number }>(
      "select * from storage.buckets where id='evidence'",
    )
  ).rows[0];
  assert.equal(b.public, false);
  assert.equal(Number(b.file_size_limit), 8388608);
  await actor(null);
  assert.equal(await count("select * from opportunities"), 4);
  await assert.rejects(db.query("select * from evidence"));
});
test("account profile, practice, reflections and saves remain private to the owner", async () => {
  await actor(student);
  assert.equal(await count("select * from profiles"), 1);
  assert.equal(
    (
      await db.query<{ institution_id: string | null }>(
        "select institution_id from profiles",
      )
    ).rows[0].institution_id,
    null,
  );
  await db.query("select choose_institution('pib')");
  await assert.rejects(db.query("select choose_institution('another')"));
  await db.query(
    "update profiles set interests='photography' where user_id=$1",
    [student],
  );
  await db.query("insert into saved_opportunities values ($1,$2)", [
    student,
    listing.id,
  ]);
  await db.query(
    "insert into completed_resources(user_id,indicator_id) values ($1,$2)",
    [student, indicator],
  );
  await db.query(
    "insert into self_assessments values ($1,$2,'Practising','High')",
    [student, indicator],
  );
  await db.query("insert into confirmations values ($1,$2,1,$3,'yes')", [
    student,
    listing.id,
    listing.data.eligibility[0].id,
  ]);
  await actor(peer);
  for (const table of [
    "saved_opportunities",
    "completed_resources",
    "self_assessments",
    "confirmations",
  ])
    assert.equal(await count("select * from " + table), 0);
  await assert.rejects(
    db.query("insert into saved_opportunities values ($1,$2)", [
      student,
      sourceCatalog[2].id,
    ]),
  );
  await assert.rejects(
    db.query("insert into staff_roles values ($1,'pib','reviewer')", [peer]),
  );
  await assert.rejects(
    db.query("update profiles set institution_id='another' where user_id=$1", [
      peer,
    ]),
  );
});
test("the author can attach a private artifact and other students cannot read it", async () => {
  await actor(student);
  await db.query("insert into storage.objects values('evidence',$1)", [path]);
  await db.query(
    "insert into evidence(id,user_id,institution_id,indicator_id,title,description,file_path) values ($1,$2,'pib',$3,'Plate study','Shows the focal point',$4)",
    [proof, student, indicator, path],
  );
  assert.equal(await count("select * from evidence"), 1);
  await db.query("delete from storage.objects where name=$1", [path]);
  assert.equal(await count("select * from storage.objects"), 1);
  await actor(peer);
  assert.equal(await count("select * from evidence"), 0);
  assert.equal(await count("select * from storage.objects"), 0);
  await actor(external);
  assert.equal(await count("select * from evidence"), 0);
  assert.equal(await count("select * from storage.objects"), 0);
});
test("only an assigned teacher can record one review and the student can read it", async () => {
  const record = () =>
    db.query(
      "insert into reviews(evidence_id,reviewer_id,decision,feedback) values ($1,auth.uid(),'Verified','The central focal point is visible.')",
      [proof],
    );
  await actor(student);
  await assert.rejects(record());
  await actor(external);
  await assert.rejects(record());
  await actor(reviewer);
  assert.equal(await count("select * from storage.objects"), 1);
  assert.equal(await count("select * from evidence"), 1);
  await record();
  await assert.rejects(record());
  await actor(student);
  assert.equal(await count("select * from reviews"), 1);
  await actor(peer);
  assert.equal(await count("select * from reviews"), 0);
});
test("the review role cannot review its own submitted artifact", async () => {
  const own = "00000000-0000-4000-8000-000000000077";
  await actor(reviewer);
  await db.query(
    "insert into evidence(id,user_id,institution_id,indicator_id,title,description,link) values ($1,auth.uid(),'pib',$2,'Test work','Test note','https://example.org/work')",
    [own, indicator],
  );
  await assert.rejects(
    db.query(
      "insert into reviews(evidence_id,reviewer_id,decision,feedback) values ($1,auth.uid(),'Verified','Self review')",
      [own],
    ),
  );
});
test("publication, source checks, revision changes and withdrawal are enforced in the database", async () => {
  const id = "qa-listing";
  const data = { ...listing.data, id };
  const insert = () =>
    db.query(
      "insert into opportunities(id,institution_id,status,data) values ($1,'pib','draft',$2)",
      [id, JSON.stringify(data)],
    );
  await actor(peer);
  await assert.rejects(insert());
  await actor(curator);
  await insert();
  await actor(null);
  assert.equal(await count("select * from opportunities where id=$1", [id]), 0);
  await actor(curator);
  await assert.rejects(
    db.query(
      "update opportunities set status='published',data=jsonb_set(data,'{lastVerifiedAt}',to_jsonb('2000-01-01'::text)) where id=$1",
      [id],
    ),
  );
  await db.query(
    "update opportunities set status='published',data=jsonb_set(data,'{lastVerifiedAt}',to_jsonb((now() at time zone 'Asia/Makassar')::date::text)) where id=$1",
    [id],
  );
  await actor(null);
  assert.equal(
    await count("select * from opportunities where id=$1 and revision=2", [id]),
    1,
  );
  await actor(curator);
  await db.query("update opportunities set status='archived' where id=$1", [
    id,
  ]);
  await actor(null);
  assert.equal(await count("select * from opportunities where id=$1", [id]), 0);
});
