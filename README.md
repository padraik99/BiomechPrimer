# BiomechPrimer

A self-paced biomechanics course built as a static web app: plain HTML, CSS and JavaScript, with no build step.

## Run it

- **Hosted:** GitHub Pages. In the repo go to Settings → Pages → Source: *Deploy from a branch*, then choose branch `main` and folder `/ (root)`.
- **Locally:** double-click `index.html`. Every page works from `file://`.

## Units

| Unit | Content | Status |
|---|---|---|
| 0 | Planes, axes, joint actions: blind pretest, primer, 3D plane explorer, glass-pane drill, retries | built |
| 1 | Layered anterior/posterior muscle model, blind drag-and-place | next |
| 2 | Attachments, line of pull, primary action | planned |
| 3 | Flashcards (StudyLab export), quizzes, exams | planned |
| 4 | Part 2 (position-dependent actions) and application layer | planned |

## Learning design

- **Blind pretest:** you answer first, before studying. Answers stay hidden until the retry.
- **Confidence rating on every answer.** High-confidence errors get a callout on retry (the hypercorrection effect).
- **Spacing:** the first retry opens 2 days after the blind attempt. After that, correct answers return in 1, 3, 7 and 14 days, and misses return in 1 day.

## Progress sync

Progress is stored in `localStorage`. Use **Export** and **Import** on the Home page to sync through a file in your Google Drive folder. Import merges: the newest copy of each item wins.

## Checks

```
node tests/figure.test.js
```

This test checks two things:
- Every animated joint action moves in the anatomically correct direction.
- Each action stays inside its plane, which is the rule the glass-pane drill depends on.

## Layout

```
index.html          home: weekly sessions, due retries, export/import
units/unit0.html    Unit 0
css/style.css
js/store.js         progress, spaced-retry scheduler, export/import merge
js/figure.js        3D stick figure, planes, axes, joint actions (Pointer Events)
js/quiz.js          blind / retry / practice quiz engine
js/unit0-data.js    Unit 0 question bank
js/unit0.js         Unit 0 page controller
js/theme.js         light/dark override
tests/              Node checks (no dependencies)
```
