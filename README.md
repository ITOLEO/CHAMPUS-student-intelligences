# CHAMPUS

GOOGLEHACKATHON-PIB-BD3

CHAMPUS connects a student's evidence, a development need and a real opportunity. The public site opens before account access. The signed-in workspace supports three student workflows and two limited staff tasks. The interface uses English.

## Run the source

Open the repository root in a terminal. Use Node.js 22.12 or later.

```sh
npm ci
npm test
npm run build
npm run dev
```

Vite serves the app on port 5173 by default. In a Codespace, open the forwarded application port. To produce the portable HTML again, run `node scripts/portable.mjs ../CHAMPUS.html`. The production web server should serve the Vite `dist` directory and use SPA fallback for application routes.

## Connect Supabase

1. Open a new Supabase project for CHAMPUS. Use the SQL Editor or your standard migration runner to apply both SQL files once, in this order.
   - `supabase/migrations/202611240001_champus.sql` creates tables, triggers, row-level policies and the private evidence bucket.
   - `supabase/migrations/202611240002_catalog.sql` loads public institutions' course context, indicators and the initial opportunity catalog. The first migration creates the PIB institution.
2. In Authentication, enable Email and new-user signups for the pilot. Configure an email sender that can deliver magic links to student addresses. Supabase's default sender can be restricted. Set the **Site URL** to the exact production origin. Add the trusted sign-in return URL to the redirect allow list for each intended environment. For a Vercel production site use `https://<your-domain>/sign-in**` with your exact hostname. Limit preview origins to deployments under your control. [Passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
3. In the Vercel project settings, enter `SUPABASE_URL` and `SUPABASE_KEY`. Set the latter to the publishable key that starts with `sb_publishable_`. The existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` names also work. Vite bundles each exposed variable into the frontend. Keep secret and service-role keys outside all `VITE_` variables. For private local testing, copy `.env.example` to `.env.local` and enter the local project's public values.
4. Use the Vite framework preset, build command `npm run build` and output directory `dist`. If only the contents of **source/** go into the repository, use its root. If the entire delivery package goes into the repository, set **Root Directory** to `source`. Redeploy after changing the variables.
5. Sign in as the first student. Choose a reviewing institution in **My profile** before submitting evidence. Uploads accept a PDF, JPEG, PNG or WebP up to 8 MiB. A reviewer requests a two-minute signed link to open private work.

### Give an authorized teacher or curator access

Verify the staff member's role and institution outside the student app. Have the staff member sign in and choose the institution. In the Supabase SQL Editor, replace the placeholder with the real authenticated user UUID. Run only the assignment that is appropriate. A reviewer evaluates work. A curator publishes opportunities. Assignment within one institution grants access only for that institution.

```sql
insert into public.staff_roles (user_id, institution_id, role)
values ('<staff-user-uuid>'::uuid, 'pib', 'reviewer')
on conflict do nothing;
```

For a curator, use the role value `curator`. For another institution, provision its own identifier, staff and academic sources before student use. Adding an institution does not add verified academic mappings.

## Curate and verify content

Use **Staff workspace** to create a draft, attach an indicator and check the organizer's source, date and rules. Publish after review. Edit against the current revision to avoid overwriting concurrent changes. Archive a withdrawn record. For a new official skill or academic mapping, add a reviewed migration. Rerunning the initial seed on a live project can conflict with existing records. The public portable snapshot can be regenerated from `src/data/catalog.json`. To regenerate the clean-install seed from the reviewed JSON, use `node scripts/seed.mjs`.

## Release materials

- `docs/CHAMPUS-SPEC.md` gives the requirements, references, screen behavior and student acceptance journey.
- `docs/CATALOG-SOURCES.md` records official sources, uncertainty and the proposed PIB academic mapping.
- `docs/VERIFICATION.md` lists local checks and live checks that need the deployed system.
- `docs/IMAGE-SOURCES.txt` identifies the illustrative artwork.
- `src/recommendation/recommendationEngine.ts` contains eligibility, deadlines and indicator readiness.
- `tests/` exercises the React routes, recommendation logic and both SQL migrations.

## Sign in with a password

Use the Email provider in Supabase Auth. CHAMPUS accepts an existing password or a secure email link. Accounts created through an email link can use **Forgot password?** to set a password. Allow the production origin's /sign-in redirect, including the recovery query parameters, in Supabase Authentication URL Configuration.

## Activate the three dashboards

On an existing CHAMPUS database with both initial migrations applied, run **supabase/migrations/202611250001_agile_curriculum.sql** once. For a fresh database run all three migration files in filename order. The new migration preserves existing opportunity, profile and evidence records. Each signed-in user can access the student plan. The teacher and industry routes check assigned roles. The existing reviewer role retains its original institution-wide review rights. Use the teacher role alone for a course-scoped instructor.

In Supabase SQL Editor, assign verified users who have already selected the same institution. Replace each placeholder with an actual registered account, program or course. Run the statements only for authorized participants.

```sql
insert into public.staff_roles (user_id,institution_id,role) values
 ('<teacher-uuid>','pib','teacher'),
 ('<partner-uuid>','pib','industry')
on conflict do nothing;

insert into public.teaching_roster
 (institution_id,teacher_id,student_id,program,course,student_label)
values ('pib','<teacher-uuid>','<student-uuid>','<formal program>','<formal course>','<student display name>')
on conflict do nothing;
```

Open the industry desk and publish a need. In the teacher account, choose that need and an authorized course enrollment. Record the formal outcome, task, and observable indicator. In the student account, open the assigned task from My learning plan, then submit evidence. Review it in the teacher account. Industry accounts have no access to the roster, student personality or student submissions through the industry role.
