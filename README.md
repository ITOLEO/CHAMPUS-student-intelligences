# CHAMPUS

CHAMPUS connects formal courses, workplace needs and personal learning goals. A visitor opens the public introduction at the domain root. Each public feature has an explanation, a worked example, and a link to its workspace. A signed-in account opens its assigned dashboard.

## Workspaces

| Workspace | Main actions |
|---|---|
| Student | Explore the program guide, set a goal, practise indicators, submit evidence, read reviews, discover opportunities and request guidance. |
| Campus | Read industry needs, publish practice, assign course tasks, monitor roster progress, review evidence and learning proposals, and respond to partners. |
| Industry | Maintain an organization profile, publish a skill need, submit project and placement briefs, and follow campus decisions. |
| Admin | Create accounts, place students in programs and cohorts, assign enrollments, approve existing students, suspend or restore access, and inspect the account history. |

Students, campus staff and partners have private AI conversations. A student can choose to share selected learning context with Gemini. They can edit a single suggestion and send it to the lecturer for an enrolled course. Only the lecturer makes the academic decision.

## Run and deploy

Use Node.js 22.12 or later. Run `npm ci`, `npm test` and `npm run build` at the repository root. Use `npm run dev` for the Vite frontend. Use `vercel dev` for local development with the server API routes. Vercel builds the frontend into `dist` and runs the handlers in `api/`. A static or portable export supports the public guide. Account creation and AI chat require the server functions.

## Activate the managed workspaces

1. Apply the SQL migrations in filename order to the Supabase project for CHAMPUS. An installation with the three earlier migrations needs the [managed platform migration](supabase/migrations/202611260001_managed_platform.sql) followed by the [demo migration](supabase/migrations/202611260002_demo_workspaces.sql). The managed platform migration changes the new-user trigger on Supabase Auth. Use a dedicated CHAMPUS Auth project, since this trigger governs account creation in that project.
2. In Supabase Authentication, enable the Email provider and turn off **Allow new users to sign up**. Set the Site URL to the production origin. Allow the exact site’s `/sign-in**` recovery destination. Configure email delivery for password recovery. [Auth configuration](https://supabase.com/docs/guides/auth/general-configuration) · [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
3. In Vercel, set the variables below for the intended environment. Redeploy after changing them. Keep server secrets out of all `VITE_*` variables and source files.
4. Assign the first trusted administrator using one method below. Sign in to the Admin workspace. Create each account with its email, name, initial password and role. Select the program and cohort for students. Deliver the credentials through the institution’s private channel.
5. Under **Assign a course**, choose a student and a lecturer. Enter the actual course title. Use the title from the program guide when the enrollment covers a published practice. The lecturer can then assign coursework, review evidence and respond to a learning proposal.

| Vercel variable | Use |
|---|---|
| `SUPABASE_URL` | The CHAMPUS project URL. |
| `SUPABASE_KEY` | The existing Supabase publishable key. The frontend uses this value with RLS. |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key. The account endpoint calls Auth Admin. The AI endpoint completes its reserved conversation turn. |
| `GEMINI_API_KEY` | Server-only credential for the Gemini API. |
| `GEMINI_MODEL` | The model ID enabled for this key that supports `generateContent`. Use the ID without the `models/` prefix. |

The caller’s verified identity and database role determine access. The browser cannot assign a role by sending one in a request. Managed Auth creates the identity, profile, role and access event in the same database transaction. The AI endpoint reads learning context with the caller’s RLS permissions. An unavailable provider returns an explicit error. [Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser) · [Gemini model catalog](https://ai.google.dev/gemini-api/docs/models)

### First administrator

For an existing, verified institution operator, copy their Auth UUID from Supabase. Replace the placeholder in this transaction. Run it once from the SQL Editor. It promotes an existing profile at the selected institution. Review historical staff assignments when choosing the operator.

```sql
begin;
do $$
declare operator_id uuid := '<verified-auth-user-uuid>'; inst text := 'pib';
begin
  perform pg_advisory_xact_lock(2136739901);
  if exists(select from public.profiles where workspace='admin') then
    raise exception 'An administrator already exists';
  end if;
  update public.profiles set institution_id=inst, workspace='admin', enabled=true
    where user_id=operator_id and (institution_id is null or institution_id=inst);
  if not found then raise exception 'No matching campus profile'; end if;
  insert into public.staff_roles values(operator_id,inst,'admin') on conflict do nothing;
  insert into public.account_events(institution_id,target_id,event) values(inst,operator_id,'Bootstrapped administrator');
end $$;
commit;
```

For a new institution operator without an Auth identity, apply the migrations first. On a trusted machine, supply the project URL and server secret in the process environment. Run `node scripts/bootstrap-admin.mjs "operator@your-institution.example" "Operator name" pib` using the actual verified email. The operator uses **Forgot password** to set their password. This method works once per installation.

### Existing accounts

The migration preserves existing records. It maps assigned teaching, review, curation and industry roles to their workspaces. Existing students await administrator approval. In **Account directory**, choose **Approve existing student**, then specify a program and cohort. An account without an institution requires a trusted operator to verify its owner and assign the correct institution in the SQL Editor before it appears in that directory. Suspension takes effect on subsequent protected database and API requests, including requests from existing sessions.

## Academic scope

The public guide includes Business Technology & AI Innovation, Culinary Arts, Hotel Management and Event Management, with cohort values 1 through 4. The nine BIZAI briefs contain practical outcomes, indicators, artifacts, sources and two career examples. They are CHAMPUS materials. Lecturers can add sourced practice for the other programs. The institution owns its official syllabi, credit rules and assessments.

Read the [research and NEXORA design decisions](docs/PLATFORM-RESEARCH.md), the [academic design record](docs/AGILE-CURRICULUM.md) and the [opportunity sources](docs/CATALOG-SOURCES.md). The earlier specification and handoff describe project history. This access and deployment guide applies to the four-workspace release.

## Passwordless workspace previews

Apply the [fifth migration](supabase/migrations/202611260002_demo_workspaces.sql) once after the four earlier migrations. The existing Vercel server secret provisions the three preview users through Supabase Auth on first use. A signed browser cookie reconnects the three roles to the same sample campus for seven days. The preview uses separate session storage so switching roles preserves the visitor's normal account session.

Select **Try demo** next to sign-in or in the profile. Choose Student, Campus or Industry. Open the Database task as the student and read the sample revision. Switch to Campus through the account menu to review the guidance proposal. Return to Student to see the feedback. Industry and Campus share the same studio brief. All sample accounts and activities are stored in Supabase. Internal staff can inspect the accounts and preview IDs in **Demo accounts**. The understated **Access history** link in the public footer checks internal account access. The public preview offers the three learning roles.

The preview creates synthetic addresses of the form `student-demo+<preview-id>@preview.champus.invalid`. The server checks role ownership and exchanges a single-use Supabase sign-in link. No shared password or email inbox is required.
