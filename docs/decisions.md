2026-11-15 | stages | Deploy via Tailscale is Stage 7, Optimise for mobile Stage 8 and Mock exam Stage 9; the old Stages 7-11, 13 and 14 become the backlog as 10-16 | me | Java SE 21 study on the phone while travelling comes first
2026-11-15 | deploy | The app runs directly on the eq14 as a systemd user service, with no Docker for now | me | the eq14 is also where it's developed, so Docker would add a second runtime; may revisit
2026-11-15 | deploy | Node 24 comes from the fnm version manager and is the default for ric; the system's Node 18 stays | me | in case something we missed needs 18
2026-11-15 | deploy | The live address is https://eq14.codlet-fence.ts.net:8443 through Tailscale Serve, tailnet only | me | the main address belongs to OpenClaw
2026-11-15 | deploy | An always-on preview of the code being worked on runs at port 8444, with the dev database | me | to see remote changes before they're released
2026-11-15 | deploy | The live copy starts from the laptop's data\dev\quiz.db, and the eq14 then holds the only study data | me | keeps history, settings and imported banks
2026-11-15 | deploy | Ric runs the sudo Tailscale Serve commands; ric is not made the Tailscale operator | me | keeps Tailscale changes behind sudo
2026-11-15 | deploy | The study database is backed up nightly and before each release, on the eq14, with the newest 14 kept | me | covers a bad release or a mistake
2026-11-15 | deploy | The live copy is built into ~/apps/quiz with its data in ~/quiz-data, both outside the repo | Claude | work in progress, a redeploy or a re-clone can't touch study progress
2026-11-15 | deploy | On the eq14 the app listens on 127.0.0.1 only, through a new HOST setting, and has no login | Claude | only Tailscale Serve should reach it
2026-11-15 | deploy | A release happens only on request, with npm run deploy or /deploy | Claude | the copy being studied on never changes unasked
2026-11-15 | deploy | The Windows build-stable script and skill stay as they are | Claude | the laptop workflow keeps working
2026-11-15 | deploy | The dev database starts as a copy of the laptop's too, with a command to refresh it from the live one | Claude | the preview needs real questions
2026-11-15 | testing | Installing a browser on the eq14 for end-to-end tests waits for Stage 8 | Claude | first needed there, for phone-width checks
2026-11-15 | eq14 | Live data seeded from the laptop's data/dev database (479 questions, 190 attempts), not data/quiz.db, which was an empty seed | Claude | dev was the database the laptop's stable copy used
2026-11-15 | eq14 | fnm installed from its release binary rather than its install script; Node 24 linked into ~/.local/bin and set up in .bashrc | Claude | piping the install script into a shell was blocked
2026-11-15 | eq14 | npm 11 install-script approvals for better-sqlite3 and esbuild kept in package.json (allowScripts) | Claude | npm 11 skips unapproved install scripts and better-sqlite3 needs its build
2026-11-15 | eq14 | Releases are folders in ~/apps/quiz/releases with a `current` link, last 3 kept, automatic rollback if the new one doesn't answer | Claude | rolling back is a link swap, and a bad release can't leave the app down
2026-11-15 | eq14 | Services pinned to the exact Node that installed the release's packages, not fnm's default alias | Claude | better-sqlite3 is built for one Node version, so changing the default can't break the live copy
2026-11-15 | eq14 | Nightly backup at 03:30 runs from the release, not the repo; backups kept 14 per kind (nightly, release, manual), owner-only | Claude | work in progress can't break backups, and frequent releases can't push out nightlies
2026-11-15 | eq14 | /deploy commits before releasing, like /build-stable, and pushes only if asked | Claude | each release maps to a commit
2026-11-15 | eq14 | Vite accepts *.ts.net hosts and listens on HOST when set, so the preview works through Tailscale Serve | Claude | Vite refuses unknown hostnames
