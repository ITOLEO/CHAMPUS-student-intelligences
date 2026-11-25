# CHAMPUS learning and curriculum design

Design record dated 25 November 2026. Use this document with [the product specification](CHAMPUS-SPEC.md) and [the catalog evidence](CATALOG-SOURCES.md). The decisions below govern product behavior. Release verification belongs in the test report.

## Purpose and evidence

A student needs to see three things together. What does the course require? What work has the student demonstrated? What can the student choose to learn next? A teacher needs the indicator, the submitted work and the assessment basis before making a judgment.

**FACT.** The submitted CHAMPUS abstract reports an exploratory survey of 36 respondents. It reports that 86% found it difficult to identify skills to develop and 92% wanted explanations. The raw responses, recruitment method and question wording are unavailable. Use these figures to motivate usability tests. Measure the effects of the product with students before making claims about improved learning.

**FACT.** The upload named `Pasted text.txt` contains NEXORA PRD 07. Its full text matches the PRD 07 inside NEXORA ZIP (3) after whitespace normalization. It is a historical specification. It describes Firebase, three enterprise portals, weighted scores and ten service suggestions. The academic relationships and traceable explanations have value for CHAMPUS. The active product brief requires Supabase, evidence-based skill states and linked student, teacher and industry dashboards.

**FACT.** The ZIP contains graph traversal, eligibility, skill-gap analysis, pathway sequencing, opportunity matching, explanation structures and next-action selection. In the old runtime, `src/context/NexoraContext.tsx` supplies a fixed reference date of 6 April 2026. The old `src/recommendation/recommendationEngine.ts` compares deadline strings directly and uses a default readiness threshold of 70. `StudentOverview.tsx` can substitute a 92% match and an eligible label when records are absent. The uploaded ZIP establishes historical behavior. Current acceptance checks must exercise the current CHAMPUS code.

## Feature decisions

| Historical PRD or source | CHAMPUS decision | Evidence for review |
|---|---|---|
| §§3–7. Goals, curriculum, observable skill, academic and personal paths | Keep source-linked outcomes, distinct skill IDs, visible requirements and editable student goals. Treat official obligations and student-selected practice as different records. | A student can identify who defined a step and what completing it establishes. |
| §§4, 6–7. Graph traversal and prerequisites | Follow an edge only when a source identifies the relationship. If a prerequisite is unavailable, show the available next practice. Detect repeated nodes. Show uncertainty for unofficial mappings. | A published source supports each official relationship. Missing and cyclic data do not produce invented steps. |
| §§8–11. Eligibility, preparation and explanations | Evaluate explicit mandatory conditions. Explain met, failed and unknown conditions. Show evidence and preparation separately. Identify the matching interest or goal only when the student supplied it. | Removing optional evidence preserves eligibility. Removing an answer to a mandatory rule changes the result to Needs confirmation unless another known mandatory rule fails. |
| §§4, 6, 8, 12. Weighted ranking, mastery thresholds, configuration and run logs | Use traceable reasons and descriptive readiness. Preserve the dates, sources and identifiers needed to explain each result. Retire unvalidated percentages and score weights. | Each visible readiness label can be traced to an indicator, a submission, a review, a reflection, or missing information. |
| §§9–10, 14. Next action, autonomy and feedback | Show a concrete action the student can take. Keep goal editing, saving and direct access to the source. An optional resource opens independently of an official course. | A student can select a different goal without changing official requirements. |
| §§15–16, 18–19. Teacher review, industry and institutional analytics | Give industry a needs desk. Give teachers course-scoped assignments and review. Keep legacy curation permissions independent. Protect the student's work and identity. Use task completion, understanding and time to find a source for pilot evaluation. | Another student cannot approve the work. A teacher can review only within their authorized scope. |
| §§12–13, 17, 20–22. Firebase, model assistance, tests and events | Use the chosen Supabase stack. Produce explanations from rule results. Verify permissions in the database and private file store. A generative service is optional for future editing assistance. | The primary journey works independently of model availability. External clicks record navigation only. |

## How an agile learning path works

Keep the source requirements stable. Let the student revise personal goals, sequence, method of practice and optional materials as new evidence appears. Record whether a step is institution-defined, teacher-assigned or student-selected. An editable plan changes the student's preparation. Only the institution can change curriculum, credits, grades or formal progression.

| Step | What the student or teacher does | What can change |
|---|---|---|
| Select | The student opens a course, opportunity or goal. They read an indicator in plain language. | The student can choose a goal or explore another opportunity. |
| Plan | Show an available prerequisite, a resource and one practice task. Explain how each item connects to the indicator. | An approved prerequisite takes precedence in the academic sequence. A student can reorder independent personal practice. |
| Practice | The student creates work and records a short reflection. | The student can change the practice format where the indicator supports it. |
| Review | A teacher checks the artifact against the indicator and records the decision, date and feedback. | Only the reviewed indicator receives that result. Other indicators keep their previous states. |
| Adapt | Show the next useful action. Invite revision after specific feedback or move to an additional indicator after verification. | Revised work needs its own review. Reading a resource or submitting a revision cannot approve it. |

These short review cycles borrow the inspection and adaptation principle from the Scrum Guide. A student activity is an educational design choice. The Guide does not validate a particular learning cadence. Biggs connects outcomes, learning tasks and assessment. Black and Wiliam describe the formative use of evidence to guide next steps. [Scrum Guide](https://scrumguides.org/scrum-guide.html) · [Constructive alignment](https://doi.org/10.1007/BF00138871) · [Formative assessment](https://kclpure.kcl.ac.uk/portal/en/publications/developing-the-theory-of-formative-assessment/)

## A worked academic example

PIB College publishes a four-week *Exotic Culinary Arts* course. Its day-three session describes the characteristics of Indonesian herbs and spices and their uses in traditional cooking. This describes a historical short course. No public source confirms that it is a current diploma requirement for a particular student. [PIB course outline](https://pib.ac.id/exotic-culinary-arts/)

| Academic element | Source and interpretation |
|---|---|
| Course and outcome | *Exotic Culinary Arts*. The published session supports an outcome about describing an ingredient and its culinary use. |
| Competency cluster and specific skill | CHAMPUS proposes Communication and Culinary storytelling for practice. An instructor can review this mapping. |
| Micro-skill and observable indicator | Explain a dish's cultural context. In the presentation, name one regional ingredient and explain its use in that dish. |
| Evidence and rubric result | Submit a short presentation or annotated recipe for this indicator. The teacher records what the artifact shows. Assess oral delivery only with suitable audio, video or direct observation. |
| Personal opportunity | The USU Culinary Plating competition assesses visual composition and cultural storytelling. It requires a team of two or three. Evidence of storytelling has no effect on team-size eligibility. |

The USU organizer supplies competition rules. PIB supplies public course context. CHAMPUS supplies the proposed educational connection. Only an authorized educator can approve it as a local institutional mapping. A separate indicator can use a photograph to assess a visual focal point. [USU organizer rubric](https://konten.usu.ac.id/storage/year/2026-11/posts/885/announcement/yi8uoOZt_panduan-culinary-plating-nusantara-tourism-expo-2026.pdf) · [Culinary Institute of America practice guide](https://www.ciachef.edu/wp-content/uploads/2024/07/enhancing-food-presentation.pdf)

## Personal preferences and personality instruments

A student can state an interest, select a working preference and revise it. Explain how each answer changes the suggested activity. An interest in entrepreneurship can surface a venture pitch exercise. A preference for working with another student can suggest peer rehearsal. Keep the same indicator and review criteria for individual practice and peer rehearsal. Offer all eligible routes when the student skips the questions.

Keep the student's answer, confidence, learning activity, submitted work and reviewed performance as separate signals. Do not infer personality from clicks. Only explicit student input can supply a preference. Keep a reflection private. Exclude it from enrollment, grading, opportunity eligibility, institutional ranking and instructor review decisions. The O*NET Interest Profiler is a published career exploration instrument that measures six vocational interests. A local preference form has a different purpose. Avoid interpreting a local response as a validated O*NET, Big Five or MBTI score. [O*NET Interest Profiler](https://www.onetcenter.org/IP.html) · [Big Five Inventory](https://www.ocf.berkeley.edu/~johnlab/bfi) · [MBTI ethical use](https://www.myersbriggs.org/unique-features-of-myers-briggs/ethical-use-of-the-mbti/)

Students may prefer an example, a written guide or partner practice. A preference does not establish that matching teaching to a fixed learning style improves achievement. Offer a meaningful choice and test the observed learning result. A self-assessment can differ from demonstrated performance. Feedback and a defined rubric give the teacher a basis for review. [Pashler and colleagues](https://doi.org/10.1111/j.1539-6053.2009.01038.x) · [León and colleagues](https://doi.org/10.1007/s10648-023-09819-0)

## Interaction decisions and acceptance evidence

- Put the current learning goal, one next action and a link to its source above supporting details. Use secondary disclosure for prerequisite chains, rubric detail and alternatives. This order supports a student who needs to act quickly. [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- Use a persistent navigation label for each destination. Give a compact screen one reading column. Keep text and actions reachable with a keyboard at a 320 CSS pixel viewport. Preserve the role of color with a visible status label. [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) · [Use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- Use Manrope for headings and Inter for body text and controls, as defined in the CHAMPUS design proposal and observed in Vonta. Use one page heading and short action labels. Display metadata once near the item it qualifies. Keep organizer requirements and personal preparation in distinct sections. [Supabase typography](https://supabase.com/design-system/docs/typography) · [Supabase UI writing](https://supabase.com/design-system/docs/copywriting)
- Ask a pilot student to select a goal, find an applicable opportunity, explain one mandatory check, locate a practice task and identify who can review their work. Record completion, time and errors with consent. Ask the same student what remains unknown. Record actual observations. The initial survey cannot substitute for this task test.

Treat each row in this document as a review requirement. A feature has a release status only when a named test or observed user task verifies it. Keep the source, the product decision, and the observed result visible in the review record.
