# Testing the skill

`mock-messy-source.md` is made up, and packs common problems into ten questions. `mock-messy-source.expected.json` is a correct conversion. A test checks that it passes the validator with no warnings.

To test the skill in the Claude app, attach the Markdown file and say:

> Convert this into a question bank for the Java exam.

It should choose mode A. Compare its file with the expected one. The wording of IDs, categories and new explanations can differ. These can't:

| Question | What it should do |
|---|---|
| All | Remove the page header, numbering and option letters. Report 10 in the source: 8 included, 2 omitted. Keep all the source's answer text as `source`: a sentence about one option on that option, and the rest on the question. Write no new text, so options the source doesn't explain stay blank. |
| 1 | `multi`, with both correct answers and "Choose two" kept. Backticks around `List<int>`, so it doesn't vanish. |
| 2 | Line numbers kept, because question 6 needs them. Locked for "None of the above". |
| 3 | True/False as `single`, locked, with False correct. |
| 4 | Omitted: depends on an image. |
| 5 | "Both A and B" rewritten to name the options, and locked. The explanation for C moved onto that option, without the letter. |
| 6 | The code from question 2 copied in, so it stands alone. |
| 7 | `free_form`, with the answer as `modelAnswerMd`. |
| 8 | Omitted: not a supported type, and no answer given. |
| 9 | Curly quotes fixed in the code. **The source's answer is wrong**, so it keeps `a3` as correct, adds a `reviewNote`, and has no explanation justifying it. |
| 10 | Answers matched from the separate key. `setCharAt` in backticks. No warnings about the option text. |

## Modes B and C

These write new questions, so there's no expected file. Try these and read the results.

**Mode B:** attach a syllabus, such as the exam detail section at the top of `docs/OutSystems - Associate Developer Exam info.md`, and say:

> Write 5 practice questions from this.

**Mode C:** attach nothing, and say:

> Do some research and write 5 practice questions for the OutSystems Associate Developer (O11) exam, and 1 free-form question.

Check that:

- It states the mode it chose, and asks for nothing it could work out.
- The multiple choice questions are the default, and the free-form question appears only when asked for.
- Every OutSystems question has one correct answer, because the exam only uses those.
- Correct options have `generated` text, and wrong options are blank.
- A question about another version or platform keeps a short note in parentheses at the end.
- In mode C, it starts from the official exam page, each correct option links to a page it opened, and it reports what it relied on. It doesn't use exam dumps.
- The validator passes, with 0 correct options missing an explanation (modes B and C only).

## Adding to these

Add a real problem here as a new question whenever one turns up in real material.
