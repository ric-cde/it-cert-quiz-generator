# Left over from the three merged tasks

Exam icons, the take-exam highlighting rework, and the missed-answer label with difficulty buttons are all built. On 2026-11-15 `npm run format`, `npm run typecheck`, `npm test` (815 tests) and `npm run test:e2e` (34 tests) all passed. Delete this file once the points below are settled.

## To look at in the browser

Checked only from screenshots of `/dev/components`, not on real data.

- **Wide wordmark logos are hard to read at icon size:** VMware, Splunk, Firebase, CompTIA, Flutter, Juniper, Scrum, Neo4j and Cassandra. SAP, IBM, AWS and Rails read fine. They could be swapped for a square mark where one exists.
- Squares on a big source (200 questions) are very small, and their stripes barely show.
- The amber "Missed answer" label and the wider stripes on a real question.

## Open questions

Exam icons:

- ServiceNow, Mendix, PMI, ITIL and similar have no logo in either icon set, so they show the rosette. Add custom SVGs if wanted.

Take-exam highlighting:

- The first bullet of the request was cut off ("...tiles which will be included should:"), so included tiles keep the soft blue background.
- A picked bar slice has a blue outline and picked squares a white one, as written. Should they match?
- The % figure was removed from source tiles too, not only chapters and categories.
- The dev links are also hidden on the dev pages themselves.
- The quiz name "Random" on the home list and the Sort option "Random" were left alone.

Difficulty buttons:

- They show only with feedback after each question, and only once a question is locked.
- The server doesn't check the `difficultyButtons` flag: with it off, the buttons and keys are gone but the route still answers.
