import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import programs from "../src/data/programs.json";

test("managed accounts, curriculum, partner briefs, recommendations and access boundaries", async () => {
  const db = new PGlite();
  const [admin, student, peer, teacher, partner, outsider] = Array.from(
    { length: 6 },
    (_, i) => "00000000-0000-4000-8000-" + String(i + 21).padStart(12, "0"),
  );
  const query = (sql: string, args: unknown[] = []) =>
    db.query<Record<string, any>>(sql, args);
  const actor = async (id: string) => {
    await db.exec("reset role;set role authenticated");
    await query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  };
  const create = async (id: string, meta: object | null) => {
    await db.exec("reset role");
    await query(
      "insert into auth.users(id,email,raw_app_meta_data) values($1,$2,$3)",
      [id, id + "@example.invalid", JSON.stringify(meta)],
    );
  };
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
  create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb);
  create function auth.uid() returns uuid stable language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));alter table storage.objects enable row level security;
  grant usage on schema public,storage,auth to anon,authenticated,service_role;grant select,insert,update,delete on storage.objects to authenticated;`);
    for (const f of (await readdir("supabase/migrations")).sort())
      await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
    await assert.rejects(create(student, {}), /administrator/);
    await create(admin, {
      champus: {
        workspace: "admin",
        bootstrap: true,
        institution: "pib",
        name: "Test admin",
      },
    });
    await assert.rejects(
      create(outsider, {
        champus: {
          workspace: "admin",
          bootstrap: true,
          institution: "pib",
          name: "Second",
        },
      }),
      /already exists/,
    );
    for (const [id, workspace] of [
      [student, "student"],
      [peer, "student"],
      [teacher, "campus"],
      [partner, "industry"],
    ])
      await create(id, {
        champus: {
          actor: admin,
          workspace,
          institution: "pib",
          program: workspace === "student" ? "bizai" : "",
          cohort: workspace === "student" ? 2 : null,
          name: workspace,
        },
      });
    await actor(admin);
    assert.equal(
      (await query("select * from account_directory()")).rows.length,
      5,
    );
    await query("select assign_enrollment($1,$2,'Database')", [
      teacher,
      student,
    ]);
    await query("select assign_enrollment($1,$2,'Database')", [
      teacher,
      student,
    ]);
    assert.equal((await query("select * from teaching_roster")).rows.length, 1);
    await actor(partner);
    assert.equal(
      (await query("select * from account_directory()")).rows.length,
      0,
    );
    assert.equal((await query("select * from teaching_roster")).rows.length, 0);
    await assert.rejects(
      query("select manage_account($1,false,'bizai',2)", [student]),
    );
    const brief = (
      await query(
        "insert into partner_briefs(institution_id,organization,kind,title,brief) values('pib','Studio','Placement','Practice brief','Deliver a portfolio') returning id",
      )
    ).rows[0];
    await actor(teacher);
    await query(
      "update partner_briefs set status='In discussion', response='Identify a supervisor' where id=$1",
      [brief.id],
    );
    await actor(student);
    assert.equal((await query("select * from partner_briefs")).rows.length, 0);
    assert.equal(
      (await query("select * from program_lessons where program='bizai'")).rows
        .length,
      9,
    );
    for (const c of programs[0].courses) {
      const { rows } = await query(
        "select title,outcome,practice,artifact,definition from program_lessons join skill_indicators on skill_indicators.id=indicator_id where program_lessons.id=$1",
        ["bizai-" + c.id],
      );
      assert.equal(rows[0].outcome, c.outcome);
      assert.equal(rows[0].artifact, c.artifact);
      assert.equal(rows[0].definition.indicator, c.indicator);
    }
    await assert.rejects(
      query("update profiles set workspace='admin' where user_id=$1", [
        student,
      ]),
    );
    await assert.rejects(query("select choose_institution('pib')"));
    await assert.rejects(
      query(
        "select publish_practice('events','Events','Outcome','Practice','Criterion','Brief','https://example.org')",
      ),
    );
    const roster = (await query("select id from teaching_roster")).rows[0].id;
    const req = (
      await query(
        "insert into guidance_requests(roster_id,proposal,source) values($1,'Build a proof gallery','AI draft') returning id",
        [roster],
      )
    ).rows[0].id;
    const turn = (
      await query("select start_advisor_turn('What should I practise?') as id")
    ).rows[0].id;
    await query(
      "insert into evidence(user_id,institution_id,indicator_id,title,description,link) values($1,'pib','bizai-database','Schema','Join results','https://example.org/work')",
      [student],
    );
    await actor(peer);
    assert.equal(
      (await query("select * from guidance_requests")).rows.length,
      0,
    );
    assert.equal((await query("select * from advisor_turns")).rows.length, 0);
    await actor(teacher);
    assert.equal(
      (await query("select * from advisor_turns where id=$1", [turn])).rows
        .length,
      0,
    );
    assert.equal((await query("select * from evidence")).rows.length, 1);
    await query(
      "update guidance_requests set decision='Revise',feedback='Test a join first' where id=$1",
      [req],
    );
    await query(
      "select publish_practice('events','Event briefing','Explain a brief','Write a brief','Name the audience','One brief','https://example.org/guide')",
    );
    await actor(student);
    assert.equal(
      (await query("select feedback from guidance_requests")).rows[0].feedback,
      "Test a join first",
    );
    for (let i = 0; i < 11; i++)
      await query("select start_advisor_turn('Course question')");
    await assert.rejects(
      query("select start_advisor_turn('Course question')"),
      /ten minutes/,
    );
    await actor(admin);
    await query("select manage_account($1,false,'bizai',2)", [student]);
    await actor(student);
    assert.equal((await query("select * from advisor_turns")).rows.length, 0);
    assert.equal((await query("select * from evidence")).rows.length, 0);
    await assert.rejects(query("select start_advisor_turn('Course question')"));
    // Exercise the same Auth triggers and seed transaction used by the live preview endpoint.
    const runId = "1d841a9d-50ca-4c7b-a6a0-f2a63b0124d4";
    await actor(peer);
    await assert.rejects(
      query("select reserve_demo($1,repeat('a',64))", [runId]),
    );
    await db.exec("reset role;set role service_role");
    await query("select reserve_demo($1,repeat('a',64))", [runId]);
    await db.exec("reset role");
    const ids = [
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
      "10000000-0000-4000-8000-000000000003",
    ];
    for (const [i, role] of ["student", "campus", "industry"].entries()) {
      await query(
        "insert into auth.users(id,email,raw_app_meta_data) values($1,$2,$3)",
        [
          ids[i],
          role + "-demo+" + runId + "@preview.champus.invalid",
          JSON.stringify({ champus_demo: { run: runId, role } }),
        ],
      );
    }
    await db.exec("set role service_role");
    await query("select seed_demo($1)", [runId]);
    await query("select seed_demo($1)", [runId]);
    assert.equal(
      (await query("select * from demo_members($1)", [runId])).rows.length,
      3,
    );
    for (const id of ids) {
      await actor(id);
      assert.equal(
        (await query("select * from demo_directory()")).rows.length,
        0,
      );
      assert.equal(
        (
          await query("select * from program_lessons where institution_id=$1", [
            "demo-" + runId,
          ])
        ).rows.length,
        9,
      );
    }
    await actor(ids[0]);
    assert.equal(
      (await query("select * from curriculum_tasks")).rows.length,
      1,
    );
    assert.equal(
      (await query("select decision from reviews")).rows[0].decision,
      "Needs revision",
    );
    await actor(ids[1]);
    assert.equal((await query("select * from industry_needs")).rows.length, 1);
    await query(
      "update guidance_requests set feedback='Show the join result',decision='Recommended'",
    );
    await actor(ids[0]);
    assert.equal(
      (await query("select feedback from guidance_requests")).rows[0].feedback,
      "Show the join result",
    );
    await actor(teacher);
    assert.equal(
      (
        await query("select * from curriculum_tasks where institution_id=$1", [
          "demo-" + runId,
        ])
      ).rows.length,
      0,
    );
    await actor(admin);
    assert.equal(
      (await query("select * from demo_directory()")).rows.length,
      3,
    );
    await db.exec("reset role;set role anon");
    assert.equal(
      (
        await query("select * from program_lessons where institution_id=$1", [
          "demo-" + runId,
        ])
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
