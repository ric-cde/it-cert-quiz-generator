# Writing guide

Read this when writing anything new: questions in modes B and C, or explanations in any mode. Anything you write teaches someone preparing for a real exam, so check it. Products change between versions, so answer for the version the exam covers.

## Contents

- Writing explanations
- Mode B: from uploaded material
- Mode C: from web research
- Writing multiple choice questions
- Writing free-form questions
- File details for new questions
- Before delivering

## Writing explanations

In modes B and C, write text for **correct options only**, marked `"explanationOrigin": "generated"`. In mode A, write nothing new unless the user asks. Leave wrong options blank unless the user asks for them. Never overwrite text from a source.

- **Correct options:** 1-2 sentences on why it's right, starting with something like "Correct!".
- **Wrong options, if asked for:** 1-3 sentences on why it's wrong, ideally naming the misunderstanding that makes it tempting.
- **Keep to the marked answer in mode A.** Your job is to explain it, not to re-decide it. If you can't honestly justify the marked answer, don't invent a reason. Add a `reviewNote` instead.
- **Be specific.** "This is incorrect because that's not how it works" teaches nothing. Name the rule, and the behaviour that follows from it.
- **Check the fact.** Use web search where available, or run the code, rather than relying on memory.
- **Mention no letters or positions,** because options are shuffled.

Good:

> Correct! `remove(int)` removes by index, so the element at index 1, the value 2, goes.

Bad:

> A is correct because it is the right answer.

## Mode B: from uploaded material

The upload sets the scope, whether that's a syllabus, objectives, notes or prose.

1. **Read all of it,** and list the objectives or topics it covers, mapped to the exam's categories.
2. **Ask how many questions, and for which categories** if the user hasn't said. Otherwise, follow the exam's published category weights where known.
3. **Test what the material says.** Base each question on something in it, and don't drift into topics it doesn't cover.
4. **Fill gaps with evidence.** A syllabus names a topic without giving the facts. Where the material doesn't state a fact you need, confirm it with web search as in mode C, or leave the question out if you can't. Treat the material as possibly dated, and tell the user if it conflicts with current official documentation.

## Mode C: from web research

The aim is questions whose every fact is backed by a current, reliable source.

### Research first

1. **Pin down the exam:** find the vendor's official exam page or guide, and confirm the exact name, code, product version, format, objectives and weights. Beware of similar exams and older versions (for example, a different product generation).
2. **Compare with the exam details you were given.** Use those exam and category names in the file, whatever you find, and report any differences, such as changed objectives, so the user can update the app. For an exam with no details yet, propose them from what you found, as SKILL.md describes.
3. **Gather evidence for each objective,** then write questions from what you've read rather than from memory.

### Weighing sources

| Rank | Source | Use |
|---|---|---|
| 1 | Official documentation, specifications and exam guides from the vendor | The basis for every question and answer |
| 2 | The vendor's own training material and official blogs | Good for what matters in practice. Check the version. |
| 3 | Recognised books and authors, and reputable technical sites | Supporting detail, ideally confirmed in rank 1 |
| 4 | Forums, blogs and third-party prep sites | Only to find out what people get wrong. Never the sole basis for a fact. |

- **Open what you cite.** A search snippet isn't evidence.
- **Check the date and version** of everything, and prefer the version the exam covers.
- **When sources conflict,** the higher rank wins. If it's still unclear, drop the question or add a `reviewNote`.
- **Leave out anything you can't verify.** Fewer sound questions beat more shaky ones.
- **Run the code** in any code question whenever you can, and confirm the output and whether it compiles.

### What not to use

Don't use exam dumps, or anything claiming to be real or leaked exam questions, even if the user's search turns them up. They may breach the exam's terms and are often wrong. Don't copy practice questions from other sites either. Write your own.

### Show the evidence

End the explanation of each correct option with a link to the page that supports it, using its title: `[Page title](https://example.com/page)`. Link only to pages you actually opened, and list them all in your report with the date you checked them.

## Writing multiple choice questions

Test understanding and how the exam's real questions behave, using the exam's description, objectives and category weights. If the exam only uses one correct answer per question, write only `single` questions.

### The question

- Test one idea that matters for the exam, and not trivia or a trick of wording.
- Prefer a realistic scenario or real code to a recalled definition, if the exam does.
- Make it answerable without looking at the options where possible.
- State it positively. If "NOT" or "EXCEPT" is really needed, make it obvious.
- Make sure exactly the marked options are defensible, under the version the exam covers.

### The options

Exam writers have well-known rules here, because badly built options give the answer away:

- **Make every wrong option plausible:** build each one from a real misconception or a common error, so that it would tempt someone who half knows the topic. Silly options just shrink the question.
- **Match length and style:** a correct answer that's noticeably longer, more detailed or more carefully qualified is a giveaway. Keep all the options parallel in form.
- **Avoid echoing:** don't repeat a distinctive word from the question in only the right answer.
- **Avoid absolutes as tells:** "always" and "never" shouldn't mark only the wrong answers.
- **Avoid "All of the above" and "None of the above":** spotting one wrong option rules out "All of the above", and spotting two right ones confirms it. Avoid "Both A and B" too. If you do use one, set `lockOptionOrder`.
- **Keep them distinct:** options shouldn't overlap, and shouldn't be the same claim reworded.
- **Spread the answers:** vary where the correct option falls, because a generated bank tends to put it in the same place. The validator warns about this.
- **Usually four options,** matching the real exam's format where it's known.

## Writing free-form questions

Write these only when the user specifically asks. If they want to know how they work, explain:

> You type your answer in your own words, and an AI compares it with a stored model answer and gives a verdict of correct, partly correct or incorrect, with short feedback. The verdict is final, and partly correct counts as not correct. The model answer is then shown. These questions make you recall the answer rather than recognise it, so they're harder and good for deeper learning, but each one judged uses a little API credit. They don't appear in mock exams, which are multiple choice only.

### The question

- Ask for something that can be answered well in a few sentences or a short piece of code.
- Have one defensible answer. Avoid "what do you think" and anything that's a matter of opinion.
- Say what's wanted, such as "Explain why" or "Write a method that", and roughly how much.

### The model answer

`modelAnswerMd` does two jobs: the judge marks against it, knowing only the question, this text and the user's response, and the user reads it afterwards to learn. So:

- State the key points a good answer must make, plainly enough that a judge can tell whether each is there.
- Say which points are essential if some matter more, so that "partly correct" has a clear meaning.
- For code, give a correct version and say what matters about it, and allow for other valid solutions.
- Keep it short. In mode C, end it with a link to the supporting page.

Good:

> A blocked virtual thread releases its carrier thread, so a few platform threads can serve a very large number of waiting tasks. A good answer must mention that the carrier is released while blocked. Noting that they give little benefit to CPU-bound work is a bonus.

## File details for new questions

- `source.origin`: `"generated"`
- `source.name`: says where it came from, such as "Generated from syllabus notes" or "Generated from web research". Use the same name for later batches, so they stay together.
- `chapters[].name`: a dated batch, such as "Batch 2026-11-04", using today's date.
- `externalId`: includes the batch, so it can't clash with earlier ones, such as `gen-20261104-q1`.
- Don't add a `reviewNote` as a substitute for checking. Use it only for a real doubt that remains.
- Don't write a question that needs an image, because the app can't show one. Put what's needed into words or code.

## Before delivering

Answer each question yourself, without looking at what's marked, and compare. Where you disagree, or the question is arguable, fix or drop it. Then check that no two questions test the same fact in the same way, and run the same validation and report as for any other file.
