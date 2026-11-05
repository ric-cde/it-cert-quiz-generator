# Format guide

## Contents

- File layout
- Question fields
- Markdown rules
- Code
- Explanations
- A worked example

## File layout

```json
{
  "formatVersion": 1,
  "exam": "The exam's exact name in the app",
  "source": { "name": "Official study guide", "origin": "upload" },
  "chapters": [
    { "name": "Chapter 3", "questions": [] }
  ],
  "omitted": [
    { "reference": "Chapter 3, question 17", "reason": "Depends on an image" }
  ]
}
```

- `origin` is `"upload"` for existing material and `"generated"` for questions an AI wrote.
- Chapter names must be unique. Use the source's own names, such as "Chapter 3" or "Practice exam 1". If a source has no clear sections, make up sensible names, such as "Practice exam 1" or a topic name.
- Every chapter needs at least one question, so a chapter whose questions were all omitted is left out and its questions stay listed in `omitted`.
- Unknown fields are rejected. Leave out optional fields rather than setting them to `null` or `""`.

## Question fields

| Field | Applies to | Required | Notes |
|---|---|---|---|
| `type` | all | yes | `single`, `multi` or `free_form` |
| `externalId` | all | recommended | Such as `pe1-q17`. See the ID rules in SKILL.md. |
| `category` | all | yes | The exam's own category or topic name where one fits, spelled exactly |
| `bodyMd` | all | yes | Without the number, the options or the answer |
| `explanationMd`, `explanationOrigin` | `single`, `multi` | no | Text about the whole question, shown below the options after answering |
| `reviewNote` | all | no | A doubt for the user. The question stays in quizzes with a warning, and is listed for review. Real doubts only. Shown only after answering, so it may name the answer. |
| `options` | `single`, `multi` | yes | At least 2. `single` needs exactly 1 correct, and `multi` at least 1. |
| `lockOptionOrder` | `single`, `multi` | no | `true` only if order matters: "All of the above", True/False |
| `modelAnswerMd` | `free_form` | yes | See below |

Each option:

| Field | Required | Notes |
|---|---|---|
| `bodyMd` | yes | Without a label such as "A." |
| `isCorrect` | yes | `true` or `false` |
| `explanationMd` | no | Shown under this option after answering |
| `explanationOrigin` | with `explanationMd` | `source` if it's from the material, `generated` if you wrote it |

**`modelAnswerMd`** is what an AI judges a typed answer against, with no other context. State the key points a good answer must make, and for code, what it does and why. If the source only gives a short answer, keep it. If the source also has an explanation, add it after the answer. Free-form questions have no per-option text, so this is the only place for it.

## Markdown rules

The app renders GitHub-flavoured Markdown: paragraphs, lists, tables, bold, italics, links, inline code and fenced code. Raw HTML and images are not rendered.

| Problem | Instead of | Write |
|---|---|---|
| Angle brackets vanish as HTML | `Which is a valid List<String> declaration?` | ``Which is a valid `List<String>` declaration?`` |
| Tags vanish too | `Use the <div> element` | ``Use the `<div>` element`` |
| `*` and `_` become italics | `a * b * c`, `my_var_name` | `` `a * b * c` ``, `` `my_var_name` `` |
| A line starting `#` becomes a heading | `#include` | `` `#include` `` |
| A line starting `1.` or `-` becomes a list | `1. It compiles` as option text, when the number is the label | `It compiles` |
| One line break is ignored | Two lines of a statement | A blank line between paragraphs |

Put identifiers, keywords, class and method names, expressions and literal outputs in backticks, in options as well: `` `[1, 3]` ``. Wrap them only where the source clearly means code, so that the prose reads normally.

## Code

Use a fence that names the language, with a blank line before it:

````json
"bodyMd": "What does this print?\n\n```java\nvar list = new ArrayList<>(List.of(1, 2, 3));\nlist.remove(1);\nSystem.out.println(list);\n```"
````

- **Languages highlighted:** `java`, `javascript`, `typescript`, `tsx`, `jsx`, `json`, `sql`, `html`, `css`, `xml`, `bash`, `python`, `yaml`, `markdown`, `csharp`. Others still display, just plain. Use `text` for console output or anything that isn't code.
- **Whitespace is part of the question.** Keep indentation and blank lines. If extraction lost the indentation, restore it from the structure of the code only where that can't change the meaning, and take extra care with Python and YAML, where it does.
- **Line numbers stay if they matter.** If the question says "which line fails to compile?", keep them exactly: `1: public class Test {`. If nothing refers to them, remove them.
- **Fix what extraction does to code,** such as curly quotes, ligatures, long dashes in place of `-`, and code joined onto one line. Don't fix the code itself, because **errors in it may be the point of the question**. A missing semicolon stays missing unless you can see it was lost in extraction.
- **Code that contains three backticks:** use a longer fence, of four backticks.
- **An option that's a code block** works the same way as a question: `"bodyMd": "```java\nint x = 1;\n```"`.

## Explanations

The learner sees these right after answering, usually when they've got it wrong and want to know why. Text about one option stays under that option, and the options are shuffled. Text about the whole question shows below the options. The app shows whatever exists, so any of them can be blank.

- **Wrong option:** 1-3 sentences on why it's wrong, and ideally on the misunderstanding that makes it tempting. Keep any the source gives, but don't write new ones unless asked.
- **Correct option:** 1-2 sentences, such as "Correct! `remove(int)` removes by index, so the value 2 goes." Keep any the source gives. Write new ones in modes B and C, and in mode A only if asked.
- **Start with the point.** Don't restate the question.
- **Never use letters or positions:** "B is wrong", "the option above", "as in the second choice". Name what the other option says if you need to.
- **Each one stands alone,** so don't write "see the previous explanation".

### Fitting source explanations to options

| The source has | Do this |
|---|---|
| Text for each option | Keep it on each option, marked `source`. |
| Sentences each about a particular option, such as "C is wrong because..." | Put each on its option, keeping its words. Drop only linking words, and replace letters with content. |
| Text about the answer or the question as a whole, such as "Answer: B. Because..." | Put it on the question's own `explanationMd`, marked `source`. Don't move it onto an option. |
| A mix of both | Split it: sentences about one option go on that option, and the rest goes on the question. |
| Nothing | Leave it blank in mode A, unless the user asks you to write some. The app can generate text later on request. |

A source's "learn more" link, such as "revisit this topic", goes at the end of the question's explanation. Source text may run longer than 1-3 sentences. Keep it, since it's the source's explanation, but remove page references such as "see Chapter 4", which mean nothing in the app.

Never present your own text as `source`. The app can replace `generated` text if asked, and it protects `source` text: AI-written text in a later file never replaces it.

## A worked example

Source text:

```
7. Which TWO are valid? (Choose two.)
A. List<int> a;
B. List<Integer> b;
C. var c = null;
D. var d = new ArrayList<String>();
Answer: B, D. Both use a reference type that the compiler can work out. A is invalid
because generics need reference types. C does not compile because the type can't be
inferred from null.
```

Output:

```json
{
  "externalId": "ch3-q7",
  "type": "multi",
  "category": "Working with Arrays and Collections",
  "bodyMd": "Which TWO are valid? (Choose two.)",
  "explanationMd": "Both use a reference type that the compiler can work out.",
  "explanationOrigin": "source",
  "options": [
    {
      "bodyMd": "`List<int> a;`",
      "isCorrect": false,
      "explanationMd": "Invalid because generics need reference types.",
      "explanationOrigin": "source"
    },
    {
      "bodyMd": "`List<Integer> b;`",
      "isCorrect": true
    },
    {
      "bodyMd": "`var c = null;`",
      "isCorrect": false,
      "explanationMd": "This does not compile because the type can't be inferred from `null`.",
      "explanationOrigin": "source"
    },
    {
      "bodyMd": "`var d = new ArrayList<String>();`",
      "isCorrect": true
    }
  ]
}
```

The sentences about A and C go on those options, and the sentence about the answer as a whole goes on the question, all as `source`. Nothing new is written, because this is mode A and the user didn't ask. The options stay in the source's order, because the app does the shuffling.
