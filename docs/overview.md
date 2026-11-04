# Quiz app for exams

**NOTE**
This was an initial exploratory document written by the user. (Some parts of it may have drifted or now be incorrect). Later, spec.md and summary.md were generated after a discussion and have a more accurate representation of how the app should function.

**Background**

I'm a junior developer who is about to do three certificates: Java SE 21 OCP, OutSystems Associate Developer (O11), and Claude Developer Professional.

I have found many different question sets across disparate books and websites. Some question sets I have also generated using AI. My problem, however, is that the quality of questions differs, and I have no way to track my success/failure across different sources of quizzes. (For example, I want to prioritise doing high quality questions and keep track of categories and of failed questions so I can focus on those).

I also need to be able to convert these disparate question sets into structured data for serving them as quizzes.

**Primary goals**

* The primary goal of the app is an effective quiz aid that will help me prepare and pass my exams.
* It should be easy to use. It should "spark joy".
* The design should be somewhat minimalist, focusing on readability and efficiency of use with zero or low UI friction. (The only friction - which is a positive type of friction - should be the difficulty of the questions themselves).
* It should run locally on my laptop (frontend and backend) for v1. For v2, we will also be able to run it on my smartphone (connecting to my home server where the backend + DB is running, via Tailscale).



---



Below is a summary of how the app should work. Let's build it one section at a time so that the user can inspect the work and offer feedback / review design decisions made at each stage. Keep everything modular and in components so that we can iterate on features and extend them.



## Data

- Question bank of all questions
	- Contains question (which can include code blocks and similar formatting), possible answers. Each possible answer has answer text (can be blank) which is shown after selecting + attempting that option.
	  - When code blocks are displayed in the UI, a 'copy to clipboard' (icon only) button should exist.
	- Need a skill or script or module (in the app) that can turn a given document (PDF, CSV, markdown, web page, etc.) into a correctly formatted question bank
	- Question banks have a hierarchy: Subject (e.g. Java), Exam (E.g. Java SE 21 OCP), Category (e.g. OOP), Source (E.g. Boyarsky study guide), and Name (E.g. Chapter 1). Each Subject can have multiple exams; each Exam can have multiple question bank sources.
	- Each Exam should have a list of categories. Each question should be labelled with a category. 
	- The app must record and track data for each question attempt. Should include whether or not the attempt was correct, and the option selected.
	- Each question has a tracked, dynamic difficulty level rated out of 10. (By default, each question should have no difficulty set).
	  - When questions are attempted and failed: if an existing difficulty level exists, increment it by 1 until they reach a max of 10. If no difficulty level exists, set difficulty to 5 the first time it's answered incorrectly. (Then increment as normal next time). If answered correctly, decrement each time it's answered correctly (until it hits 0).
	- Question bank data (i.e. sources) should be stored in the database. ~~User data, like question bank attempts, should be stored in localStorage for each user. A "download user data" and "upload user data" function should exist (i.e. make a copy of your data like quiz attempts, and then upload it on a different computer to restore it there).~~
	  - This feature will be revised in future. (User data will instead be stored in the database).

## Frontend

- App home page should list Subjects. Below each subject, possible Exams should be displayed. (Below each exam, it should list all sources and a % complete rating; i.e. how many questions have been successfully answered vs. total count. Inside the total count segment, a yellow section should indicate questions attempted but not answered correctly).
- App should have a 'take exam' screen reached by clicking an Exam.
	- This should show a tile for all sources and a % complete of each, as above.
		- A tile should also be present for each defined Category in the question bank.
		- Clicking a Source selects all questions from that Source (in line with below filters) to be taken.
		- Clicking a Category selects all questions from that Category to be taken. (In line with filters below).
		- Another tile, Random, should be on its own line (picks random questions across all categories/sources)
	- Filters.
		- Radio button toggles should exist for other options: Unanswered (never attempted before), Unsolved (never gotten right before).
		- Max questions. Pre-defined options for 20, 50, 100, and Max. (When Max is selected, it should show what the max available questions is for the given filtered question set).
		- Another option needs to exist for prioritisation of questions depending on attempts made, times right/wrong, etc. (This may require refinement). E.g. when a difficult question is answered correctly once after several attempts, we may still want to see it in future. Whereas an easy question answered first time might be skipped).
	- An option for Source should exist. Options should include: All, All incorrect (i.e. exclude sources where every question has been answered correctly), All not attempted, and then all existing sources should be selectable. (NB: should be able to select multiple).
	- Add a sort option (for sorting within the defined question set): random, easiest first (ramping up in difficult by a mixture of difficulty level and failure rate), hardest first (opposite). 
- An option for generating quiz questions should exist. This should use the Claude API. You can choose the source that new questions are added to. By default, new quiz questions should go into a Source called 'Generated'. This can be renamed in-place during creation. (For each subsequent generation, you can either choose that source or name a new one of your own).
- Add a 'generate explanation' button which is visible for each incorrect answer. (Simple system prompt needed which pipes in the question, all possible answers, which one the user selected, a request for a straightforward explanation).
	- Each time an explanation is generated, the response should be stored in the question data.

## Testing

* Create a special view where most data in the app can be inspected in a simple, easy to read form (e.g. tables).
  * When the user takes action (uploads question banks, answers questions, etc.) they should be able to inspect the database tables to see if the data has updated correctly.
* Create another special view where the theme and all components are visible on a single page all at once. (Without data and minimal/no logic). Kind of like a component library.
	* This special theme/component view is so that I can inspect how everything looks, reviewing changes as you make them to either the theme or components.
	* NB: as we design the app, the theme should be configurable so that we can make changes to styling that will apply across the board.