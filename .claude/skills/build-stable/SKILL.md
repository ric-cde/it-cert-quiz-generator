---
name: build-stable
description: Commit the current changes, then build the app into ..\quiz-stable, for the user to run with npm run start-stable.
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
2. **Build the stable copy.** Run
   `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-stable.ps1 -NoStart`
   in the foreground (about 30 seconds). It stops the stable copy if it's running, then builds the
   frontend and server from this folder straight into `..\quiz-stable`. It doesn't start it: the
   user runs it in their own terminal.
3. **Report** in a line or two: the commit hash and message (or that there was nothing to commit),
   whether the build worked (quote the error if not), and that `npm run start-stable` starts it
   at http://localhost:3200.
