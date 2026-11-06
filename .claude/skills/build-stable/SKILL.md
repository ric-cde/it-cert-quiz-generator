---
name: build-stable
description: Commit the current changes, then rebuild and restart the stable copy of the app in ..\quiz-stable on port 3200, in the background.
disable-model-invocation: true
argument-hint: "[commit message] [push]"
---

Running this command is the user's go-ahead to commit, overriding the CLAUDE.md rule that says
not to. Push only if the arguments include `push`.

Arguments: $ARGUMENTS

1. **Commit.** Run `git status --short`.
   - If there's nothing to commit, say so and go on to step 2.
   - Check that nothing under `data/`, no `.env` and no database, question bank or source
     document file would be committed. If one would, stop and tell the user.
   - Run `git add -A`, then commit. Use the message from the arguments if there is one.
     Otherwise write one that sums up the changes since the last commit, in the style of the
     recent commits (`git log -5 --oneline`) and the commit commands from earlier reports in
     this conversation. End it with the attribution lines the session asks for.
   - If the arguments include `push`, run `git push`.
   - Don't run the tests here. They're run after every change anyway.
2. **Build and start the stable copy.** Run this with the Bash tool's `run_in_background`, so the
   user can carry on meanwhile:
   `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-stable.ps1`
   It stops the running copy, moves `..\quiz-stable` to the latest commit on main, installs
   packages if the lock file changed, builds, and starts the server on port 3200 using the dev
   database (`data\dev`).
3. **Report** in a line or two: the commit hash and message (or that there was nothing to commit),
   and that the build is running. When the background job finishes, say whether it's ready at
   http://localhost:3200, or quote the error.
