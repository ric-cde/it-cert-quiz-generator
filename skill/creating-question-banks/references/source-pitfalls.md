# Source pitfalls

## Contents

- Any source
- PDF
- Word
- Web pages
- Pasted quiz pages
- Markdown and text
- Spreadsheets and CSV
- Answer keys

## Any source

- **Lost questions are the worst failure, because nothing shows they're gone.** Questions go missing at page breaks, at column breaks and between batches. Always reconcile against your count.
- **Split questions:** a chunk or page boundary can separate a question from its options, or its options from each other.
- **Foreign text:** remove running headers, footers, page numbers, watermarks and copyright lines caught in the middle of a question.
- **Near-duplicates:** practice sets often repeat questions. Keep them if the source repeats them, since the validator and the app both report duplicates.
- **Versions:** if the material covers several exam versions, or says "new in this edition", mention it instead of assuming it applies.
- **Answer leaks:** remove "Correct answer: B" or similar from the question text, and move it to `isCorrect`.

## PDF

Choose by what the PDF is. Check first with a few pages of text extraction.

- **Text PDF:** use `pdfplumber`, or `pypdf` as a second opinion. Compare a page of the output with a rendered image of that page.
- **Scanned or image PDF** (little or no text): render pages to images with `pdf2image` or `pypdfium2` and read them visually. Read code and numbers with care: `0`/`O`, `1`/`l`/`I`, `;`/`:`, `{`/`(`.
- **Answers marked visually:** a highlight, tick, bold or coloured option usually disappears from extracted text, leaving a question that looks as if it has no answer. If you find no answer key, **render a page as an image and look** before concluding there isn't one.

Common damage:

- **Two columns** read straight across, mixing unrelated lines. Crop each column, or use the page images.
- **Lost indentation:** code often comes out flat. Compare it with the page image.
- **Ligatures and quotes:** `ﬁ`, `ﬂ` and curly quotes replace plain characters, which breaks code.
- **Long dashes, hyphenation and soft line breaks:** a word split across lines, or `-` turned into `–` inside code.
- **Options read in the wrong order** when laid out in a grid. It matters if the answer key uses letters.

## Word

- **Automatic numbering isn't in the text.** `python-docx` returns the paragraph text without "1." or "A.", so numbers and letters must be worked out from list position. Check that the count fits, and if the file has `pandoc` available, compare its output, which keeps numbering.
- **Answers are often run formatting:** bold, highlight or colour on one option. Check the runs in `python-docx`, not only the paragraph text.
- **Content can hide in other places:** tables, text boxes, footnotes and comments. Tables aren't in `document.paragraphs`.
- **Tracked changes:** deleted text can reappear, and an answer may have been changed. Mention it if you see any.
- **Images:** embedded pictures are invisible in the text, so a question can look complete without its diagram. Check the document for images near questions.

## Web pages

- **Ask for a saved copy if needed.** Fetching may not be possible, a login page may come back in place of the content, or quiz sites may load questions by script. If the result looks incomplete, ask the user to save the page as a PDF, or paste it in.
- **Hidden answers:** answers behind a "Show answer" button or in a later page may be missing from what you received. Check before reporting that a source has none.
- **Pagination:** one exam may span several pages. Ask for all of them.
- **Page clutter:** remove navigation, ads, comments and related links. **User comments may argue about the answer**, so take the answer from the page's own marking. If comments give a convincing reason to doubt it, use a `reviewNote`.
- **Date and version:** note if the page is old or about a different exam version.

## Pasted quiz pages

A quiz or course page copied into a document brings its screen furniture with it, and often loses the thing that matters:

- **The correct answer may not survive pasting.** It was shown by colour or a tick, so the options look unmarked, even if the page says "That's Right!". Don't assume the first option is right. If nothing marks the answer, these questions have no answer: tell the user, and offer to work them out with a `reviewNote` on each, or to have them re-export it.
- **Remove the furniture:** "+ 1" scores, "That's Right!", question counters and similar.
- **A label above a question,** such as "Data relationships", is a topic. Use it to choose the category.
- **Images often survive only as links,** which the app can't show. Treat them as images.

## Markdown and text

The easiest case, but check for an existing structure before imposing yours. Hard-wrapped lines need rejoining in prose but not in code. A Markdown file made by another converter has often already suffered the PDF problems above.

## Spreadsheets and CSV

- Find out what each column means by reading a few rows, because answer columns vary (`B`, `2`, the answer text, `A;C`).
- Multiple correct answers may be separated by commas, semicolons or line breaks.
- Spreadsheets damage values: `1.10` becomes `1.1`, `TRUE` changes case and dates get converted. Treat these as suspect when they're an option.
- Read with `csv` or `openpyxl` rather than splitting on commas, because cells contain commas and line breaks.

## Answer keys

When answers are separate from questions, match them with care, since this is where a whole bank goes wrong without any visible sign:

- **Match by number and section, and check that the numbering restarts the same way.** Chapter 3's question 7 must not take the answer for chapter 2's question 7.
- **Check the count:** the key should have one answer per question in that section.
- **Check that letters exist:** an answer of `E` for a question with four options means misalignment.
- **Check the number of answers:** "Choose two" with one letter in the key is a mismatch.
- **Check the sense:** read the first few and last few in each section, and confirm each answer actually fits its question. An off-by-one error shows up as a run of nonsense.
- **Check explanations against answers:** if a key's explanation discusses something not in the question, the numbering has slipped.
- **Use the original letters while matching, before removing them,** and keep options in source order, so nothing can drift.
- **Errata:** if the user has an errata list, apply it and mention this in your report.
