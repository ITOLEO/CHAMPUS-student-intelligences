# CHAMPUS
## Product, interface, data and release specification

**Edition 1 · 24 November 2026 · CEO Laguna · GDGoC ITB STACK 2026**

Use this document to build the student journey, review changes and decide whether to release. Use short sentences, active verbs and one term for one concept. This document adapts ASD-STE100 principles for a web product. Its writing style is a project choice. Formal certification and a numerical compliance score are outside its claims.

### 1. Product contract

Help a student answer three questions. Which opportunity can I apply for? Which capabilities can I demonstrate? What should I do next? Provide one complete journey for an undergraduate at a participating institution. Use Politeknik Internasional Bali (PIB) as the first institutional context. Keep institution identifiers in the data model. A later institution can supply its own courses, learning outcomes, opportunity rules and reviewers.

The abstract names CHAMPUS and team CEO Laguna. The abstract reports 36 respondents. It reports 86% had difficulty identifying skills to develop, 72% were unsure about eligibility and 92% wanted explanations. These figures establish questions for usability testing. The team has not supplied raw responses, campus sampling details or interview transcripts. Keep research claims out of the landing page until their provenance supports publication.

The handoff records a preliminary score of 77/100 and feasibility of 3/5. Address feasibility with a dated delivery target and a verifiable opportunity lifecycle. The owner's target is Thursday 26 November 2026, WITA. The organizer lists 30 November for semifinal submission and 16 December for Final Day. The owner has not specified an internal cutoff hour. [Organizer timeline](https://gdgoncampusitb.com/hackathon)

### 2. Authority and evidence

Use the owner's latest instruction for implementation and environment choices. Use the competition abstract for product intent. Use sections 5–9 of CHAMPUS_MASTER_CONTEXT_HANDOFF_CODEX for MVP behavior. Use the original NEXORA ZIP (3) as the source baseline. Use the two Prompt Engineering modules for specification and review. Use Vonta as a design reference. Limit archived requirements to historical context.

Apply FACT to source-backed claims. Use DECISION for a chosen product behavior. Use ESTIMATE for an approximate quantity. Use UNKNOWN until an owner, curator or teacher supplies evidence. Distinguish a source fact, a learning suggestion and a decision about a student. Record the actual source for each opportunity and indicator. Keep an empty state when a source is missing.

### 3. People and permissions

| Person | Tasks | Access |
|---|---|---|
| Visitor | Understand the product, browse published information, inspect requirements and open the organizer's source | Public descriptions, rules and resources |
| Student | Sign in, edit a profile, inspect a match, save an opportunity, submit work and read feedback | The user's own records and the public catalog |
| Teacher | Open submitted work, evaluate the selected indicator, write feedback and record a decision | Assigned institution and review role |
| Curator | Create or edit a listing, check its source, publish it and archive it | Assigned institution and curator role |

Assign staff roles outside the student interface. Use the signed-in identity for access checks. Keep private evidence out of search results for visitors and other students. A teacher must never review their own submission.

### 4. Scope and screen map

Deliver three student workflows. The first combines profile, competencies and evidence. The second combines discovery and opportunity details. The third combines rule-based matching, a skill gap and a learning action. Give staff a small curation and review area. The course graph and matching engine support the workflows internally.

| Screen | Required content | Main action and exit |
|---|---|---|
| Landing | Product name, value statement, real opportunity and actual learning example | Explore the catalog or sign in |
| Sign in | Email, account-access method, request result and recovery path | Return to the requested local destination after authentication |
| Overview | Discover opportunities, relevant published results and personal progress when present | Open a specific opportunity |
| Opportunities | Text search, category, deadline, saved items for the owner and result count | Open details or clear filters |
| Opportunity details | Official source, last check, deadline, eligibility rules, skill indicators, evidence and a learning resource | Confirm a rule, open a resource, save or visit the official application |
| My profile | Name, program, semester, interests, goals, evidence and feedback | Save changes or submit evidence |
| Skill development | Skill, micro-skill, observable indicator, self-assessment, student confidence, related work and resource | Open practice and submit work for one indicator |
| Staff | Curation and evidence review according to role | Publish, archive, verify, or request revision |

A public link must survive reload and browser Back. A signed-out visit to private content must preserve its destination across sign-in. Keep all visible interface copy in English. Release the student workspace with real authentication. Show a clear configuration or connection state if access is unavailable.

### 5. Interaction and layout

Use the public page to introduce the journey. Pair a large Manrope heading with a single useful explanation. Show a culinary practice image as an illustration. Give public opportunity discovery a working entry even before sign-in. Do not attribute an illustrative photograph to a named institution or student.

At desktop width, keep navigation stable. Group search, filters and results. Put the most important detail in the main reading column. Use the secondary column for time, source, save and application information. On a phone, keep the title, closing date and status near the beginning. Stack rules and the next action in reading order. Preserve labels for account and navigation controls. Let controls wrap. Use visible keyboard focus and real links. Menus must close through a predictable control. A screen reader must receive form labels and status messages.

Use Manrope for display and headings. Use Inter for reading and controls. Start with 32/40 px for a workspace heading, 20/28 px for a section heading, 16/24 px for reading and 14/20 px for controls. Let the landing headline scale with the viewport. Use neutral light surfaces, deep navy text and indigo as the main action color. Use status text with color. Keep the palette configurable. The owner has not locked the final palette.

Use sentence case for actions. Prefer “Save opportunity”, “Submit evidence” and “Needs confirmation”. Show one instruction per action. Avoid fake progress, filler badges and repeated slogans. An empty results view must provide a reset. An empty personal workspace must provide an action to start it. A failed write must retain entered text and permit retry.

The Supabase screenshots support a compact toolbar and a distinct public page. YouTube supplies a useful title and metadata hierarchy. Drive supports a search-first directory. Vonta supplies a local example of responsive layouts and the chosen font pair. [Supabase design system](https://supabase.com/design-system) · [YouTube design notes](https://blog.youtube/news-and-events/introducing-fresh-new-look-for-youtube/) · [Drive discovery](https://support.google.com/drive/answer/2424384?hl=en) · [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

### 6. Academic model

Follow this path when a complete academic record exists.

Course → Learning outcome → Competency cluster → Specific skill → Micro-skill → Observable indicator → Evidence and rubric result.

Give each link an identifiable source or an institutional reviewer. Map a resource to a micro-skill. Map an opportunity to required or recommended capabilities. Store the person, date and decision for a review. Keep five distinct inputs: self-assessment, self-reported confidence, observed performance artifact, teacher feedback, and review decision. A confidence label describes a student's own reflection. A reviewer can verify the specific indicator supported by the artifact. A picture can support a plating-composition indicator. A photograph alone cannot establish flavor, food temperature or the student's full professional competence.

Use the public PIB material as evidence of educational context. Record the official organizer rubric as the source for a competition indicator. Publish a course-to-outcome relationship only where the course and the outcome are supported. Leave the link open for teacher validation if its source is missing. Preserve the useful opportunity-to-practice path in this case.

Constructive alignment connects outcomes, activities and assessment. Self-assessment accuracy varies across contexts. These findings justify keeping the student's reflection and the reviewed artifact distinct. [Biggs](https://doi.org/10.1007/BF00138871) · [León and colleagues](https://doi.org/10.1007/s10648-023-09819-0) · [PIB curriculum catalog](https://elearning.pib.ac.id/course/)

### 7. Eligibility and skill readiness

Evaluate each mandatory rule independently. Cite the organizer. Distinguish a hard condition from a practical instruction or a preferred skill. Record a student's explicit confirmation with the opportunity and the rule. Invalidate old confirmations after the rules change. If any known mandatory condition fails, show Not eligible. If all published mandatory conditions pass, show Eligible. If any required information remains unknown and no known rule fails, show Needs confirmation. A record with no usable rules needs confirmation. Label the result as guidance based on the recorded information. The organizer decides admission.

A closed opportunity has a separate publication or timing state. Exclude it from active discovery and recommendations. Keep a direct detail URL readable for a saved record. Never use a fixed demonstration date. Use a canonical closing instant with a time zone. For a date-only deadline, distinguish the organizer's published date from the local end-of-day convention. Format the date for humans. Keep the original organizer time zone available. Test equality at the boundary.

Use Evidence available, Partial evidence, Self-reported only, Development suggested and Not assessed as descriptive readiness states. Missing evidence does not demonstrate low ability. Explain each result with the matching profile data, mandatory criterion, source relationship, or reviewed indicator. If no personal information exists, display general relevance and the source requirements. Keep resource completion separate from evidence verification. An external application click establishes only that the destination was opened.

### 8. Opportunity curation

Each published record needs a title, organizer, category, source URL, reviewed date, destination if available, closing date or explicit uncertainty, eligibility conditions and a mapping to at least one relevant skill when known. Accept official sources. Keep unresolved details visible. Recheck a change to deadline, destination or eligibility before publication. Archive closed or withdrawn records. Do not publish an application URL taken from an unrelated event. Do not copy an old deadline into a new edition.

Use Culinary Plating as the first end-to-end case. The source admits students in teams of 2–3 and includes a presentation rubric. A curator can map the visual composition criterion to a practice resource. A student without known team size needs confirmation. A student can satisfy registration conditions while their skill still has no reviewed evidence. Retain alternative relevant records after this short-window event closes.

Handshake provides a precedent for curator approval. Suitable connects development with opportunities. Degreed identifies different kinds of skill signals. Moodle supports student evidence and review. Use these as design references. [Handshake](https://support.joinhandshake.com/hc/en-us/articles/218693228-Understanding-Job-Posting-Approvals) · [Suitable](https://www.suitable.co/solutions/student-development-skill-acquisition) · [Degreed](https://degreed.zendesk.com/hc/en-us/articles/4411150604050-Skill-Signals-Overview-for-Learners) · [Moodle](https://docs.moodle.org/en/Competencies)

### 9. Storage and authentication

Keep the supplied React, TypeScript and Vite entry. Use Supabase Auth, PostgreSQL and private Storage. Use a publishable key in the browser. Configure it through Vercel environment variables. Store the service credential outside the frontend. The owner supplies production variables directly.

Use PostgreSQL row-level security for preferences, saved opportunities, confirmations, evidence, roles and published records. Use a private bucket for artifacts. Generate a short-lived download link after the access policy authorizes the request. Validate file type and size. Keep a failed or interrupted upload from creating a verified record. Store feedback and reviewer identity together. Permit only one final review for a pending submission. Keep historical submissions when a student submits a revision.

Offer a source-backed public catalog for the unconfigured build. When a configured database fails, show the error. Respect withdrawals and publication changes from the configured database. Do not substitute seed data after a live read failure. Keep private actions disabled or gated until a valid session exists. [Supabase Auth](https://supabase.com/docs/guides/auth) · [PostgreSQL RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Private files](https://supabase.com/docs/guides/storage/buckets/fundamentals)

### 10. Baseline corrections and implementation order

1. Preserve the submitted ZIP and identify its imports before code replacement. Remove active Lecturer, Industry and Security Console navigation and their server endpoints.
2. Introduce public routes and a protected account shell. Replace the local role picker with session identity.
3. Replace the dated recommendation clock and string comparison. Remove manufactured relevance scores, durations and positions.
4. Adapt graph traversal and resource mapping. Introduce indicator-scoped evidence and explanations.
5. Implement the student journey and the two staff operations. Validate database policies and verify desktop/mobile behavior.
6. Package the source, guide and reproducible release checks. Deploy through the owner's selected GitHub and Vercel setup when available.

Use Analyze → Specify → Scaffold → Build → Review → Fix. The full prompt module supplies the specification blocks. The shorter module supplies an output audit. For this edition, the role is the project developer. The goal and constraints appear in sections 1–3. Screens, tokens, states and behaviors appear in sections 4–9. The release output and acceptance checks appear below. A missing requirement is a PROMPT GAP. A departure from a clear requirement is a BUILDER ERROR. Recheck every correction against the affected acceptance case.

Boris Cherny describes test-first work and giving a coding tool a result it can verify at approximately 14:25–15:05 in his public talk. Use a failing example, execute the check, and inspect the result. The owner did not identify an exact recent upload. [Boris Cherny, recorded talk](https://www.youtube.com/watch?v=Lue8K2jqfKk&t=865s) · [Anthropic best practices](https://code.claude.com/docs/en/best-practices)

### 11. Acceptance matrix

| Check | Evidence required |
|---|---|
| Visitor opens the root and a direct opportunity URL | Correct public content and a working local navigation path |
| Unknown, failed and complete mandatory criteria | Deterministic results for all three outcomes |
| A recommended skill has no evidence | Eligibility remains independent |
| A deadline passes | Active results exclude the record at the boundary |
| A student opens a resource | Resource is connected to the selected indicator |
| A student submits an artifact | It remains pending until an authorized teacher acts |
| A teacher requests revision | The owner sees dated feedback and can submit new work |
| A different student reads private work | Database denies access and Storage denies download |
| A student changes a staff role or review result | Database denies the write |
| A curator changes published requirements | Reader sees only the reviewed publication; student confirmations must be renewed |
| A database call fails | The interface identifies the failed operation and provides recovery |
| Mobile user opens a detail | Title, deadline, rules and action remain reachable without horizontal scrolling |
| Keyboard user navigates | Focus is visible and controls have labels |
| Returning user reloads a page | Personal state comes from the signed-in account |

Record live integration results separately from local policy tests. Use the real production sign-in email, Storage bucket and Vercel domain for the final operator check. Do not mark a production check as passed on the basis of a local test.

### 12. Student validation and delivery

Ask a student to find a relevant opportunity, identify one hard condition, explain one evidence gap and choose a next action. Record task completion, time to find the item, interpretation of eligibility, and any recovery needed. Obtain consent before recording personal feedback. Aggregate only observations that the team actually collected.

The competition package includes the implementation, migration, curated sources, this specification, startup instructions and test evidence. Cite public sources in the product near the relevant requirement. Keep the survey results in the academic context. Do not publish private artifacts, keys, previous prompt archives or synthetic student identities in the build.

### 13. Implementation decisions and source trace

| Decision | Product behavior | Reason or source |
|---|---|---|
| Public entry | Open the landing page at the root. Show a real opportunity before asking for an account. | Visitors can judge the relevance of the catalog before disclosing an email address. The supplied Supabase references separate the public page and the workspace. |
| Personal workspace | Offer Overview, My profile, Opportunities and Skill development. Staff workspace appears for assigned users. | The ZIP (3) had three portals and a role switch. The abstract needs a single student journey. The Vonta archive supplies a useful distinction between public and signed-in navigation. |
| First institution | Let the student explicitly choose a reviewing institution before submitting evidence. Permit browsing and private reflection before this choice. | A new email address cannot establish PIB enrollment. The selected institution controls which assigned teachers can review evidence. |
| Public cards | Show organizer, title, one summary, closing date and save control. Use images from a small editorial set. A new record can use a neutral fallback. | YouTube's title and attribution hierarchy supports scanning. The handoff requires source trust. Images illustrate a subject. |
| Recommendation order | Include open published opportunities. First compare explicit interest or goal matches, then the closing date. State the matched term in the detail view. | A new account lacks a reliable rank. The abstract asks for transparent recommendations. Answers to formal entry conditions remain visible independently. |
| Review result | Evaluate a submission against one observable indicator. Keep the dated teacher comment and decision with that submission. | The original broad mastery score could not identify the artifact or assessment behind a claim. |
| Classroom link | Keep the PIB short-course source and mark the course-to-indicator link as an editorial proposal. | A current diploma RPS signed by the institution is unavailable. A teacher can validate the proposed link before institutional adoption. |
| Data release | Publish four sourced opportunities from the first catalog review. Exclude each from discovery when its own deadline passes. | Expired competitions reduce trust. A student may still need the dates and sources in a published detail page. |
| Interaction color | Use the proposed Learning Indigo and Deep Navy. Use text for each status. | Section 9 of the handoff supplies the palette. The owner can revise it after viewing the implementation. |

The four development references were accessible. Hallmark informed the review of filler copy and generic card treatment. Superpowers supplied a precedent for small verifiable steps. The Anthropic skills repository supplied examples of bounded task instructions. Claude-Mem supplied a precedent for preserving decisions between sessions. CHAMPUS keeps its product decisions and source provenance in versioned documents. A production account does not need these developer tools. [Hallmark](https://github.com/Nutlope/hallmark) · [Superpowers](https://github.com/obra/superpowers) · [Anthropic skills](https://github.com/anthropics/skills) · [Claude-Mem](https://github.com/thedotmack/claude-mem)

### 14. Walk through one student decision

1. Open the landing page. Choose **Explore opportunities**. Search for *plating* while registration is open. Open the Culinary Plating Competition.
2. Read the organizer, closing date and conditions. Leave the team-size condition unknown. Observe **Needs confirmation**. Check the guide linked to the condition.
3. Confirm each condition only if true for the entire team. Observe **Eligible** when all mandatory conditions are met. The assessed micro-skill can still show **Not assessed**.
4. Open the practice resource for plate composition. Sign in, choose the reviewing institution and record a reflection if appropriate.
5. Submit a photograph that demonstrates the observable indicator. Write what the photograph shows. The teacher can see the evidence from the institution's review queue. Another student cannot.
6. Open the dated feedback after the teacher reviews the work. A request for revision permits a new submission. A verified submission changes readiness for that indicator.
7. Return to the opportunity and open the official application while registration is open. The organizer controls submission, acceptance and the final admission decision.

If Culinary Plating has closed, use another published record for the active discovery step. Its own rules, indicators and source apply. Keep the Culinary Plating detail available while the record remains published.
