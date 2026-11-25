# Release verification

Release candidate prepared on 25 November 2026, WITA. Run the commands from the source root. The local tests use temporary identities and isolated data. The release catalog contains real sourced opportunities. No test identity is shipped as a user account.

| Check | Local result | Evidence |
|---|---|---|
| Installation and production compilation | PASS | A clean npm install from the lockfile, TypeScript check and Vite production build complete. |
| Public routes and account gate | PASS | Six React DOM tests cover the landing page, query reset, direct opportunity page, yes/no eligibility, sourced learning page, sign-in return path and keyboard menu dismissal. |
| Matching and dates | PASS | Ten model tests check the three eligibility outcomes, five readiness states, reviewed evidence, inclusion of the closing day, an exclusive deadline, an exact cutoff, graph traversal and catalog provenance. |
| PostgreSQL migration and access policies | PASS | Six integration tests apply both migration files in PGlite. They run the SQL as a visitor, two students, a curator, a local teacher and a teacher at another institution. |
| Public materials | PASS | Four published opportunities link to six distinct indicators and their practice materials. One academic link is explicitly pending institutional review. |
| Portable public HTML | PASS | Package check verifies the embedded application, fonts, images and hash-route navigation in a DOM runtime. |
| Visual inspection at desktop and mobile widths | UNVERIFIED | The managed browser preview relay timed out. DOM checks cover document structure and menu behavior. Pixel layout and keyboard operation on a physical phone still need a browser pass. |
| Hosted Auth, email and Storage | UNVERIFIED | The site owner enters production configuration privately. Local tests check the SQL policies. Delivery, session persistence across devices, and signed file delivery require the actual project. |
| Production URL | UNVERIFIED | Vercel deployment is outside this delivery. |

## Run the reproducible checks

```sh
npm ci
npm test
npm run build
node scripts/portable.mjs ../CHAMPUS.html
node scripts/check-portable.mjs ../CHAMPUS.html
```

PGlite executes the real migration SQL with small local definitions of Supabase's user identity and Storage metadata. The tests exercise grants, policies, revision checks and table behavior. Supabase email, PostgREST, object transfer and Vercel run as hosted services during the final acceptance check.

## Final check on the deployed URL

1. Open the landing page as a visitor on a desktop and a phone. At 320 CSS px, check for horizontal overflow. Tab through the menu, search and sign-in controls. Repeat with a keyboard and 200% zoom.
2. Sign in through an actual email link. Open a saved return URL. Edit the profile and choose the reviewing institution. Reload and check the stored data.
3. Save a published opportunity. Confirm a hard condition. Open an indicator, record a reflection, finish its resource and submit a small real practice artifact with permission.
4. Use a second authorized account with the institution's reviewer role. Read the submission and record indicator-specific feedback. Reload the student's account and read that feedback. Check the resulting readiness.
5. Sign in as a different student. Confirm that the submission and file are private. Request a fresh authorized file link as the original student. It expires after two minutes.
6. Use a curator account to check and publish an official record. Edit a mandatory condition, confirm the date, and publish again. Verify that a student's prior confirmation requires renewal. Archive a withdrawn listing and check public discovery.
7. Open an available organizer destination. Record whether the destination opened. Only the organizer can confirm application submission.
