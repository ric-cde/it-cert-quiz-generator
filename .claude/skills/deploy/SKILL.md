---
name: deploy
description: Commit the current changes, then put them live on the eq14 at https://eq14.codlet-fence.ts.net:8443 with npm run deploy.
disable-model-invocation: true
argument-hint: "[commit message] [push]"
---

Running this command is the user's go-ahead to commit and release, overriding the CLAUDE.md rule
that says not to commit. Push only if the arguments include `push`. Only run on the eq14 (Linux);
on Windows, say so and suggest `/build-stable` instead.

Arguments: $ARGUMENTS

1. **Commit.** Run `git status --short`.
   - If there's nothing to commit, say so and go on to step 2.
   - Check that nothing under `data/`, no `.env` and no database, question bank or source
     document file would be committed. If one would, stop and tell the user.
   - Run `git add -A`, then commit. Use the message from the arguments if there is one.
     Otherwise write one that sums up the changes since the last commit, in the style of the
     recent commits (`git log -5 --oneline`). End it with the attribution lines the session asks
     for.
   - If the arguments include `push`, run `git push`.
2. **Release.** Run `npm run deploy` in the foreground (a minute or two). It runs the type checks
   and tests, builds, makes a new release folder in `~/apps/quiz/releases`, backs up the live
   database, switches `~/apps/quiz/current` to the new release, restarts the `quiz` service and
   checks it answers. If the check fails it switches back to the previous release by itself.
   - If the type checks or tests fail, nothing has changed on the live copy: fix the failure,
     then run it again. Don't use `--skip-checks` unless the user asks.
3. **Report** in a line or two: the commit hash and message (or that there was nothing to commit),
   the release name and that it's live at https://eq14.codlet-fence.ts.net:8443, or the error and
   which release is live if it failed.
